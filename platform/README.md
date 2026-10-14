# Igiti Play Platform

A new, modular gaming experience being developed alongside the existing production game. The current root `index.html` remains untouched while this platform is built and reviewed on a feature branch.

## Local development

Requirements: Node.js 22+ and npm.

```bash
cd platform
npm install
npm run dev
```

The web client runs on Vite. It works in preview mode without a backend; configure `VITE_API_BASE_URL` to connect it to the API.

## Structure

- `src/` — player-facing React application and reusable UI.
- `server/` — separate Express API service.
- `server/prisma/schema.prisma` — proposed game-domain data model. It is intentionally separate from the commerce database schema.
- `docs/` — architecture, API contract, rollout and deployment notes.

## Current scope

This is the first vertical slice: a responsive welcome/library experience, accessible game cards, difficulty/category filtering, and a backend integration boundary. The existing puzzle engine is not removed or replaced in this step. Puzzle mechanics, account migration, persistent progress, admin CRUD, and production deployment are follow-up stages.

## Configuration

Client: copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` when an API is available.

API: see `server/.env.example`. The API requires a dedicated database URL and Firebase Admin service-account configuration. Never commit credentials.

## Safe rollout

1. Keep the existing root game available.
2. Deploy this platform to a staging URL and validate it on desktop and touch devices.
3. Provision a separate game-domain database; do not run migrations against the store's existing schema.
4. Connect identity through verified Firebase ID tokens initially, then evaluate whether a single identity provider should serve all Igiti properties.
5. Integrate admin management through authenticated API routes and role checks.
6. Cut over `play.igiti.africa` only after smoke tests, accessibility checks, and a rollback plan are complete.
