# Backend API Spec

This document describes the live backend contract for the Captain Nova score, attempt, reset, and device flows.

Base URL:

- `https://giftedntalented.onrender.com/api/v1`

Primary frontend:

- `https://dpourrat-cdx.github.io/giftedntalented/`

## Overview

The backend is the source of truth for:

- score-attempt creation
- backend-owned question selection for web quiz attempts
- answer validation
- authoritative score persistence
- explorer record lookup
- parent reset authorization
- device registration
- admin-triggered push delivery

The browser is not trusted for answer correctness, reset authorization, or direct database access.

## Runtime And Stack

- Runtime: Node.js 22
- Framework: Express 5
- Language: TypeScript
- Validation: Zod
- Logging: Pino
- Security middleware: Helmet, CORS, rate limiting
- Database access: Supabase with backend-held service role credentials
- Push notifications: Firebase Admin SDK
- Deployment target: Render

## Security Model

### Browser Trust

The public web app is hosted on GitHub Pages, so the backend treats the browser as untrusted.

The current repo decision is to keep the frontend on GitHub Pages for now and explicitly accept the remaining response-header limits there until we move to a header-capable host or proxy.

As a defense-in-depth measure only, the frontend now includes a lightweight browser-side frame-busting fallback. It is not a security boundary and does not replace real response-header enforcement.

The backend therefore owns:

- attempt question selection for live web quiz runs
- answer correctness checks
- score comparison and best-record persistence
- reset PIN verification

### Database Access

The backend uses the Supabase service role key from the server only.

Current schema hardening in `backend/supabase/backend_schema.sql` includes:

- explicit function execute grants/revokes for current `SECURITY DEFINER` functions
- RLS enabled on backend-owned tables
- service-role-only policies for backend table access

### Admin Surface

`POST /admin/push/send` requires `X-Admin-Key`.

`POST /admin/scores/reset` currently remains parent-accessible by reset PIN rather than `X-Admin-Key`. That is the current repo decision and the browser-facing reset flow.

## CORS

Expected production browser origin:

- `https://dpourrat-cdx.github.io`

Development origins may be added through environment configuration.

## Common Response Shape

Successful JSON responses usually include:

- endpoint-specific payload fields
- `requestId`

Error responses return:

- `error`
- `message`
- `requestId`

Validation failures may also include:

- `details`

## Endpoints

### `GET /health`

Purpose:

- health check for Render and operational smoke tests

Response:

- `status`: `ok` or `degraded`
- `environment`
- `checkedAt`
- `services.supabase`: `ok` or `down`
- `services.fcm`: `configured` or `not_configured`

Notes:

- health uses a lightweight Supabase read against `test_scores`

### `GET /players/:playerName/record`

Purpose:

- fetch the current best saved record for one explorer

Validation:

- `playerName` is normalized server-side
- valid length is `1..40`

Success response:

- `playerName`
- `score`
- `percentage`
- `totalQuestions`
- `elapsedSeconds`
- `completedAt`
- `source` with current value `supabase`
- `requestId`

Not found:

- `404 PLAYER_RECORD_NOT_FOUND`

### `POST /players/:playerName/record`

Purpose:

- legacy direct score-write route

Current behavior:

- always disabled
- always returns `410 LEGACY_SCORE_ENDPOINT_DISABLED`

Replacement flow:

1. `POST /attempts`
2. `POST /attempts/:attemptId/answers`
3. `POST /attempts/:attemptId/finalize`

### `POST /attempts`

Purpose:

- start a score attempt

Request body:

- `playerName`: normalized, `1..40`
- `clientType`: `web` or `android`
- `mode`: `quiz` or `story`
- `questions`: optional transitional field for caller-supplied question shape

Live behavior:

- `story` mode returns a story-only response and does not create a score attempt row
- `quiz` mode creates a persisted attempt
- web quiz attempts can be backend-selected and backend-randomized
- attempt rows are stored in `score_attempts`
- attempt start audit events are stored in `score_attempt_events`

Quiz success response:

- `storyOnly: false`
- `attemptId`
- `totalQuestions`
- `questions`
- `requestId`

Each question includes:

- `questionId`
- `bankId`
- `section`
- `prompt`
- `options`
- `stimulus` optional

Status code:

- `201 Created` for persisted quiz attempts

Story-only response:

- `storyOnly: true`
- `attemptId: null`
- `totalQuestions: 0`
- `questions: []`
- `requestId`

Status code:

- `200 OK` for story-only mode

Possible failures:

- `400 ATTEMPT_SHAPE_INVALID`
- `500 QUESTION_BANK_INVALID`
- `502 ATTEMPT_CREATE_FAILED`

### `POST /attempts/:attemptId/answers`

Purpose:

- submit one validated answer for an existing attempt

Request params:

- `attemptId`: UUID

Request body:

- `questionId`
- `bankId`
- `selectedAnswer`: integer `0..3`
- `elapsedSeconds` optional, nullable, integer `>= 0`

Success response:

- `accepted: true`
- `correctAnswer`
- `isCorrect`
- `progress`
- `record`
- `requestId`

`progress` includes:

- `answeredCount`
- `correctCount`
- `totalQuestions`
- `percentage`

`record` is a preview only:

- it is present only when the explorer has at least one correct answer so far
- it is not the final authoritative saved record

Status code:

- `201 Created`

Important behavior:

- the backend verifies that the submitted `questionId` and `bankId` belong to the saved attempt
- the backend compares `selectedAnswer` against the saved attempt key
- a previously validated answer cannot be changed to a different answer

Possible failures:

- `404 ATTEMPT_NOT_FOUND`
- `400 ATTEMPT_ANSWER_INVALID`
- `409 ATTEMPT_ANSWER_LOCKED`
- `409 ATTEMPT_ALREADY_COMPLETED`
- `409 ATTEMPT_EXPIRED`
- `502 ATTEMPT_READ_FAILED`
- `502 ATTEMPT_WRITE_FAILED`

### `POST /attempts/:attemptId/finalize`

Purpose:

- finalize an attempt and persist the authoritative best score when applicable

Request params:

- `attemptId`: UUID

Request body:

- `elapsedSeconds` optional, nullable, integer `>= 0`

Success response:

- `finalized: true`
- `progress`
- `record`
- `requestId`

Behavior:

- finalizes the attempt once
- persists the best score through the backend-owned save flow
- replay-safe for already-saved attempts
- returns `record: null` when the attempt did not produce a saved score
- story mode never reaches this endpoint because it does not create an attempt

Possible failures:

- `404 ATTEMPT_NOT_FOUND`
- `409 ATTEMPT_EXPIRED`
- `502 ATTEMPT_FINALIZE_FAILED`
- `502 ATTEMPT_SAVE_FAILED`

### `POST /devices/register`

Purpose:

- register or refresh a notification device

Request body:

- `deviceToken`
- `platform`: `android` or `web`
- `clientType`: `android` or `web`
- `playerName` optional
- `appVersion` optional

Success response:

- `success: true`
- `device`
- `requestId`

Status code:

- `201 Created`

Behavior:

- upserts on `device_token`
- marks the device active
- updates `last_seen_at`

### `POST /devices/unregister`

Purpose:

- deactivate a notification device token

Request body:

- `deviceToken`

Success response:

- `success: true`
- `requestId`

Behavior:

- marks the device inactive rather than deleting history

### `POST /admin/scores/reset`

Purpose:

- clear saved records and saved attempts after parent reset PIN verification

Request body:

- `resetPin`

Success response:

- `deletedCount`
- `deletedAttemptCount`
- `resetAt`
- `requestId`

Behavior:

- this route stays on the current parent-facing PIN model
- verifies `resetPin` against the stored hash in `app_admin_settings`
- counts rows before deleting them
- clears both `test_scores` and `score_attempts`
- relies on cascade delete from `score_attempts` to `score_attempt_events`

Possible failures:

- `401 INVALID_RESET_PIN`
- `409 RESET_PIN_NOT_CONFIGURED`
- `502 RESET_PIN_LOOKUP_FAILED`
- `502 RESET_COUNT_FAILED`
- `502 RESET_DELETE_FAILED`

### `POST /admin/push/send`

Purpose:

- send FCM push notifications from the backend

Headers:

- `X-Admin-Key`

Request body:

- `target`
- `notification`
- `data` optional

Supported targets:

- `{ "type": "token", "token": "..." }`
- `{ "type": "player", "playerName": "..." }`
- `{ "type": "allAndroid" }`

Success response:

- send summary fields from the push service
- `requestId`

## Database Model

### `public.test_scores`

Purpose:

- one best authoritative score row per explorer name

Tie-break order:

1. higher `score`
2. higher `percentage`
3. lower `elapsed_seconds`

### `public.app_admin_settings`

Purpose:

- singleton settings row for reset PIN hash

### `public.notification_devices`

Purpose:

- push registration and active-token tracking

### `public.score_attempts`

Purpose:

- persisted attempt state for backend-owned validation and replay-safe score saving

Notable fields:

- `question_key`
- `answers`
- `started_at`
- `completed_at`
- `expires_at`
- `selection_fingerprint`
- `score_saved_at`
- `score_saved_payload`
- `last_elapsed_seconds`

### `public.score_attempt_events`

Purpose:

- attempt audit trail

Current event types:

- `attempt_started`
- `answer_accepted`
- `attempt_finalized`
- `score_saved`

## Rate Limiting

The backend applies route-specific rate limiting for:

- public reads
- public writes
- reset requests
- admin routes

Exact thresholds are configured through environment variables rather than hard-coded in this spec.

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

Optional tuning:

- `LOG_LEVEL`
- `READ_RATE_LIMIT_WINDOW_MS`
- `READ_RATE_LIMIT_MAX`
- `WRITE_RATE_LIMIT_WINDOW_MS`
- `WRITE_RATE_LIMIT_MAX`
- `RESET_RATE_LIMIT_WINDOW_MS`
- `RESET_RATE_LIMIT_MAX`
- `ADMIN_RATE_LIMIT_WINDOW_MS`
- `ADMIN_RATE_LIMIT_MAX`

## Deployment And Verification

Render service:

- root directory: `backend`
- build command: `npm install --include=dev && npm run build`
- start command: `npm run start`
- health path: `/api/v1/health`

Operational checks:

- local backend tests
- local typecheck
- `npm run smoke:live` after deploy-impacting backend changes

## Known Open Decisions

- whether the frontend should eventually stop shipping the question bank bundle entirely once UI rendering is fully decoupled from local bank data
