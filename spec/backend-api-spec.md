# Backend API Spec

## Goal

Create a brand-new backend for the existing Captain Nova web app without changing the current frontend files.

This backend is intended to support:

- the current web app hosted on GitHub Pages
- a future Android client
- Supabase-backed score storage
- Android push notifications through Firebase Cloud Messaging (FCM)

## Technology Choices

- Runtime: Node.js 22
- Framework: Express 5
- Language: TypeScript
- Validation: Zod
- Logging: Pino
- Security middleware: Helmet, CORS, rate limiting
- Database access: Supabase using the service-role key on the server only
- Push notifications: Firebase Admin SDK for FCM
- Deployment target: Render web service

## Security Choices

### Client Security Model

Because the web client is a public GitHub Pages app, no browser-held secret is treated as trusted.

Public client endpoints are allowed for:

- reading one player's best score
- submitting a player's score
- registering and unregistering device tokens

These public endpoints are protected with:

- strict input validation
- per-route rate limiting
- normalized player names
- server-side score comparison logic
- CORS restricted to the GitHub Pages origin

Protected admin endpoints are required for:

- sending push notifications

Admin routes use:

- `X-Admin-Key`
- server-side environment variable validation
- tighter rate limiting

The score reset route is designed for parent use and keeps the PIN server-side:

- the client sends the parent-entered reset PIN to the backend
- the backend verifies the stored hash in Supabase
- the PIN is never embedded in frontend code

## CORS Policy

Allowed browser origin:

- `https://dpourrat-cdx.github.io`

Expected frontend page:

- `https://dpourrat-cdx.github.io/giftedntalented/`

The backend will also allow local development origins by environment variable override.

## API Versioning

All endpoints are versioned under:

- `/api/v1`

## Endpoints

### Public Endpoints

#### `GET /api/v1/health`

Purpose:

- health check for Render and monitoring

Response:

- service status
- environment name
- timestamp
- whether Supabase is reachable
- whether FCM is configured

#### `GET /api/v1/players/:playerName/record`

Purpose:

- fetch the best saved score for one player

Path params:

- `playerName`

Response:

- `playerName`
- `score`
- `percentage`
- `totalQuestions`
- `elapsedSeconds`
- `completedAt`
- `source`

Behavior:

- returns `404` if no record exists
- uses normalized player names

#### `POST /api/v1/players/:playerName/record`

Purpose:

- save a score attempt and keep only the best record for that player

Path params:

- `playerName`

Body:

- `score`
- `percentage`
- `totalQuestions`
- `elapsedSeconds`
- `clientType` with values `web` or `android`
- `mode` with values `quiz` or `story`

Behavior:

- validates all numeric ranges
- rejects invalid totals
- updates the saved record only when the new result is better
- tie-breaker prefers the faster elapsed time

Response:

- the stored best record after comparison

#### `POST /api/v1/devices/register`

Purpose:

- register a device token for future push notifications

Body:

- `deviceToken`
- `platform` with values `android` or `web`
- `playerName` optional
- `clientType` with values `web` or `android`
- `appVersion` optional

Behavior:

- upserts the token
- marks the token active
- updates last-seen metadata

Response:

- success result and normalized token record metadata

#### `POST /api/v1/devices/unregister`

Purpose:

- deactivate a device token without deleting historical metadata

Body:

- `deviceToken`

Response:

- success result

### Parent/Admin Endpoints

#### `POST /api/v1/admin/scores/reset`

Purpose:

- clear saved score records after verifying the parent PIN

Body:

- `resetPin`

Behavior:

- server verifies the PIN against the stored Supabase hash
- route is heavily rate-limited
- no reset logic is exposed in the browser

Response:

- number of deleted rows
- reset timestamp

#### `POST /api/v1/admin/push/send`

Purpose:

- send Android push notifications through FCM

Headers:

- `X-Admin-Key`

Body:

- `target`
- `notification`
- `data` optional

Supported targets:

- single token
- all active tokens for one player
- all active Android tokens

Response:

- send summary
- number attempted
- number succeeded
- number failed

## Database Model

### Existing Table Reused

- `public.test_scores`
- `public.app_admin_settings`

### New Table Added

`public.notification_devices`

Columns:

- `id`
- `device_token`
- `platform`
- `client_type`
- `player_name`
- `app_version`
- `is_active`
- `created_at`
- `updated_at`
- `last_seen_at`

Constraints:

- unique token
- optional normalized player name length limit
- platform restricted to `android` or `web`
- client type restricted to `android` or `web`

## Score Persistence Rules

- one best row per player name
- score wins first
- percentage breaks ties
- faster elapsed time breaks equal-score ties
- story-only mode should not create a score record

## Rate Limiting

Default choices:

- public read endpoints: moderate limit
- public write endpoints: stricter limit
- reset endpoint: very strict
- push-send endpoint: strict admin limit

Implementation uses IP-based rate limiting with environment-variable tuning.

## Error Handling

Every error response returns structured JSON:

- `error`
- `message`
- `requestId`

Validation errors also include:

- `details`

No stack traces are returned in production.

## Environment Variables

Required:

- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`
- `ADMIN_API_KEY`

Optional FCM:

- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`

Optional app tuning:

- `LOG_LEVEL`
- `READ_RATE_LIMIT_WINDOW_MS`
- `READ_RATE_LIMIT_MAX`
- `WRITE_RATE_LIMIT_WINDOW_MS`
- `WRITE_RATE_LIMIT_MAX`
- `RESET_RATE_LIMIT_WINDOW_MS`
- `RESET_RATE_LIMIT_MAX`
- `ADMIN_RATE_LIMIT_WINDOW_MS`
- `ADMIN_RATE_LIMIT_MAX`

## Render Deployment

Render service assumptions:

- root directory: `backend`
- build command: `npm install && npm run build`
- start command: `npm run start`

Health check path:

- `/api/v1/health`

## Project Layout

Planned backend structure:

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/README.md`
- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/config/*`
- `backend/src/routes/*`
- `backend/src/middleware/*`
- `backend/src/services/*`
- `backend/src/lib/*`
- `backend/src/validators/*`
- `backend/supabase/backend_schema.sql`

## Future Client Support

The initial backend is designed so both the web client and Android client can use the same score API and the same device registration API.

Android-specific support is added through:

- FCM token registration
- admin-triggered push send endpoints

The backend intentionally avoids Android-only assumptions in the core score API so the same endpoints remain usable by both clients.
