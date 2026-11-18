CREATE TABLE `AnalyticsEvent` (
  `id` VARCHAR(191) NOT NULL,
  `source` VARCHAR(24) NOT NULL,
  `path` VARCHAR(512) NOT NULL,
  `deviceType` VARCHAR(24) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AnalyticsEvent_source_createdAt_idx` (`source`, `createdAt`),
  INDEX `AnalyticsEvent_path_createdAt_idx` (`path`, `createdAt`),
  INDEX `AnalyticsEvent_deviceType_createdAt_idx` (`deviceType`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
