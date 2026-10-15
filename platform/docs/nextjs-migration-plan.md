# Igiti Play: Next.js migration and rollout plan

## Decision

Move the new public Igiti Play website from the current Vite + React Router shell to **Next.js App Router**. Keep the existing production root `index.html` and current production URL untouched. Do not point `play.igiti.africa` at the new platform until staging checks pass.

This is an incremental migration, not a rewrite of the existing puzzle engine. Next.js will render public pages on the server where appropriate; the interactive puzzle experience will remain a client-side game module loaded only on game routes.

## What exists today

- `platform/` is a separate platform foundation and is deployed to a dedicated Vercel staging project.
- The frontend is Vite + React 18 + React Router; the routes are currently declared in `src/Router.jsx`.
- The landing experience is implemented in `src/App.jsx`; game library/detail/how-to-play components are in `src/pages/Pages.jsx`.
- `src/lib/api.js` is the API integration boundary and currently supports preview mode.
- `platform/server/` is a separate Express API starter with Firebase Admin dependencies and a Prisma/MySQL game-domain schema.
- The legacy puzzle experience remains in the repository root `index.html`. It must not be deleted, overwritten, or used as a source of credentials.
- `platform/vercel.json` currently rewrites every route to `index.html`, which is a Vite SPA fallback. That fallback is not the desired long-term routing architecture for Next.js.

## Target architecture

1. **Public website — Next.js App Router**
   - `/`: home/brand introduction.
   - `/games`: indexable games library; filters/search can be client components.
   - `/games/[gameId]`: stable, shareable game landing page with title, description, cover, difficulty and metadata.
   - `/how-to-play`: server-rendered instructions and accessible content.
   - Add page metadata, canonical URLs, social preview metadata, sitemap and robots policy before public launch.
   - Use Server Components by default. Add Client Components only for interaction (filters, menus, puzzle board).

2. **Puzzle runtime — isolated client module**
   - Load the puzzle engine only on an individual game route, not on the marketing/library pages.
   - Preserve existing game behavior and assets until the new engine has feature parity and regression coverage.
   - Do not embed the entire legacy root HTML inside Next.js as an iframe or silently replace production. First inventory its authentication, save/progress, image storage, puzzle assembly and admin interactions.
   - Migrate one game type at a time, with an explicit rollback path.

3. **API — separate Express service initially**
   - Keep `platform/server` independently deployable, with its own health endpoint, request validation, rate limits, security headers, logging and CORS allowlist.
   - Verify Firebase ID tokens on the server; never trust a client-supplied UID or role.
   - Keep Firebase Admin credentials and database URLs in server-only environment variables. Never use `NEXT_PUBLIC_*` for secrets.
   - Public game catalogue endpoints may be read-only; progress writes require verified identity and ownership checks. Admin operations require explicit server-side role checks.

4. **Data — isolated game database**
   - Provision a dedicated staging MySQL database; never point staging migrations at the existing store/production database.
   - Review and test Prisma migrations against an empty staging database before introducing real player data.
   - Define backup/restore and migration rollback procedures before production cutover.
   - Keep the existing commerce schema separate unless a deliberate, documented integration is approved.

5. **Admin**
   - Treat administration as a separate protected surface (for example, `/admin` or a separate admin deployment after requirements are verified).
   - Enforce authorization in the API, not only by hiding UI controls.
   - Record sensitive changes in an audit log. Do not expose destructive legacy actions without re-authentication, safeguards and tested recovery.

## Migration sequence

### Phase 0 — protect current state
- Keep the current production site and root `index.html` untouched.
- Keep all migration work on `feat/nextjs-migration-plan` until reviewed.
- Preserve a known-good Vercel staging deployment and identify its source branch/commit.

### Phase 1 — migrate the public shell
- Create a Next.js App Router app under `platform/` on the migration branch.
- Move shared visual styles and assets without changing the current brand/design unnecessarily.
- Convert home, games index, game details and how-to-play into route-level pages.
- Replace hash-only navigation with real links where appropriate.
- Remove the Vite-specific rewrite only when the Next.js build is configured and verified.
- Confirm direct navigation, refresh, unknown-route 404 behavior, responsive layout, accessibility and metadata.

### Phase 2 — API and identity
- Deploy the Express API separately to a Node-compatible service.
- Add a health endpoint and verify CORS, environment validation and structured errors.
- Configure Firebase Admin only as server-side credentials; verify tokens and roles.
- Use a dedicated staging MySQL database, run reviewed Prisma migrations, and test read/write authorization.

### Phase 3 — puzzle runtime and progress
- Inventory and test the legacy puzzle engine before moving mechanics.
- Port one representative puzzle and compare assembly, touch support, accessibility, completion, save/resume and performance.
- Keep existing gameplay accessible while each new module is validated.
- Add automated regression and end-to-end tests before moving additional puzzle types.

### Phase 4 — admin and launch readiness
- Build secured game/puzzle CRUD and audit logging.
- Test permissions with player, editor and administrator roles.
- Test backup/restore, failure states, mobile/touch behavior, keyboard navigation, slow networks and error monitoring.
- Only after approval, connect `play.igiti.africa`; document a DNS/deployment rollback to the previous experience.

## Acceptance criteria before production

- Direct URL access and browser refresh work for every public route without blanket SPA rewrites.
- Home, library, details and instructions have correct metadata and meaningful server-rendered content.
- No server secrets appear in client bundles or Git history.
- API authorization is tested for missing, invalid and cross-user tokens.
- Staging database is demonstrably separate from production/commerce data.
- Puzzle play, progress and admin operations pass regression tests.
- Existing production site remains available and rollback is documented.
- No live cutover occurs merely because the staging build succeeds.

## Current staging note

The existing staging deployment is still the Vite foundation. The route rewrite added for its SPA fallback is only a temporary compatibility fix for that deployment. The Next.js migration should replace that routing setup on this feature branch after the App Router build is ready; do not apply a partial Next.js configuration to the current deployment.
