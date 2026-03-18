# Backend API Spec

## Overview

This document captures the current backend architecture that now powers the live Captain Nova score and reset flows.

The backend is deployed on Render at:

- `https://giftedntalented.onrender.com`

The web frontend on GitHub Pages now calls this backend for score read, score save, and score reset behavior.

At the moment, the backend implementation itself lives on the separate git branch:

- `codex/backend`

The `master` branch contains the frontend integration that consumes the deployed API.

## Goal

- Remove browser-held trust for score storage and reset actions.
- Make cross-browser and cross-device explorer records consistent.
- Keep the frontend static and GitHub Pages-friendly.
- Prepare the platform for future Android support and push notifications.

## Technology Choices

- Runtime: Node.js 22
- Framework: Express 5
- Language: TypeScript
- Validation: Zod
- Logging: Pino
- Security middleware: Helmet, CORS, rate limiting
- Database access: Supabase with server-side service-role credentials
- Push notification support: Firebase Admin / FCM scaffolding
- Deployment target: Render web service

## Current Deployment

- Render service URL: `https://giftedntalented.onrender.com`
- Health endpoint: `/api/v1/health`
- Browser origin currently allowed:
  - `https://dpourrat-cdx.github.io`

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
- talk directly to Supabase for scores
- decide whether a reset request is authorized

## Public API

### `GET /api/v1/health`

Returns:

- backend status
- environment
- timestamp
- Supabase health
- FCM configuration status

### `GET /api/v1/players/:playerName/record`

Purpose:

- fetch the best saved record for one explorer

Returns:

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

### `POST /api/v1/players/:playerName/record`

Purpose:

- submit a score attempt and keep only the best record

Request body:

- `score`
- `percentage`
- `totalQuestions`
- `elapsedSeconds`
- `clientType`
- `mode`

Behavior:

- validates numeric ranges
- ignores `story` mode for persistence
- keeps only the best row per normalized player name
- tie-breaker prefers faster elapsed time

### `POST /api/v1/admin/scores/reset`

Purpose:

- clear saved records after PIN verification

Request body:

- `resetPin`

Behavior:

- backend verifies the stored hash in Supabase
- browser never contains the correct PIN
- route is more tightly rate-limited than normal player routes

## Current Security Model

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

- Score correctness is still browser-trusted.
  - The browser calculates score, percentage, and elapsed time and submits them to the backend.
- The question bank and answer key still ship to the browser.
- Explorer names remain guessable identifiers.
- Old credentials and reset values may still exist in git history from earlier versions.

## Database Responsibilities

The backend expects Supabase to provide:

- best-score storage
- reset PIN hash storage
- record lookup function
- best-score upsert/update logic

The backend also includes schema support for future notification-device storage.

## Render Requirements

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/api/v1/health`

Required environment variables:

- `NODE_ENV`
- `PORT`
- `LOG_LEVEL`
- `ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_KEY`

Optional environment variables:

- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`
- rate-limit tuning vars

## Current Branching Model

- `master`
  - static web app
  - live GitHub Pages frontend
  - frontend integration to the deployed backend

- `codex/backend`
  - backend implementation
  - Render-targeted Node/Express service

## Next Architectural Decisions

- Decide whether to merge the backend branch into the mainline repo history once the API is stable.
- Decide whether the old frontend-only Supabase SQL/docs should be archived as legacy references.
- Decide whether future score integrity should use:
  - backend-issued session tokens, or
  - fully server-owned question delivery and answer validation

## Acceptance Criteria For Current Backend State

- Render health checks pass.
- The backend starts with valid environment variables and fails fast when secrets are missing.
- The frontend can read explorer records from the backend.
- The frontend can save best-score records through the backend.
- Reset requests require backend PIN verification.
- Cross-browser explorer records are consistent when the backend is reachable.
- Device-only fallback is clearly labeled when the backend cannot be reached.
