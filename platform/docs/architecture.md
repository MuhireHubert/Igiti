# Igiti Play platform architecture

## Repository responsibilities

- **Igiti**: the legacy game plus the new platform under `platform/`.
- **igiti-web**: public company site, discovery and links into the games.
- **admin-igiti**: commerce/business administration; the game admin API remains a separate, explicitly permissioned service.
- **Igiti Play API** (`platform/server`): public catalogue, Firebase ID-token verification, player profiles/progress, and protected game/puzzle administration.

## Backend and database

The legacy game is a single `index.html` application with embedded styles and JavaScript. The new game platform is being built alongside it, without replacing that file. The API uses Express, Prisma and Firebase Admin SDK. The Render staging blueprint provisions a separate PostgreSQL database because Render provides managed PostgreSQL; it is isolated from the store's MySQL database.

1. Keep Firebase Authentication as the identity layer for the first migration stage.
2. Keep game catalogue and player progress in the new game-domain database. Do not point this API at the commerce database or migrate commerce tables.
3. Public clients can read published games and active puzzles only.
4. Player progress requests must use a verified Firebase ID token; the server derives the player from the token UID and never trusts a client-supplied player ID.
5. Game/puzzle admin routes require a verified Firebase email and an explicit server-side `ADMIN_EMAILS` allow-list.
6. Reassess whether Firebase Auth and Clerk should remain separate only after confirming the account/access model across all apps.

## Domain model

- `Game`: editorial collection, publication status and category.
- `Puzzle`: playable item, source image, difficulty, piece count and engine metadata.
- `PlayerProfile`: stable link from verified Firebase UID to a game-platform profile.
- `PuzzleProgress`: saved puzzle state, elapsed time and completion timestamp.

The Prisma schema and initial PostgreSQL migration create a new game-domain database. They do not import existing Firebase Realtime Database/Firestore documents or commerce data. Any legacy progress migration requires a separate export, mapping and validation plan.

## Trust and rollout boundaries

- Firebase service-account credentials belong only in the hosting secret manager, never in frontend variables or Git.
- CORS must list exact frontend origins; use TLS, rate limits, database backups, monitoring and least-privilege access.
- Deploy and validate staging first. Keep the current game available as rollback until the new platform passes functional, security, mobile/touch and accessibility checks.
