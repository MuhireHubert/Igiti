ALTER TABLE `PlayerProfile`
  MODIFY `role` ENUM('PLAYER', 'SCHOOL', 'TEACHER', 'STUDENT', 'MODERATOR', 'CONTENT_MANAGER', 'ADMIN', 'OWNER') NOT NULL DEFAULT 'PLAYER';

CREATE TABLE `School` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `School_name_key`(`name`),
  UNIQUE INDEX `School_ownerId_key`(`ownerId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `School_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `PlayerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SchoolMembership` (
  `id` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `role` ENUM('TEACHER', 'STUDENT') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SchoolMembership_schoolId_playerId_key`(`schoolId`, `playerId`),
  INDEX `SchoolMembership_playerId_role_idx`(`playerId`, `role`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SchoolMembership_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SchoolMembership_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GameAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `gameId` VARCHAR(191) NOT NULL,
  `assignedById` VARCHAR(191) NOT NULL,
  `recipientId` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NULL,
  `dueAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `GameAssignment_gameId_recipientId_key`(`gameId`, `recipientId`),
  INDEX `GameAssignment_assignedById_createdAt_idx`(`assignedById`, `createdAt`),
  INDEX `GameAssignment_recipientId_dueAt_idx`(`recipientId`, `dueAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GameAssignment_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Game`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GameAssignment_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `PlayerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `GameAssignment_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GameAssignment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
