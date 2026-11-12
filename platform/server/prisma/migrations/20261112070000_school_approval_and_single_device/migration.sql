ALTER TABLE `PlayerProfile`
  ADD COLUMN `activeDeviceId` VARCHAR(80) NULL,
  ADD COLUMN `activeAuthTime` INT NULL,
  ADD COLUMN `activeDeviceAt` DATETIME(3) NULL;

ALTER TABLE `SchoolMembership`
  ADD COLUMN `approvedAt` DATETIME(3) NULL;

-- Preserve the status quo for people already enrolled before approval was
-- introduced. New requests remain pending until their school approves them.
UPDATE `SchoolMembership` SET `approvedAt` = `createdAt` WHERE `approvedAt` IS NULL;
