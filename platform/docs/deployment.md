# Deployment and rollout

Target game subdomain: `play.igiti.africa`. DNS, TLS, hosting resources and secret values require account-owner access and are not created by a Git commit.

## Staging

1. Deploy `platform/` as the frontend root to Vercel or another static frontend host.
2. Use the root `render.yaml` on branch `feat/render-game-backend` to provision the separate Render API and PostgreSQL database. Follow [Render staging setup](./render-staging.md).
3. Set Firebase web-app configuration in the frontend host and Firebase Admin service-account JSON plus verified admin allow-list in Render's secret environment settings.
4. Confirm the API health endpoint, public game catalogue, invalid-token rejection, admin allow-list enforcement and per-player progress isolation.
5. Seed only sample content in staging and test desktop and touch devices.
6. Add the exact staging frontend origin to `WEB_ORIGIN`; do not use wildcard CORS.

## Production gate

Do not cut over `play.igiti.africa` until staging tests, accessibility review, backups, monitoring, secrets, admin authorization, Firebase authorized domains and rollback steps are confirmed. The new relational database does not automatically contain legacy Firebase game data. Keep the existing game available until a separately planned data migration and cutover have been tested.
