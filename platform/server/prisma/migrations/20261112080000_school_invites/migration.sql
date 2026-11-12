CREATE TABLE `SchoolInvite` (
  `id` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `firstName` VARCHAR(80) NOT NULL,
  `lastName` VARCHAR(80) NOT NULL,
  `role` ENUM('TEACHER', 'STUDENT') NOT NULL,
  `token` VARCHAR(80) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `acceptedAt` DATETIME(3) NULL,
  `acceptedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SchoolInvite_token_key`(`token`),
  UNIQUE INDEX `SchoolInvite_schoolId_email_key`(`schoolId`, `email`),
  INDEX `SchoolInvite_token_expiresAt_idx`(`token`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SchoolInvite_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
