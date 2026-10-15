# Igiti Play Platform

A modular gaming platform being developed alongside the existing production game. The repository-root `index.html` is the legacy game and must remain untouched until a replacement has passed acceptance testing.

## Local development

Requirements: Node.js 22+ and npm.

```bash
cd platform
npm install
npm run dev
```

The public web app uses Next.js App Router. Without `NEXT_PUBLIC_API_BASE_URL`, the library uses clearly marked preview catalogue data. To connect the web app to the API, set `NEXT_PUBLIC_API_BASE_URL` to the deployed API origin.

## Structure

- `app/` — Next.js App Router routes, layouts and metadata.
- `src/App.jsx` — interactive homepage and library preview.
- `src/lib/api.js` — game catalogue API boundary and local preview data.
- `src/pages/` — legacy Vite-era route components retained temporarily during migration; App Router routes now render public subpages independently.
- `server/` — separate Express API service.
- `server/prisma/schema.prisma` — proposed game-domain data model, separate from the store/commerce schema.
- `docs/nextjs-migration-plan.md` — migration architecture, rollout and acceptance criteria.

## Current scope

The Next.js foundation includes a branded home page, server-rendered games library, server-rendered game detail routes, and a server-rendered How to Play page. The API remains a separate service. Puzzle mechanics, account/progress migration, admin CRUD and production deployment are not yet complete.

## Environment variables

Web app:
- `NEXT_PUBLIC_API_BASE_URL` — optional public API origin; this value is not a secret.

API service:
- `DATABASE_URL` — dedicated game database connection string.
- Firebase Admin credentials — server-only configuration. Never commit credentials or expose them through `NEXT_PUBLIC_*` variables.
- `WEB_ORIGIN` — explicit allowlist of deployed web origins.

## Safe rollout

1. Keep the existing production root game untouched.
2. Deploy this Next.js foundation to a separate staging preview and validate direct route access, refresh, metadata, mobile layouts and error states.
3. Provision a dedicated staging game database; never run staging migrations against the store's existing schema.
4. Deploy and test the API separately, including verified Firebase ID tokens and server-side authorization.
5. Migrate puzzle mechanics incrementally, with regression tests and rollback available.
6. Connect `play.igiti.africa` only after acceptance criteria in `docs/nextjs-migration-plan.md` pass.
