-- Retain uploaded originals for archival/admin use, but serve a bounded WebP
-- rendition to the interactive puzzle board so a large PNG cannot crash a phone.
ALTER TABLE `Game` ADD COLUMN `playImageUrl` VARCHAR(2048) NULL;
ALTER TABLE `Puzzle` ADD COLUMN `playImageUrl` VARCHAR(2048) NULL;
