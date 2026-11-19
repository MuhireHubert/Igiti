-- The two existing Rwanda uploads are 11,811px / ~95 MB PNG files. Keep
-- those originals in Firebase, but send browser clients the bundled 1920px
-- gameplay copies and 480px catalogue thumbnails instead.
UPDATE `Puzzle`
SET
  `thumbnailUrl` = '/images/rwanda-120-thumb.jpg',
  `playImageUrl` = '/images/rwanda-120-play.jpg'
WHERE `id` = 'cmwnf357x000j8z4ki0ofklk2';

UPDATE `Puzzle`
SET
  `thumbnailUrl` = '/images/rwanda-32-thumb.jpg',
  `playImageUrl` = '/images/rwanda-32-play.jpg'
WHERE `id` = 'cmwnf7qw900158z4k218i9p3t';
