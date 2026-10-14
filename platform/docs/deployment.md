# Deployment and rollout

Target: `play.igiti.africa`. The DNS record, hosting project, TLS certificate, secrets and production database must be configured by the account owner; none are changed by this repository commit.

## Staging sequence

1. Deploy `platform/` as the frontend root to a staging host (Vercel, Cloudflare Pages, or equivalent).
2. Deploy `platform/server/` as a separate Node.js service; configure `DATABASE_URL`, `WEB_ORIGIN`, and workload/service-account credentials in the hosting secret manager.
3. Provision a dedicated database named for Igiti Play. Do not point the API at the existing commerce schema.
4. Generate and review a migration using Prisma against a disposable development database, then apply to staging.
5. Seed sample games and puzzles through a controlled seed script or migration fixture.
6. Verify catalogue visibility, invalid-token rejection, per-player data isolation, request-size limits, responsive UI, and error handling.
7. Configure `play.igiti.africa` DNS and TLS after staging validation. Keep the current game available as a fallback during initial rollout.

## Production gate

Do not cut over the subdomain until tests, accessibility review, backups, monitoring, secrets, admin authorization, and a rollback procedure are in place. The new API currently has no admin write routes and should not be treated as a complete production service yet.
