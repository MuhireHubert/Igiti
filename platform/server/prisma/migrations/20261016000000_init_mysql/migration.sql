CREATE TABLE `Game` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `coverImage` VARCHAR(2048) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Game_slug_key` (`slug`),
  INDEX `Game_status_publishedAt_idx` (`status`, `publishedAt`),
  INDEX `Game_category_status_idx` (`category`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Puzzle` (
  `id` VARCHAR(191) NOT NULL,
  `gameId` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `imageUrl` VARCHAR(2048) NOT NULL,
  `pieceCount` INTEGER NOT NULL,
  `difficulty` ENUM('RELAXED', 'CURIOUS', 'CHALLENGING', 'EXPERT') NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT false,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Puzzle_gameId_slug_key` (`gameId`, `slug`),
  INDEX `Puzzle_gameId_isActive_sortOrder_idx` (`gameId`, `isActive`, `sortOrder`),
  CONSTRAINT `Puzzle_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PlayerProfile` (
  `id` VARCHAR(191) NOT NULL,
  `firebaseUid` VARCHAR(191) NOT NULL,
  `displayName` VARCHAR(191) NULL,
  `avatarUrl` VARCHAR(2048) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PlayerProfile_firebaseUid_key` (`firebaseUid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PuzzleProgress` (
  `id` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `puzzleId` VARCHAR(191) NOT NULL,
  `state` JSON NOT NULL,
  `completedAt` DATETIME(3) NULL,
  `elapsedSeconds` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PuzzleProgress_playerId_puzzleId_key` (`playerId`, `puzzleId`),
  INDEX `PuzzleProgress_playerId_updatedAt_idx` (`playerId`, `updatedAt`),
  CONSTRAINT `PuzzleProgress_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PuzzleProgress_puzzleId_fkey` FOREIGN KEY (`puzzleId`) REFERENCES `Puzzle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
