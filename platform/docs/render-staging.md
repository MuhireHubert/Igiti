# Render staging deployment

This blueprint creates a **separate staging-only** PostgreSQL database and Node API for Igiti Play. It does not touch the legacy root `index.html`, the commerce database, or production hosting.

## Resources and cost

- Render web service: `igiti-play-api-staging` (Free plan).
- Render PostgreSQL: `igiti-play-db-staging` (Free plan).
- These are intended for testing and may have cold starts or service interruptions. Render Free Postgres is limited to 1 GB, has no backups, and expires 30 days after creation; after the grace period, its data is deleted. Export any test data you need before expiry. See https://render.com/docs/free.
- The Blueprint is configured for free plans. Review Render's confirmation screen before applying it; do not select paid upgrades.

## Deploy

1. Open Render and choose **New → Blueprint**.
2. Connect `MuhireHubert/Igiti`, select branch `feat/render-game-backend`, and let Render read the root `render.yaml`.
3. Confirm the resources are both on the Free plan before applying the Blueprint.
4. In the API service's Environment settings, set:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete Firebase Admin service-account JSON as a single-line JSON value, only after you can access the correct Firebase project. Store it as a Render secret; never commit it or paste it into chat.
   - `ADMIN_EMAILS`: comma-separated verified Firebase email addresses allowed to use the game admin API.
   - `WEB_ORIGIN`: exact origins of the deployed game frontend, comma-separated. Add the actual staging frontend origin before testing browser requests.
5. Confirm `DATABASE_URL` is connected to the Render database through its internal connection string. Do not paste the database URL into chat.
6. Deploy the service. The start command runs Prisma migrations before starting the API. Confirm `/health` returns HTTP 200 and reports database readiness.
7. Seed initial game/puzzle catalogue records through the protected admin API after Firebase Admin and `ADMIN_EMAILS` are configured.
8. In the frontend's hosting environment, set `VITE_API_BASE_URL` to the actual Render API URL and set the public `VITE_FIREBASE_*` web-app values from Firebase Console. Redeploy the frontend.

## Firebase setup

Firebase integration being disconnected does not require a paid plan. Firebase Authentication can remain the identity provider; its Admin SDK credential must be configured separately in Render when Firebase Console access is available.

- Enable the sign-in providers the game uses (email/password is currently wired).
- Add the staging frontend hostname to Authentication → Settings → Authorized domains.
- Register a Firebase Web App and use its public API key, auth domain, project ID, and app ID in the frontend's environment variables.
- Create/download a service-account key only if permitted for the project; store the JSON only in Render's secret environment variable. Never put the Admin SDK key in frontend variables or Git.
- Ensure admin users have verified email addresses and are explicitly listed in `ADMIN_EMAILS`.

Until Firebase Admin is configured, public catalogue endpoints can be tested, but authenticated player progress and admin endpoints will not be fully usable. Do not weaken authentication or add a fake bypass to work around the connection issue.

## Validation gate

- `GET /health` returns HTTP 200 and reports database readiness.
- `GET /v1/games` returns JSON and no database error.
- Requests to `/v1/me/progress` without a token return 401.
- Invalid Firebase ID tokens return 401.
- Admin endpoints reject unlisted and unverified users.
- Saving progress for one player never exposes it to another.
- Database migration and seed are tested on staging before any production cutover.

## Important limitations

This setup does not import existing Firebase Realtime Database/Firestore game data. It creates the relational tables for the new platform. If the old game has saved progress in Firebase, that data needs a separately planned export, mapping, and import after the source database and data shape are inspected. The current legacy game remains available during staging.
