# Architecture And Release Flow

## Current Architecture

- **Frontend:** static assets served from GitHub Pages
  - Live: `https://dpourrat-cdx.github.io/giftedntalented/`
- **Backend:** Render web service (Node.js + Express)
  - Live API: `https://giftedntalented.onrender.com`
  - Root directory: `backend/`
- **Database:** Supabase
  - Backend owns service-role access and all schema changes

## Release Flow

1. Work on an agent-owned branch in an agent-owned worktree (`claude/*` for Claude, `codex/*` for Codex) - never push directly to `master`.
2. Run local checks inside `backend/` before opening a PR:
   ```bash
   npm run check && npm test && npm run build
   ```
3. Open a pull request targeting `master`. The CI `Backend` job runs automatically.
4. Get a review (other agent or human owner) and wait for CI to go green.
5. Merge via the GitHub PR interface. Direct pushes to `master` are blocked.
6. Render auto-deploys the backend. GitHub Pages picks up frontend asset changes.
7. Run `npm run smoke:live` from `backend/` to verify the live backend is healthy.
8. Delete the feature branch after merge.

On Windows, use `npm.cmd` for these backend commands as described in [CONTRIBUTING.md](../CONTRIBUTING.md).

For the per-agent checklist, branch/worktree rules, and review flow, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## CI Pipeline

`.github/workflows/ci.yml` runs on every push and PR targeting `master`.

### `Backend` job

Required to merge:

| Step | Command | On failure |
|---|---|---|
| Install | `npm ci --ignore-scripts` | Hard stop |
| Type check | `npm run check` | Hard stop |
| Test + coverage | `npm run test:coverage` | Hard stop |
| Build | `npm run build` | Hard stop |
| Audit | `npm audit --audit-level=high` | `continue-on-error` - visible, non-blocking |

### `SonarCloud` job

Runs after `Backend`, downloads the lcov coverage artifact from the `Backend` job, and runs `SonarSource/sonarqube-scan-action`.

Quality gate on new code:

- 0 unreviewed security hotspots
- >=80% coverage
- A ratings for reliability, security, and maintainability

Configuration lives in `sonar-project.properties` at the repo root.

Project dashboard: <https://sonarcloud.io/project/overview?id=dpourrat-cdx_giftedntalented>

## Branch Protection (`master`)

| Rule | Setting |
|---|---|
| Required status check | `Backend` |
| Branches up-to-date | Required before merge |
| Include administrators | Yes - no bypass |
| Force-push | Blocked |
| Branch deletion | Blocked |

## Smoke Checks

Run from `backend/`:

```bash
npm run smoke:live
```

Set `BACKEND_BASE_URL` to target a non-production backend.

The smoke script validates:

- `GET /api/v1/health` returns healthy status
- score lookup works for an existing player
- attempt flow works end to end: start -> submit answer -> finalize
- `POST /api/v1/players/:playerName/record` returns `410 LEGACY_SCORE_ENDPOINT_DISABLED`
- replay-safe finalize remains idempotent

If the smoke script fails with `PGRST205`, the `score_attempts` schema migration is missing in Supabase.

## Dependabot

`.github/dependabot.yml` opens weekly PRs for `backend/` npm updates every Monday:

- `@types/*` packages grouped into one PR
- major bumps for `express` and `zod` ignored for manual review
- maximum 5 open Dependabot PRs at a time

## Environment Variables

Required for the backend:

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
- `READ_RATE_LIMIT_WINDOW_MS` / `READ_RATE_LIMIT_MAX`
- `WRITE_RATE_LIMIT_WINDOW_MS` / `WRITE_RATE_LIMIT_MAX`
- `RESET_RATE_LIMIT_WINDOW_MS` / `RESET_RATE_LIMIT_MAX`
- `ADMIN_RATE_LIMIT_WINDOW_MS` / `ADMIN_RATE_LIMIT_MAX`

## Legacy Notes

- `supabase/scoreboard_setup.sql` at the repo root is legacy history only - do not use.
- `backend/supabase/backend_schema.sql` is the live schema source of truth.
- `POST /api/v1/players/:playerName/record` is disabled and returns `410`.

## Open Questions

- Should Render and GitHub Pages continue to ship from the same repository long term, or should the backend split into its own repo later?
