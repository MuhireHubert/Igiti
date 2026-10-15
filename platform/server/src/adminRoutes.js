import express from "express";
import admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = express.Router();
const prisma = new PrismaClient();
const adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Sign in with an administrator account to continue." });
  if (adminEmails.size === 0) return res.status(503).json({ error: "Admin access is not configured yet. Set ADMIN_EMAILS in the API service." });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = String(decoded.email || "").trim().toLowerCase();
    if (!email || decoded.email_verified !== true || !adminEmails.has(email)) {
      return res.status(403).json({ error: "This verified account is not authorised to administer Igiti Play." });
    }
    req.adminUser = { uid: decoded.uid, email };
    next();
  } catch {
    return res.status(401).json({ error: "Your session could not be verified. Please sign in again." });
  }
}
router.use(requireAdmin);

const gameSelect = {
  id: true, slug: true, title: true, description: true, category: true,
  coverImage: true, status: true, publishedAt: true, createdAt: true, updatedAt: true,
  puzzles: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, slug: true, title: true, imageUrl: true, pieceCount: true,
      difficulty: true, sortOrder: true, isActive: true, metadata: true,
      createdAt: true, updatedAt: true,
    },
  },
};

router.get("/session", (req, res) => res.json({ data: { email: req.adminUser.email, role: "admin" } }));

router.get("/overview", async (_req, res, next) => {
  try {
    const [games, publishedGames, puzzles, activePuzzles, players, savedProgress, completions] = await Promise.all([
      prisma.game.count(),
      prisma.game.count({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } } }),
      prisma.puzzle.count(),
      prisma.puzzle.count({ where: { isActive: true } }),
      prisma.playerProfile.count(),
      prisma.puzzleProgress.count(),
      prisma.puzzleProgress.count({ where: { completedAt: { not: null } } }),
    ]);
    res.json({ data: { games, publishedGames, puzzles, activePuzzles, players, savedProgress, completions } });
  } catch (error) { next(error); }
});

router.get("/games", async (_req, res, next) => {
  try {
    const games = await prisma.game.findMany({ orderBy: { updatedAt: "desc" }, select: gameSelect });
    res.json({ data: games });
  } catch (error) { next(error); }
});

const slug = z.string().trim().min(2).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");
const gameCreate = z.object({
  slug, title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(5).max(3000),
  category: z.string().trim().min(2).max(80),
  coverImage: z.string().url().max(2048),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});
const gameUpdate = gameCreate.partial();
const puzzleCreate = z.object({
  slug, title: z.string().trim().min(2).max(140),
  imageUrl: z.string().url().max(2048),
  pieceCount: z.number().int().min(2).max(1000),
  difficulty: z.enum(["RELAXED", "CURIOUS", "CHALLENGING", "EXPERT"]),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});
const puzzleUpdate = puzzleCreate.partial();

router.post("/games", async (req, res, next) => {
  const parsed = gameCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the game fields and try again.", details: parsed.error.flatten() });
  try {
    const data = parsed.data;
    const game = await prisma.game.create({ data: { ...data, publishedAt: data.status === "PUBLISHED" ? new Date() : null }, select: { id: true, slug: true, title: true, status: true, publishedAt: true } });
    res.status(201).json({ data: game });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ error: "That game slug is already in use." });
    next(error);
  }
});

router.patch("/games/:gameId", async (req, res, next) => {
  const parsed = gameUpdate.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return res.status(400).json({ error: "Provide valid game fields to update.", details: parsed.success ? undefined : parsed.error.flatten() });
  try {
    const data = parsed.data;
    if (data.status === "PUBLISHED") data.publishedAt = new Date();
    if (data.status && data.status !== "PUBLISHED") data.publishedAt = null;
    const game = await prisma.game.update({ where: { id: req.params.gameId }, data, select: { id: true, slug: true, title: true, status: true, publishedAt: true } });
    res.json({ data: game });
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Game not found." });
    if (error?.code === "P2002") return res.status(409).json({ error: "That game slug is already in use." });
    next(error);
  }
});

router.delete("/games/:gameId", async (req, res, next) => {
  try {
    await prisma.game.delete({ where: { id: req.params.gameId } });
    res.json({ data: { deleted: true } });
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Game not found." });
    next(error);
  }
});

router.post("/games/:gameId/puzzles", async (req, res, next) => {
  const parsed = puzzleCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the puzzle fields and try again.", details: parsed.error.flatten() });
  try {
    const puzzle = await prisma.puzzle.create({ data: { ...parsed.data, gameId: req.params.gameId }, select: { id: true, slug: true, title: true, pieceCount: true, isActive: true } });
    res.status(201).json({ data: puzzle });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ error: "That puzzle slug is already used in this game." });
    if (error?.code === "P2003") return res.status(404).json({ error: "Game not found." });
    next(error);
  }
});

router.patch("/puzzles/:puzzleId", async (req, res, next) => {
  const parsed = puzzleUpdate.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return res.status(400).json({ error: "Provide valid puzzle fields to update.", details: parsed.success ? undefined : parsed.error.flatten() });
  try {
    const puzzle = await prisma.puzzle.update({ where: { id: req.params.puzzleId }, data: parsed.data, select: { id: true, slug: true, title: true, pieceCount: true, isActive: true } });
    res.json({ data: puzzle });
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Puzzle not found." });
    if (error?.code === "P2002") return res.status(409).json({ error: "That puzzle slug is already used in this game." });
    next(error);
  }
});

router.delete("/puzzles/:puzzleId", async (req, res, next) => {
  try {
    await prisma.puzzle.delete({ where: { id: req.params.puzzleId } });
    res.json({ data: { deleted: true } });
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Puzzle not found." });
    next(error);
  }
});

router.get("/players", async (_req, res, next) => {
  try {
    const players = await prisma.playerProfile.findMany({
      orderBy: { updatedAt: "desc" }, take: 200,
      select: {
        id: true, displayName: true, avatarUrl: true, createdAt: true, updatedAt: true,
        _count: { select: { progress: true } },
        progress: { orderBy: { updatedAt: "desc" }, take: 5, select: { puzzleId: true, elapsedSeconds: true, completedAt: true, updatedAt: true } },
      },
    });
    res.json({ data: players });
  } catch (error) { next(error); }
});

export default router;
