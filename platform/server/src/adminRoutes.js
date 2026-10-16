import express from "express";
import admin from "firebase-admin";
import prisma from "./db.js";
import { z } from "zod";

const router = express.Router();
const adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
const roleRank = { PLAYER: 0, MODERATOR: 1, CONTENT_MANAGER: 2, ADMIN: 3, OWNER: 4 };

function requireRole(minimumRole) {
  return (req, res, next) => {
    if ((roleRank[req.adminUser.role] ?? -1) < roleRank[minimumRole]) {
      return res.status(403).json({ error: "Your role does not have permission for this action." });
    }
    return next();
  };
}

async function recordAudit(actorId, action, targetType, targetId, details) {
  await prisma.adminAudit.create({ data: { actorId, action, targetType, targetId, details } });
}

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Sign in with an administrator account to continue." });
  if (!admin.apps.length) return res.status(503).json({ error: "Firebase authentication is not configured on the API." });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = String(decoded.email || "").trim().toLowerCase();
    if (!email || decoded.email_verified !== true) {
      return res.status(403).json({ error: "This verified account is not authorised to administer Igiti Play." });
    }
    // ADMIN_EMAILS only establishes the very first owner profile. Subsequent
    // access is controlled by the database role, which an OWNER can change.
    const bootstrapOwner = adminEmails.has(email);
    const profile = await prisma.playerProfile.upsert({
      where: { firebaseUid: decoded.uid },
      update: { displayName: decoded.name || undefined, avatarUrl: decoded.picture || undefined },
      create: {
        firebaseUid: decoded.uid,
        displayName: decoded.name || null,
        avatarUrl: decoded.picture || null,
        role: bootstrapOwner ? "OWNER" : "PLAYER",
      },
    });
    if (profile.isDisabled || (roleRank[profile.role] ?? 0) < roleRank.CONTENT_MANAGER) {
      return res.status(403).json({ error: "This verified account is not authorised to administer Igiti Play." });
    }
    req.adminUser = { id: profile.id, uid: decoded.uid, email, role: profile.role };
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

router.get("/session", (req, res) => res.json({ data: { email: req.adminUser.email, role: req.adminUser.role } }));

router.get("/overview", async (_req, res, next) => {
  try {
    const [games, publishedGames, puzzles, activePuzzles, players, savedProgress, completions, paidOrders, activeEntitlements] = await Promise.all([
      prisma.game.count(),
      prisma.game.count({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } } }),
      prisma.puzzle.count(),
      prisma.puzzle.count({ where: { isActive: true } }),
      prisma.playerProfile.count(),
      prisma.puzzleProgress.count(),
      prisma.puzzleProgress.count({ where: { completedAt: { not: null } } }),
      prisma.paymentOrder.count({ where: { status: "PAID" } }),
      prisma.accessEntitlement.count({ where: { status: "ACTIVE" } }),
    ]);
    res.json({ data: { games, publishedGames, puzzles, activePuzzles, players, savedProgress, completions, paidOrders, activeEntitlements } });
  } catch (error) { next(error); }
});

router.get("/settings", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const settings = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
    res.json({ data: settings });
  } catch (error) { next(error); }
});

const settingUpdate = z.object({ value: z.record(z.unknown()) });
router.put("/settings/:key", requireRole("OWNER"), async (req, res, next) => {
  const key = String(req.params.key || "").trim();
  const parsed = settingUpdate.safeParse(req.body);
  if (!/^[a-z][a-z0-9_.-]{1,118}$/.test(key) || !parsed.success) {
    return res.status(400).json({ error: "Provide a valid setting key and object value." });
  }
  try {
    const setting = await prisma.appSetting.upsert({
      where: { key }, update: { value: parsed.data.value, updatedBy: req.adminUser.id },
      create: { key, value: parsed.data.value, updatedBy: req.adminUser.id },
    });
    await recordAudit(req.adminUser.id, "setting.updated", "AppSetting", key, { key });
    res.json({ data: setting });
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
        id: true, displayName: true, avatarUrl: true, role: true, isDisabled: true, createdAt: true, updatedAt: true,
        _count: { select: { progress: true } },
        progress: { orderBy: { updatedAt: "desc" }, take: 5, select: { puzzleId: true, elapsedSeconds: true, completedAt: true, updatedAt: true } },
      },
    });
    res.json({ data: players });
  } catch (error) { next(error); }
});

const roleUpdate = z.object({ role: z.enum(["PLAYER", "MODERATOR", "CONTENT_MANAGER", "ADMIN", "OWNER"]) });
router.patch("/players/:playerId/role", requireRole("OWNER"), async (req, res, next) => {
  const parsed = roleUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Provide a valid platform role." });
  if (req.params.playerId === req.adminUser.id && parsed.data.role !== "OWNER") {
    return res.status(400).json({ error: "An owner cannot remove their own owner access." });
  }
  try {
    const player = await prisma.playerProfile.update({
      where: { id: req.params.playerId }, data: { role: parsed.data.role },
      select: { id: true, displayName: true, role: true, isDisabled: true },
    });
    await recordAudit(req.adminUser.id, "player.role_updated", "PlayerProfile", player.id, { role: player.role });
    res.json({ data: player });
  } catch (error) {
    if (error?.code === "P2025") return res.status(404).json({ error: "Player not found." });
    next(error);
  }
});

router.get("/audit", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const events = await prisma.adminAudit.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      select: { id: true, action: true, targetType: true, targetId: true, details: true, createdAt: true, actor: { select: { displayName: true, role: true } } },
    });
    res.json({ data: events });
  } catch (error) { next(error); }
});

export default router;
