CREATE TABLE `CountryAsset` (
  `id` VARCHAR(191) NOT NULL,
  `country` VARCHAR(120) NOT NULL,
  `imageUrl` VARCHAR(2048) NOT NULL,
  `caption` VARCHAR(280) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CountryAsset_country_key`(`country`),
  INDEX `CountryAsset_updatedAt_idx`(`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
