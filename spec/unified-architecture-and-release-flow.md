# Unified Architecture And Release Flow

## Overview

The current app is a unified repo with a static GitHub Pages frontend, a Render-hosted Node backend, and Supabase as the system of record for scores, attempts, and admin settings.

This note describes the live deployment shape and the release steps we should expect for changes that cross frontend, backend, and schema boundaries.

## Current Architecture

- Frontend:
  - static assets served from GitHub Pages
  - current live page: `https://dpourrat-cdx.github.io/giftedntalented/`
- Backend:
  - Render web service
  - current live API: `https://giftedntalented.onrender.com`
  - root directory: `backend`
- Database:
  - Supabase
  - backend owns service-role access and schema changes

## Release Flow

1. Make the change in the repo, keeping frontend, backend, and schema updates together when they are part of the same user-visible feature.
2. Run the relevant local checks before merging.
3. Merge to `master`.
4. Push `master` so Render can deploy the backend and GitHub Pages can pick up the frontend assets.
5. Verify the live backend health endpoint and the user-facing flow that changed.
6. Clean up temporary feature branches after the merge lands.

## Required Smoke Checks

- `npm run smoke:live` can validate the live backend in one command when the backend package is installed locally.
- `GET /api/v1/health` returns a healthy production response.
- Score lookup works for an existing player.
- New score-attempt behavior works for the changed flow.
- The legacy score write endpoint returns `410` and stays disabled.
- Any schema-dependent change is verified against the live backend after deploy.

## Legacy Paths

- [supabase/scoreboard_setup.sql](../supabase/scoreboard_setup.sql) is legacy history only.
- The live schema source of truth is [backend/supabase/backend_schema.sql](../backend/supabase/backend_schema.sql).
- Older direct score submission flows should be treated as compatibility shims, not the default architecture.

## Open Questions

- Should Render and GitHub Pages continue to ship from the same repository long term, or should the backend split into its own repo later?
- Should future deploy verification be automated as a single smoke script, or stay as a short manual checklist?
