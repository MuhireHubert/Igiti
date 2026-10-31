CREATE TABLE `ResourceAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `resource` VARCHAR(191) NOT NULL,
  `assignedById` VARCHAR(191) NOT NULL,
  `recipientId` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NULL,
  `dueAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ResourceAssignment_resource_recipientId_key`(`resource`, `recipientId`),
  INDEX `ResourceAssignment_assignedById_createdAt_idx`(`assignedById`, `createdAt`),
  INDEX `ResourceAssignment_recipientId_dueAt_idx`(`recipientId`, `dueAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ResourceAssignment_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `PlayerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ResourceAssignment_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ResourceAssignment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
