-- Keep full artwork for the puzzle screen while serving small WebP previews
-- in the catalogue and management lists.
ALTER TABLE `Game` ADD COLUMN `thumbnailUrl` VARCHAR(2048) NULL;
ALTER TABLE `Puzzle` ADD COLUMN `thumbnailUrl` VARCHAR(2048) NULL;
ALTER TABLE `CountryAsset` ADD COLUMN `thumbnailUrl` VARCHAR(2048) NULL;
