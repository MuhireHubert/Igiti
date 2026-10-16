# Render staging deployment

This Blueprint deploys the Igiti Play API on Render's **Free web-service plan** and reuses the existing `igiti-play-mysql-staging` MySQL 8.0.24 service and `igiti_play_staging` database. It must not create a second database or change the database engine. The legacy game and commerce database remain untouched.

## Render setup

1. Open Render and use the Blueprint for branch `feat/render-game-backend`.
2. Confirm the API web service is on the **Free** plan. Do not upgrade it during setup.
3. In the API service's Environment settings, set `DATABASE_URL` to the **existing MySQL service's internal connection URL** for `igiti_play_staging`. Use the value shown in Render; do not paste it into chat or commit it to Git.
4. Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the Firebase Admin service-account JSON as a secret only when the correct Firebase project is accessible. Never commit it or paste it into chat.
5. Set `ADMIN_EMAILS` to comma-separated, verified Firebase email addresses permitted to use the admin API.
6. Set `WEB_ORIGIN` to the exact frontend origins, comma-separated.
7. Deploy and confirm `/health` returns HTTP 200 and reports database readiness. The start command runs Prisma migrations before starting the API.

**Free-plan compatibility check:** the API must be able to reach the existing MySQL service over Render's network. If Render blocks private networking between the chosen service plans, stop and report the limitation rather than creating a paid resource or exposing MySQL publicly. Do not change or delete the existing database to work around this.

## Firebase setup

Firebase integration being disconnected does not require a paid plan. Firebase Authentication can remain the identity provider; its Admin SDK credential is configured separately in Render when Firebase Console access is available.

- Enable the sign-in providers the game uses (email/password is currently wired).
- Add the staging frontend hostname to Authentication → Settings → Authorized domains.
- Register a Firebase Web App and use its public API key, auth domain, project ID, and app ID in frontend environment variables.
- Store the Admin SDK service-account JSON only in Render's secret environment variable. Never put it in frontend variables or Git.
- Ensure admin users have verified email addresses and are explicitly listed in `ADMIN_EMAILS`.

Until Firebase Admin is configured, public catalogue endpoints can be tested, but authenticated player progress and admin endpoints will not be fully usable. Do not weaken authentication or add a fake bypass.

## Validation gate

- `GET /health` returns HTTP 200 and confirms the database connection.
- `GET /v1/games` returns JSON without a database error.
- Requests to `/v1/me/progress` without a token return 401.
- Invalid Firebase ID tokens return 401.
- Admin endpoints reject unlisted and unverified users.
- A player's saved progress is never exposed to another player.

## Existing data

This Blueprint does not import legacy Firebase Realtime Database/Firestore data. If the old game has saved progress in Firebase, plan a separate export and import after inspecting the actual source data. The current legacy game remains available during staging.
