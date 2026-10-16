import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import prisma from "./db.js";
import { z } from "zod";
import adminRoutes from "./adminRoutes.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    // Invalid JSON should fail clearly during boot instead of silently disabling auth.
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    console.warn("Firebase Admin credentials are not configured; authenticated routes will return 503.");
  }
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "64kb" }));
app.use("/v1", rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
}));

// Render uses this endpoint to verify that the API and its database are reachable.
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: "ok",
      service: "igiti-play-api",
      database: "ok",
      firebaseAuthConfigured: admin.apps.length > 0,
    });
  } catch (error) {
    console.error("Igiti Play health check failed", error);
    return res.status(503).json({ status: "degraded", service: "igiti-play-api", database: "unavailable" });
  }
});

app.use("/v1/admin", adminRoutes);

app.get("/v1/games", async (_req, res, next) => {
  try {
    const games = await prisma.game.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true, slug: true, title: true, description: true, category: true,
        coverImage: true, publishedAt: true,
        puzzles: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, slug: true, title: true, imageUrl: true, pieceCount: true, difficulty: true },
        },
      },
    });
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json({ data: games });
  } catch (error) { next(error); }
});

const progressSchema = z.object({
  puzzleId: z.string().min(1).max(64),
  state: z.record(z.unknown()),
  elapsedSeconds: z.number().int().min(0).max(86400).optional(),
  completed: z.boolean().optional(),
});

async function requirePlayer(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Authentication required." });
  if (!admin.apps.length) return res.status(503).json({ error: "Firebase authentication is not configured on the API." });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const player = await prisma.playerProfile.upsert({
      where: { firebaseUid: decoded.uid },
      update: { displayName: decoded.name || undefined, avatarUrl: decoded.picture || undefined },
      create: { firebaseUid: decoded.uid, displayName: decoded.name || null, avatarUrl: decoded.picture || null },
    });
    if (player.isDisabled) return res.status(403).json({ error: "This player account is unavailable." });
    req.player = player;
    next();
  } catch {
    return res.status(401).json({ error: "The session could not be verified." });
  }
}

app.get("/v1/me/progress", requirePlayer, async (req, res, next) => {
  try {
    const progress = await prisma.puzzleProgress.findMany({
      where: { playerId: req.player.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, puzzleId: true, state: true, completedAt: true, elapsedSeconds: true, updatedAt: true },
    });
    res.json({ data: progress });
  } catch (error) { next(error); }
});

app.get("/v1/me/entitlements", requirePlayer, async (req, res, next) => {
  try {
    const now = new Date();
    const entitlements = await prisma.accessEntitlement.findMany({
      where: { playerId: req.player.id, status: "ACTIVE", startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { resource: true, startsAt: true, expiresAt: true, orderId: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: entitlements });
  } catch (error) { next(error); }
});

app.put("/v1/me/progress/:puzzleId", requirePlayer, async (req, res, next) => {
  try {
    const parsed = progressSchema.safeParse({ ...req.body, puzzleId: req.params.puzzleId });
    if (!parsed.success) return res.status(400).json({ error: "Invalid progress payload.", details: parsed.error.flatten() });
    const { puzzleId, state, elapsedSeconds = 0, completed = false } = parsed.data;
    const puzzle = await prisma.puzzle.findFirst({ where: { id: puzzleId, isActive: true, game: { status: "PUBLISHED" } }, select: { id: true } });
    if (!puzzle) return res.status(404).json({ error: "Puzzle not found." });
    // Completion is monotonic: later autosaves must not turn a completed
    // puzzle back into an incomplete one merely because the UI remounted.
    const progress = await prisma.puzzleProgress.upsert({
      where: { playerId_puzzleId: { playerId: req.player.id, puzzleId } },
      update: { state, elapsedSeconds, ...(completed ? { completedAt: new Date() } : {}) },
      create: { playerId: req.player.id, puzzleId, state, elapsedSeconds, completedAt: completed ? new Date() : null },
      select: { id: true, puzzleId: true, state: true, completedAt: true, elapsedSeconds: true, updatedAt: true },
    });
    res.json({ data: progress });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  if (error?.message === "Origin is not allowed by CORS.") return res.status(403).json({ error: "Origin is not allowed." });
  console.error("Igiti Play API error", error);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

const server = app.listen(port, () => console.info(`Igiti Play API listening on ${port}`));
async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
