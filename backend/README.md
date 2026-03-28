# Captain Nova Backend

## Purpose

This backend is the live score, attempt, reset, device, and admin API for Captain Nova.

It owns:

- backend-validated score attempts
- backend-owned web quiz question selection
- authoritative score persistence in Supabase
- parent reset PIN verification
- device registration for future push delivery
- admin-triggered push notifications

The web app on GitHub Pages calls this backend instead of talking directly to Supabase for score actions.

## Stack

- Node.js 22
- Express 5
- TypeScript
- Supabase
- Zod
- Pino
- Firebase Admin SDK

## Quick Start

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in the required environment variables
3. Apply `backend/supabase/backend_schema.sql` to the target Supabase project
4. Install dependencies:

```bash
npm install
```

5. Start local development:

```bash
npm run dev
```

## Scripts

- `npm run dev`
  Starts the local TypeScript server with watch mode.

- `npm run build`
  Builds the backend into `dist/`.

- `npm run start`
  Runs the compiled production build.

- `npm run check`
  Runs the TypeScript no-emit typecheck.

- `npm run test`
  Runs the backend test suite.

- `npm run test:coverage`
  Runs the backend test suite with coverage.

- `npm run smoke:live`
  Runs the live backend smoke checks against the deployed API.

## Required Environment Variables

Required:

- `NODE_ENV`
- `PORT`
- `ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_KEY`

Optional but commonly used:

- `LOG_LEVEL`
- `READ_RATE_LIMIT_WINDOW_MS`
- `READ_RATE_LIMIT_MAX`
- `WRITE_RATE_LIMIT_WINDOW_MS`
- `WRITE_RATE_LIMIT_MAX`
- `RESET_RATE_LIMIT_WINDOW_MS`
- `RESET_RATE_LIMIT_MAX`
- `ADMIN_RATE_LIMIT_WINDOW_MS`
- `ADMIN_RATE_LIMIT_MAX`

Optional FCM:

- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`

## Local Verification

Typical local verification flow:

```bash
npm run test
npm run check
```

For broader validation:

```bash
npm run test:coverage
```

## Live Smoke Verification

The repo includes a live smoke runner at:

- `backend/scripts/smoke-live-backend.ts`

Run it with:

```bash
npm run smoke:live
```

What it checks:

- health endpoint
- legacy score-write endpoint is disabled with `410`
- attempt start
- answer submission
- finalize flow
- replay-safe answer/finalize behavior
- record lookup after finalize

Notes:

- it targets `https://giftedntalented.onrender.com/api/v1` by default
- override with `BACKEND_BASE_URL` when needed
- it creates temporary smoke records and then cleans them up

## Current API Surface

Main routes:

- `GET /api/v1/health`
- `GET /api/v1/players/:playerName/record`
- `POST /api/v1/players/:playerName/record` returns `410 LEGACY_SCORE_ENDPOINT_DISABLED`
- `POST /api/v1/attempts`
- `POST /api/v1/attempts/:attemptId/answers`
- `POST /api/v1/attempts/:attemptId/finalize`
- `POST /api/v1/devices/register`
- `POST /api/v1/devices/unregister`
- `POST /api/v1/admin/scores/reset`
- `POST /api/v1/admin/push/send`

For the live contract details, use:

- `spec/backend-api-spec.md`

## Attempt And Question Flow

Quiz scoring is attempt-based.

Current behavior:

- direct browser score writes are disabled
- the backend creates persisted quiz attempts
- the backend validates answers against the saved attempt key
- the backend finalizes and saves the authoritative best score
- story-only mode does not create a score record

The backend question bank now comes from:

- `backend/src/lib/question-bank.data.json`

Loaded through:

- `backend/src/lib/question-bank.ts`

This means the backend no longer executes the frontend question bundle at runtime.

## Database Notes

Schema source of truth:

- `backend/supabase/backend_schema.sql`

The schema currently includes:

- `test_scores`
- `app_admin_settings`
- `notification_devices`
- `score_attempts`
- `score_attempt_events`
- `SECURITY DEFINER` function execute lockdown
- RLS plus service-role-only policies for backend-owned tables

## Security Notes

- Browser CORS is restricted to the configured allowlist.
- The backend uses the Supabase service role key on the server only.
- `POST /api/v1/admin/push/send` requires `X-Admin-Key`.
- `POST /api/v1/admin/scores/reset` currently uses reset-PIN verification rather than `X-Admin-Key`.

## Render Deployment

Render service settings:

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health path: `/api/v1/health`

Expected production backend:

- `https://giftedntalented.onrender.com`

## Post-Deploy Checklist

After any backend release or Render deploy:

1. Wait for the Render deployment to finish.
2. Run `npm run smoke:live` from `backend/` against the deployed API.
3. If the smoke fails, check `/api/v1/health` and the Render logs before merging the fix.

## Related Docs

- `spec/backend-api-spec.md`
- `spec/backlog.md`
- `spec/security-rollout-plan.md`
