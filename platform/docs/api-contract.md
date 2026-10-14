# API contract — v1

Base URL is configured with `VITE_API_BASE_URL`.

## Public

### `GET /health`

Returns `{ "status": "ok", "service": "igiti-play-api" }`.

### `GET /v1/games`

Returns only published games and active puzzles:

```json
{
  "data": [{
    "id": "game-id",
    "slug": "africa-landmarks",
    "title": "Africa: Landmarks & Wonders",
    "description": "Explore Africa's landmarks.",
    "category": "Geography",
    "coverImage": "https://example.org/cover.jpg",
    "publishedAt": "2026-10-01T00:00:00.000Z",
    "puzzles": [{
      "id": "puzzle-id",
      "slug": "60-piece",
      "title": "60 pieces",
      "imageUrl": "https://example.org/puzzle.jpg",
      "pieceCount": 60,
      "difficulty": "RELAXED"
    }]
  }]
}
```

## Authenticated player

Send `Authorization: Bearer <Firebase ID token>`. The API verifies the token server-side and uses its UID to resolve the player profile.

### `GET /v1/me/progress`

Returns the signed-in player's saved progress only.

### `PUT /v1/me/progress/:puzzleId`

Body:

```json
{
  "state": { "schemaVersion": 1, "pieces": [] },
  "elapsedSeconds": 120,
  "completed": false
}
```

The `state` structure should be formalized alongside the puzzle engine migration. Payloads are size-limited and validated; puzzle IDs must reference active puzzles in published games.

## Not in this first API slice

- Admin game/puzzle creation, editing, publishing, archival.
- Achievements, leaderboards, payments, parental controls, or cross-product account linking.
- Legacy Firebase document migration.

These need product rules, authorization design and tests before implementation.
