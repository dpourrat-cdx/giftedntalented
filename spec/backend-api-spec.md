# Backend API Spec

> **Note:** This spec predates the March 26, 2026 score-attempt rollout. It does not yet document the attempt-based API (`POST /attempts`, `POST /attempts/:id/answers`, `POST /attempts/:id/finalize`), the `score_attempts` and `score_attempt_events` tables, or backend-owned question selection. A full rewrite is tracked as Priority 2 in `next-implementation-todo.md`. Until then, treat the Endpoints and Database Model sections as partially outdated and refer to `captain-nova-current-product-spec.md` for the live API surface.

## Overview

This document captures the backend architecture that powers the Captain Nova score and reset flows.

The backend is deployed on Render at:

- `https://giftedntalented.onrender.com`

The web frontend on GitHub Pages now calls this backend for score reads, score saves, and score reset behavior.

## Goal

- Remove browser-held trust for score storage and reset actions.
- Make cross-browser and cross-device explorer records consistent.
- Keep the frontend static and GitHub Pages-friendly.
- Support the current web app and a future Android client from the same API surface.
- Prepare the platform for Firebase Cloud Messaging support without exposing server credentials to the client.

## Technology Choices

- Runtime: Node.js 22
- Framework: Express 5
- Language: TypeScript
- Validation: Zod
- Logging: Pino
- Security middleware: Helmet, CORS, rate limiting
- Database access: Supabase using the service-role key on the server only
- Push notifications: Firebase Admin SDK scaffolding for FCM
- Deployment target: Render web service

## Current Deployment

- Render service URL: `https://giftedntalented.onrender.com`
- Health endpoint: `/api/v1/health`
- Browser origin currently allowed:
  - `https://dpourrat-cdx.github.io`
- Expected live frontend page:
  - `https://dpourrat-cdx.github.io/giftedntalented/`

## Current Responsibilities

The backend currently owns:

- health reporting
- reading one player's best saved record
- saving one player's best record
- verifying the reset PIN server-side
- clearing saved records after successful reset authorization
- future-ready device registration endpoints
- future-ready admin push-send endpoints

The frontend no longer needs to:

- hold a reset PIN
- embed a Supabase publishable key for score actions
- talk directly to Supabase for scores
- decide whether a reset request is authorized

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

### Good Changes Already Landed

- Reset authorization moved off the frontend.
- The live frontend no longer embeds the old reset PIN.
- The live frontend no longer embeds the Supabase publishable key for score actions.
- Supabase service-role access is held only by the backend.
- CORS is restricted to the GitHub Pages origin.
- Request payloads are validated server-side.
- Rate limiting is applied to public and admin-sensitive routes.
- Earlier exposed values were rotated after the backend rollout, including:
  - the old frontend-used Supabase publishable key
  - the old reset PIN value
  - the Render admin API key used by backend admin routes

### Remaining Risks

- The backend now owns question selection and answer validation through the attempt flow, removing the browser-trusted score vector for the web quiz.
- The frontend question bank bundle still ships to the browser (used for UI rendering), but answer correctness is validated server-side.
- Explorer names remain guessable identifiers.
- Old credentials and reset values may still exist in git history from earlier versions.

## CORS Policy

Allowed browser origin:

- `https://dpourrat-cdx.github.io`

The backend may also allow local development origins by environment variable override.

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

#### `POST /api/v1/players/:playerName/record` — **DISABLED**

This endpoint now returns `410 LEGACY_SCORE_ENDPOINT_DISABLED`. Score writes must go through the attempt flow: `POST /api/v1/attempts` → `POST /api/v1/attempts/:attemptId/answers` → `POST /api/v1/attempts/:attemptId/finalize`.

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

### Existing Tables Reused

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
- story-only mode does not create a score record

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

Render service requirements:

- root directory: `backend`
- build command: `npm install && npm run build`
- start command: `npm run start`
- health check path: `/api/v1/health`

Current live service:

- branch currently targeted in Render should be `master` after branch cleanup
- service URL: `https://giftedntalented.onrender.com`

## Project Layout

Current backend structure:

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

## Repository Layout

Current target layout:

- `master`
  - static web app
  - live GitHub Pages frontend
  - backend source under `backend/`
  - Render deployment source

Obsolete feature branches can be deleted after Render is confirmed to point at `master`.

## Future Client Support

The backend is designed so both the web client and Android client can use the same score API and the same device registration API.

Android-specific support is added through:

- FCM token registration
- admin-triggered push send endpoints

The backend intentionally avoids Android-only assumptions in the core score API so the same endpoints remain usable by both clients.

## Acceptance Criteria For Current Backend State

- Render health checks pass.
- The backend starts with valid environment variables and fails fast when required secrets are missing.
- The frontend can read explorer records from the backend.
- The frontend can save best-score records through the backend.
- Reset requests require backend PIN verification.
- Cross-browser explorer records are consistent when the backend is reachable.
- Device-only fallback is clearly labeled when the backend cannot be reached.
