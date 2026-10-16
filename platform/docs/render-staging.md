# Render staging deployment

This blueprint creates a **separate staging-only** PostgreSQL database and Node API for Igiti Play. It does not touch the legacy root `index.html`, the commerce database, or production hosting.

## Resources and cost

- Render web service: `igiti-play-api-staging` (Starter plan).
- Render PostgreSQL: `igiti-play-db-staging` (Basic 256 MB plan).
- The plans are paid. Review the current price in Render before syncing the Blueprint. No resources are created by committing this file.

## Deploy

1. Open Render and choose **New → Blueprint**.
2. Connect `MuhireHubert/Igiti`, select branch `feat/render-game-backend`, and let Render read the root `render.yaml`.
3. Review resource names and current prices, then apply the Blueprint.
4. In the API service's Environment settings, set:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete Firebase Admin service-account JSON as a single-line JSON value. Generate it only for the correct Firebase project and never commit it.
   - `ADMIN_EMAILS`: comma-separated verified Firebase email addresses allowed to use the game admin API.
   - `WEB_ORIGIN`: exact origins of the deployed game frontend, comma-separated. Add the actual Vercel staging origin before testing browser requests.
5. Confirm the Render service has `DATABASE_URL` connected to the Render database through the internal connection string. Do not paste the store's database URL here.
6. Deploy the service. The start command runs `prisma migrate deploy` before starting the API. Confirm `/health` returns HTTP 200.
7. Seed initial game/puzzle catalogue records through the protected admin API after Firebase Admin and `ADMIN_EMAILS` are configured.
8. In the frontend's Vercel staging environment, set `VITE_API_BASE_URL` to the actual Render API URL and set the four public `VITE_FIREBASE_*` web-app values from Firebase Console. Redeploy the frontend.

## Firebase setup

Keep Firebase Authentication for player sign-in. In Firebase Console:
- Enable the sign-in providers the game uses (email/password is currently wired).
- Add the staging frontend hostname to Authentication → Settings → Authorized domains.
- Register a Firebase Web App and use its public API key, auth domain, project ID, and app ID in Vercel's frontend environment variables.
- Create/download a service-account key only if your organization permits it; store the JSON only in Render's secret environment variable. Never put the Admin SDK key in Vite variables or Git.
- Ensure admin users have verified email addresses and are explicitly listed in `ADMIN_EMAILS`.

## Validation gate

- `GET /health` returns HTTP 200.
- `GET /v1/games` returns JSON and no database error.
- Requests to `/v1/me/progress` without a token return 401.
- Invalid Firebase ID tokens return 401.
- Admin endpoints reject unlisted and unverified users.
- Saving progress for one player never exposes it to another.
- Database migration and seed are tested on staging before any production cutover.

## Important limitations

This setup does not import existing Firebase Realtime Database/Firestore game data. It creates the relational tables for the new platform. If the old game has saved progress in Firebase, that data needs a separately planned export, mapping, and import after the source database and data shape are inspected. The current legacy game remains available during staging.
