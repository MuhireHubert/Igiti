CREATE TABLE `AccessOffer` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(120) NOT NULL,
  `title` VARCHAR(140) NOT NULL,
  `description` VARCHAR(500) NULL,
  `kind` ENUM('GAME', 'ACCOUNT') NOT NULL,
  `resource` VARCHAR(191) NOT NULL,
  `amountMinor` INTEGER NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `interval` ENUM('ONE_TIME', 'MONTHLY', 'YEARLY') NOT NULL DEFAULT 'ONE_TIME',
  `isActive` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AccessOffer_key_key`(`key`),
  INDEX `AccessOffer_isActive_kind_idx`(`isActive`, `kind`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
