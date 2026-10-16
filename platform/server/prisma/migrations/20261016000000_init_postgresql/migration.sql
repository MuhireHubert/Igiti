CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "Difficulty" AS ENUM ('RELAXED', 'CURIOUS', 'CHALLENGING', 'EXPERT');

CREATE TABLE "Game" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "coverImage" VARCHAR(2048) NOT NULL,
  "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Puzzle" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "imageUrl" VARCHAR(2048) NOT NULL,
  "pieceCount" INTEGER NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerProfile" (
  "id" TEXT NOT NULL,
  "firebaseUid" TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl" VARCHAR(2048),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PuzzleProgress" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "puzzleId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "completedAt" TIMESTAMP(3),
  "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PuzzleProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
CREATE INDEX "Game_status_publishedAt_idx" ON "Game"("status", "publishedAt");
CREATE INDEX "Game_category_status_idx" ON "Game"("category", "status");
CREATE UNIQUE INDEX "Puzzle_gameId_slug_key" ON "Puzzle"("gameId", "slug");
CREATE INDEX "Puzzle_gameId_isActive_sortOrder_idx" ON "Puzzle"("gameId", "isActive", "sortOrder");
CREATE UNIQUE INDEX "PlayerProfile_firebaseUid_key" ON "PlayerProfile"("firebaseUid");
CREATE UNIQUE INDEX "PuzzleProgress_playerId_puzzleId_key" ON "PuzzleProgress"("playerId", "puzzleId");
CREATE INDEX "PuzzleProgress_playerId_updatedAt_idx" ON "PuzzleProgress"("playerId", "updatedAt");

ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PuzzleProgress" ADD CONSTRAINT "PuzzleProgress_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PuzzleProgress" ADD CONSTRAINT "PuzzleProgress_puzzleId_fkey"
  FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
