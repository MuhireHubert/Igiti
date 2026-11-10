CREATE TABLE `MultiplayerMatch` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(12) NOT NULL,
  `resource` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(80) NOT NULL,
  `hostId` VARCHAR(191) NOT NULL,
  `maxPlayers` INTEGER NOT NULL DEFAULT 4,
  `startsAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MultiplayerMatch_code_key`(`code`),
  INDEX `MultiplayerMatch_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MultiplayerParticipant` (
  `id` VARCHAR(191) NOT NULL,
  `matchId` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `score` INTEGER NOT NULL DEFAULT 0,
  `correct` INTEGER NOT NULL DEFAULT 0,
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MultiplayerParticipant_matchId_playerId_key`(`matchId`, `playerId`),
  INDEX `MultiplayerParticipant_matchId_score_idx`(`matchId`, `score`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MultiplayerAnswer` (
  `id` VARCHAR(191) NOT NULL,
  `matchId` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `round` INTEGER NOT NULL,
  `isCorrect` BOOLEAN NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `MultiplayerAnswer_matchId_playerId_round_key`(`matchId`, `playerId`, `round`),
  INDEX `MultiplayerAnswer_matchId_round_idx`(`matchId`, `round`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MultiplayerMatch` ADD CONSTRAINT `MultiplayerMatch_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MultiplayerParticipant` ADD CONSTRAINT `MultiplayerParticipant_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `MultiplayerMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MultiplayerParticipant` ADD CONSTRAINT `MultiplayerParticipant_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MultiplayerAnswer` ADD CONSTRAINT `MultiplayerAnswer_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `MultiplayerMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MultiplayerAnswer` ADD CONSTRAINT `MultiplayerAnswer_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
