import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import prisma from "./db.js";
import { z } from "zod";
import adminRoutes from "./adminRoutes.js";
import { createPesapalOrder, getPesapalTransaction, pesapalConfiguration } from "./pesapal.js";

const app = express();
const port = Number(process.env.PORT || 4000);
// Render terminates TLS and forwards the original address in X-Forwarded-For.
// Trust exactly the first proxy hop so rate limits remain per client.
app.set("trust proxy", 1);
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const bootstrapRoles = (() => {
  try {
    const value = JSON.parse(process.env.BOOTSTRAP_ROLE_EMAILS || "{}");
    return Object.fromEntries(Object.entries(value).map(([email, role]) => [email.trim().toLowerCase(), String(role).toUpperCase()]));
  } catch {
    console.warn("BOOTSTRAP_ROLE_EMAILS is not valid JSON; no account roles will be bootstrapped.");
    return {};
  }
})();
const allowedBootstrapRoles = new Set(["PLAYER", "SCHOOL", "TEACHER", "STUDENT"]);
function emailsFrom(value) {
  return new Set((value || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}
const managedRoleEmails = {
  PLAYER: emailsFrom(process.env.PLAYER_EMAILS),
  SCHOOL: emailsFrom(process.env.SCHOOL_EMAILS),
  TEACHER: emailsFrom(process.env.TEACHER_EMAILS),
  STUDENT: emailsFrom(process.env.STUDENT_EMAILS),
};
const ownerEmails = new Set([process.env.ADMIN_EMAILS, process.env.OWNER_EMAILS]
  .flatMap((value) => (value || "").split(","))
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean));

// These entries are deliberate account-role assignments, not client-side
// labels. Reapplying them on sign-in repairs profiles created before the role
// map was configured, while the owner controls all other accounts in Players.
function configuredRoleForEmail(email) {
  if (ownerEmails.has(email)) return "OWNER";
  for (const [role, emails] of Object.entries(managedRoleEmails)) {
    if (emails.has(email)) return role;
  }
  const configuredRole = bootstrapRoles[email];
  return allowedBootstrapRoles.has(configuredRole) ? configuredRole : null;
}

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    // Invalid JSON should fail clearly during boot instead of silently disabling auth.
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    });
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

app.get("/v1/offers", async (_req, res, next) => {
  try {
    const offers = await prisma.accessOffer.findMany({
      where: { isActive: true }, orderBy: [{ kind: "asc" }, { amountMinor: "asc" }],
      select: { key: true, title: true, description: true, kind: true, resource: true, amountMinor: true, currency: true, interval: true },
    });
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json({ data: offers });
  } catch (error) { next(error); }
});

// This is intentionally safe to expose: it contains no provider credentials,
// only whether checkout can be started and the selected non-secret environment.
app.get("/v1/checkout/status", (_req, res) => res.json({ data: pesapalConfiguration() }));

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
    const email = String(decoded.email || "").trim().toLowerCase();
    const configuredRole = configuredRoleForEmail(email);
    const player = await prisma.playerProfile.upsert({
      where: { firebaseUid: decoded.uid },
      update: {
        displayName: decoded.name || undefined,
        avatarUrl: decoded.picture || undefined,
        ...(configuredRole ? { role: configuredRole } : {}),
      },
      create: { firebaseUid: decoded.uid, displayName: decoded.name || null, avatarUrl: decoded.picture || null, role: configuredRole || "PLAYER" },
    });
    if (player.isDisabled) return res.status(403).json({ error: "This player account is unavailable." });
    req.player = { ...player, email };
    next();
  } catch {
    return res.status(401).json({ error: "The session could not be verified." });
  }
}

const checkoutSchema = z.object({ offerKey: z.string().trim().min(1).max(120) });

function expiryFor(interval, now = new Date()) {
  if (interval === "ONE_TIME") return null;
  const expiry = new Date(now);
  if (interval === "MONTHLY") expiry.setMonth(expiry.getMonth() + 1);
  if (interval === "YEARLY") expiry.setFullYear(expiry.getFullYear() + 1);
  return expiry;
}

function paymentStatusFromPesapal(transaction) {
  const status = String(transaction.payment_status_description || "").toUpperCase();
  if (status === "COMPLETED" || Number(transaction.status_code) === 1) return "PAID";
  if (status === "FAILED" || Number(transaction.status_code) === 2) return "FAILED";
  if (status === "REVERSED" || Number(transaction.status_code) === 3) return "REFUNDED";
  return "PROCESSING";
}

async function reconcilePesapalPayment({ orderTrackingId, merchantReference }) {
  const order = await prisma.paymentOrder.findFirst({
    where: { provider: "PESAPAL", OR: [{ providerOrderId: orderTrackingId }, { id: merchantReference }] },
    include: { player: { select: { id: true } } },
  });
  if (!order) return { order: null, status: "unknown" };
  const transaction = await getPesapalTransaction(orderTrackingId);
  // The provider response must map to the specific server-created order before
  // it can affect access. Browser callback query parameters are never trusted.
  if (transaction.merchant_reference !== order.id || String(transaction.currency || "").toUpperCase() !== order.currency || Math.round(Number(transaction.amount) * 100) !== order.amountMinor) {
    throw new Error("Pesapal verification did not match the expected order.");
  }
  const status = paymentStatusFromPesapal(transaction);
  const providerEventId = `${orderTrackingId}:${transaction.status_code || transaction.payment_status_description || "unknown"}`.slice(0, 191);
  await prisma.$transaction(async (tx) => {
    await tx.paymentEvent.upsert({
      where: { providerEventId },
      update: { verified: true, payload: transaction },
      create: { orderId: order.id, providerEventId, eventType: "pesapal.transaction_status", verified: true, payload: transaction },
    });
    await tx.paymentOrder.update({ where: { id: order.id }, data: { status, paidAt: status === "PAID" ? (order.paidAt || new Date()) : order.paidAt } });
    if (status === "PAID") {
      const metadata = order.metadata || {};
      const resource = String(metadata.resource || "");
      const interval = String(metadata.interval || "ONE_TIME");
      if (!resource) throw new Error("Paid order is missing its access resource.");
      await tx.accessEntitlement.upsert({
        where: { playerId_resource: { playerId: order.playerId, resource } },
        update: { status: "ACTIVE", orderId: order.id, startsAt: new Date(), expiresAt: expiryFor(interval) },
        create: { playerId: order.playerId, orderId: order.id, resource, expiresAt: expiryFor(interval) },
      });
    }
  });
  return { order, status };
}

app.post("/v1/checkout/orders", requirePlayer, async (req, res, next) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a valid offer." });
  if (!pesapalConfiguration().configured) return res.status(503).json({ error: "Pesapal checkout is not configured yet." });
  try {
    const offer = await prisma.accessOffer.findFirst({ where: { key: parsed.data.offerKey, isActive: true } });
    if (!offer) return res.status(404).json({ error: "That offer is no longer available." });
    if (offer.amountMinor < 1) return res.status(400).json({ error: "This offer does not have a payable price." });
    const order = await prisma.paymentOrder.create({
      data: {
        playerId: req.player.id, provider: "PESAPAL", amountMinor: offer.amountMinor, currency: offer.currency,
        idempotencyKey: `pesapal:${crypto.randomUUID()}`,
        metadata: { offerKey: offer.key, resource: offer.resource, interval: offer.interval, title: offer.title },
      },
    });
    try {
      const checkout = await createPesapalOrder({
        merchantReference: order.id, amountMinor: offer.amountMinor, currency: offer.currency,
        description: offer.title,
        billingAddress: { email_address: req.player.email || "", phone_number: "", country_code: "", first_name: req.player.displayName || "Igiti", middle_name: "", last_name: "Player", line_1: "", line_2: "", city: "", state: "", postal_code: "", zip_code: "" },
      });
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { providerOrderId: checkout.order_tracking_id, status: "PROCESSING" } });
      return res.status(201).json({ data: { redirectUrl: checkout.redirect_url, orderId: order.id } });
    } catch (error) {
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "FAILED", metadata: { ...(order.metadata || {}), providerError: "checkout_creation_failed" } } });
      throw error;
    }
  } catch (error) { next(error); }
});

// Pesapal sends an IPN when payment changes. We always query its API again;
// no access is granted from the IPN or browser redirect parameters themselves.
async function pesapalIpn(req, res) {
  const orderTrackingId = String(req.query.OrderTrackingId || req.body?.OrderTrackingId || "").trim();
  const merchantReference = String(req.query.OrderMerchantReference || req.body?.OrderMerchantReference || "").trim();
  if (!orderTrackingId || !merchantReference) return res.status(400).json({ status: 500, error: "Missing Pesapal order identifiers." });
  try {
    await reconcilePesapalPayment({ orderTrackingId, merchantReference });
    return res.json({ orderNotificationType: String(req.query.OrderNotificationType || req.body?.OrderNotificationType || "IPNCHANGE"), orderTrackingId, orderMerchantReference: merchantReference, status: 200 });
  } catch (error) {
    console.error("Pesapal IPN processing failed", error);
    return res.status(500).json({ orderTrackingId, orderMerchantReference: merchantReference, status: 500 });
  }
}

app.get("/v1/payments/pesapal/ipn", pesapalIpn);
app.post("/v1/payments/pesapal/ipn", pesapalIpn);
app.get("/v1/payments/pesapal/return", async (req, res) => {
  // A return route is deliberately informational. The IPN path above performs
  // the authoritative reconciliation before an entitlement is ever created.
  const orderTrackingId = String(req.query.OrderTrackingId || "").trim();
  if (orderTrackingId) {
    try { await reconcilePesapalPayment({ orderTrackingId, merchantReference: String(req.query.OrderMerchantReference || "").trim() }); } catch (error) { console.warn("Pesapal return verification pending", error.message); }
  }
  const origin = allowedOrigins[0] || "http://localhost:5173";
  return res.redirect(`${origin.replace(/\/$/, "")}/?payment=pending`);
});

const assignmentSchema = z.object({
  gameId: z.string().min(1).max(64), recipientId: z.string().min(1).max(64), schoolId: z.string().min(1).max(64).optional(),
  dueAt: z.string().datetime().optional(),
});

app.get("/v1/me/workspace", requirePlayer, async (req, res, next) => {
  try {
    const player = req.player;
    const base = { role: player.role, player: { id: player.id, displayName: player.displayName } };
    if (player.role === "SCHOOL") {
      const school = await prisma.school.findUnique({
        where: { ownerId: player.id },
        select: { id: true, name: true, memberships: { where: { role: "TEACHER" }, orderBy: { player: { displayName: "asc" } }, select: { player: { select: { id: true, displayName: true } } } } },
      });
      return res.json({ data: { ...base, workspace: "SCHOOL", school, recipients: school?.memberships.map((member) => member.player) || [] } });
    }
    if (player.role === "TEACHER") {
      const membership = await prisma.schoolMembership.findFirst({
        where: { playerId: player.id, role: "TEACHER" },
        select: { school: { select: { id: true, name: true, memberships: { where: { role: "STUDENT" }, orderBy: { player: { displayName: "asc" } }, select: { player: { select: { id: true, displayName: true } } } } } } },
      });
      return res.json({ data: { ...base, workspace: "TEACHER", school: membership?.school || null, recipients: membership?.school.memberships.map((member) => member.player) || [] } });
    }
    const assignments = await prisma.gameAssignment.findMany({
      where: { recipientId: player.id }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: { id: true, dueAt: true, createdAt: true, game: { select: { id: true, title: true, slug: true, coverImage: true } }, assignedBy: { select: { displayName: true, role: true } }, school: { select: { name: true } } },
    });
    return res.json({ data: { ...base, workspace: player.role === "STUDENT" ? "STUDENT" : "PLAYER", assignments } });
  } catch (error) { next(error); }
});

app.get("/v1/me/assignments", requirePlayer, async (req, res, next) => {
  try {
    const assignments = await prisma.gameAssignment.findMany({
      where: { recipientId: req.player.id }, orderBy: { createdAt: "desc" },
      select: { id: true, dueAt: true, createdAt: true, game: { select: { id: true, title: true, slug: true, coverImage: true } }, assignedBy: { select: { displayName: true, role: true } }, school: { select: { id: true, name: true } } },
    });
    res.json({ data: assignments });
  } catch (error) { next(error); }
});

app.post("/v1/me/assignments", requirePlayer, async (req, res, next) => {
  const parsed = assignmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Provide a game, recipient, and an optional ISO due date." });
  try {
    const { gameId, recipientId, schoolId, dueAt } = parsed.data;
    const sender = req.player;
    if (!["SCHOOL", "TEACHER", "ADMIN", "OWNER"].includes(sender.role)) return res.status(403).json({ error: "Only schools, teachers, and administrators can assign games." });
    const recipient = await prisma.playerProfile.findUnique({ where: { id: recipientId }, select: { id: true, role: true } });
    if (!recipient) return res.status(404).json({ error: "Recipient not found." });
    let resolvedSchoolId = schoolId || null;
    if (sender.role === "SCHOOL") {
      const school = await prisma.school.findUnique({ where: { ownerId: sender.id }, select: { id: true } });
      if (!school || recipient.role !== "TEACHER") return res.status(403).json({ error: "A school may assign games only to its teachers." });
      const membership = await prisma.schoolMembership.findUnique({ where: { schoolId_playerId: { schoolId: school.id, playerId: recipientId } } });
      if (!membership || membership.role !== "TEACHER") return res.status(403).json({ error: "That teacher is not a member of your school." });
      resolvedSchoolId = school.id;
    }
    if (sender.role === "TEACHER") {
      const membership = await prisma.schoolMembership.findFirst({ where: { playerId: sender.id, role: "TEACHER" }, select: { schoolId: true } });
      const student = membership && await prisma.schoolMembership.findUnique({ where: { schoolId_playerId: { schoolId: membership.schoolId, playerId: recipientId } } });
      if (!membership || recipient.role !== "STUDENT" || student?.role !== "STUDENT") return res.status(403).json({ error: "A teacher may assign games only to students in their school." });
      resolvedSchoolId = membership.schoolId;
    }
    const assignment = await prisma.gameAssignment.upsert({
      where: { gameId_recipientId: { gameId, recipientId } },
      update: { assignedById: sender.id, schoolId: resolvedSchoolId, dueAt: dueAt ? new Date(dueAt) : null },
      create: { gameId, recipientId, assignedById: sender.id, schoolId: resolvedSchoolId, dueAt: dueAt ? new Date(dueAt) : null },
      select: { id: true, gameId: true, recipientId: true, dueAt: true, schoolId: true },
    });
    res.status(201).json({ data: assignment });
  } catch (error) { next(error); }
});

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
