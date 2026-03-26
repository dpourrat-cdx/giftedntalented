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

1. Make the change on a feature branch (prefix: `claude/`, `codex/`, or `feature/`), keeping frontend, backend, and schema updates together when they are part of the same user-visible feature.
2. Run local checks before opening a PR: `npm run check && npm test && npm run build` inside `backend/`.
3. Open a pull request targeting `master`. The CI pipeline (`Backend` job) runs automatically and must pass before merge.
4. Get a review and merge via the GitHub PR interface. Direct pushes to `master` are blocked by branch protection.
5. Render auto-deploys the backend from `master` after merge. GitHub Pages picks up frontend asset changes automatically.
6. Run `npm run smoke:live` to verify the live backend is healthy.
7. Delete the feature branch after the merge lands.

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

## CI And Branch Protection

As of March 26, 2026, `master` is protected:

- The `Backend` GitHub Actions job (`.github/workflows/ci.yml`) must pass before any PR can merge.
- Branches must be up-to-date with `master` before merge.
- Force-push and direct deletion of `master` are blocked.
- Admins are included in these rules — no bypass.

Dependabot opens weekly PRs for backend npm updates. CI validates them before they can merge.

For multi-agent workflow conventions (Claude + Codex branch coordination, PR review ownership), see `CONTRIBUTING.md` at the repo root.

## Open Questions

- Should Render and GitHub Pages continue to ship from the same repository long term, or should the backend split into its own repo later?
