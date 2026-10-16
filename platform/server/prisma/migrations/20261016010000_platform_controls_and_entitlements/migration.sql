-- Server-controlled roles, payment records, and audit history. No provider
-- secret or payment credential is stored in the database.
ALTER TABLE `PlayerProfile`
  ADD COLUMN `role` ENUM('PLAYER', 'MODERATOR', 'CONTENT_MANAGER', 'ADMIN', 'OWNER') NOT NULL DEFAULT 'PLAYER',
  ADD COLUMN `isDisabled` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `PaymentOrder` (
  `id` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `provider` ENUM('PESAPAL') NOT NULL,
  `providerOrderId` VARCHAR(191) NULL,
  `amountMinor` INTEGER NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `paidAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PaymentOrder_providerOrderId_key` (`providerOrderId`),
  UNIQUE INDEX `PaymentOrder_idempotencyKey_key` (`idempotencyKey`),
  INDEX `PaymentOrder_playerId_status_createdAt_idx` (`playerId`, `status`, `createdAt`),
  INDEX `PaymentOrder_provider_status_idx` (`provider`, `status`),
  CONSTRAINT `PaymentOrder_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `PlayerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentEvent` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `providerEventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(120) NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT false,
  `payload` JSON NOT NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PaymentEvent_providerEventId_key` (`providerEventId`),
  INDEX `PaymentEvent_orderId_receivedAt_idx` (`orderId`, `receivedAt`),
  CONSTRAINT `PaymentEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PaymentOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccessEntitlement` (
  `id` VARCHAR(191) NOT NULL,
  `playerId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `resource` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AccessEntitlement_playerId_resource_key` (`playerId`, `resource`),
  INDEX `AccessEntitlement_resource_status_expiresAt_idx` (`resource`, `status`, `expiresAt`),
  CONSTRAINT `AccessEntitlement_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `PlayerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AccessEntitlement_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PaymentOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AppSetting` (
  `key` VARCHAR(120) NOT NULL,
  `value` JSON NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  `updatedBy` VARCHAR(191) NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminAudit` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(120) NOT NULL,
  `targetType` VARCHAR(80) NOT NULL,
  `targetId` VARCHAR(191) NULL,
  `details` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AdminAudit_actorId_createdAt_idx` (`actorId`, `createdAt`),
  INDEX `AdminAudit_targetType_targetId_createdAt_idx` (`targetType`, `targetId`, `createdAt`),
  CONSTRAINT `AdminAudit_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `PlayerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
