-- Keep the puzzle's one-fun-fact-per-piece contract intact: change the
-- relaxed Rwanda board from 32 to 30 pieces and remove its final two facts.
UPDATE `Puzzle`
SET
  `pieceCount` = 30,
  `metadata` = JSON_REMOVE(`metadata`, '$.funFacts[31]', '$.funFacts[30]')
WHERE `id` = 'cmwnf7qw900158z4k218i9p3t';
