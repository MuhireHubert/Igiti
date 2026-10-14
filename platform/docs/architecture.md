# Igiti Play platform architecture

## Repository responsibilities

- **Igiti**: the player experience and game runtime.
- **igiti-web**: public company site, discovery, and links into the games.
- **admin-igiti**: store and business administration today; game-content administration should be added as a separately permissioned module.
- **Igiti Play API** (`platform/server`): public catalogue, player identity verification, and player progress. Future admin-only routes belong here or in a clearly versioned service, with authorization enforced on the server.

## Backend assessment

The game repository is currently a single `index.html` application with embedded styles and JavaScript. The public website is a React/Vite application. The admin is a Next.js application using Prisma with a MySQL datasource and Clerk. The game contains Firebase-dependent behaviour, so Firebase should not be removed in a big-bang rewrite.

Recommended path:

1. Keep Firebase Authentication as the identity-verification layer during the first migration stage.
2. Introduce the versioned API and a dedicated game-domain MySQL database. MySQL aligns with the admin's current Prisma stack, but the game database must be separately provisioned and separately migrated.
3. Keep store products, orders, and customer data in the existing commerce schema. Do not rename, rewrite, or migrate those tables as part of the game rollout.
4. Move public game catalogue and player progress behind the API in small steps. Do not persist raw secrets or trust role claims supplied by the browser.
5. Add admin write routes only after defining roles, audit history, and server-side authorization. The initial API intentionally has no content-management mutation endpoints.
6. Reassess whether Firebase Auth and Clerk should remain separate after confirming the current account and access model across the three apps.

## Domain model

- `Game`: editorial collection, publication status, category.
- `Puzzle`: playable item, source image, difficulty, piece count and engine metadata.
- `PlayerProfile`: stable link from verified Firebase UID to game-platform profile.
- `PuzzleProgress`: saved puzzle state, elapsed time and completion timestamp.

The schema is a proposed new game-domain schema. It does not migrate existing Firebase documents or commerce data. Apply Prisma migrations only to a newly provisioned non-production game database first, review the SQL, seed test records, and validate rollback/recovery before production.

## Trust boundaries

- Public clients may read only published games and active puzzles.
- Player progress routes require a verified Firebase ID token and derive the player identity from that token; a client-supplied player ID is never accepted.
- Admin catalogue writes must require a separate server-side role/permission check, audit record, and input validation before release.
- Configure strict CORS, TLS, rate limiting at the hosting edge, database backups, monitoring, and secret storage in production.
