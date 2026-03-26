# Next Implementation Todo

## Goal

This backlog captures the next high-value work for the Captain Nova app after the March 25, 2026 score-attempt rollout, backend merge into `master`, live deploy verification, and branch cleanup.

The biggest theme now is finishing the move from "browser-trusted score writes" to a cleaner, documented, and more defensible frontend -> Render backend -> Supabase architecture.

## Current State Snapshot

- Frontend score submission now goes through backend-owned score attempts instead of posting raw score payloads directly.
- The legacy `POST /players/:playerName/record` endpoint is live but intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- Backend tests and TypeScript checks are in place and passing locally.
- The live backend health endpoint and deployed frontend assets were verified after the March 25, 2026 merge.
- The backend schema includes `score_attempts` locally, but the live Supabase migration still needs to be confirmed before the attempt flow is considered fully deployed.
- A one-command live backend smoke runner and deploy checklist now exist in `backend/` and `spec/`.

## Priority 0: Security And Secret Hygiene Follow-Through

- Decide whether to scrub old secrets from git history using a history-rewrite tool, or treat them as permanently rotated legacy values.
- Add a short secret-rotation runbook so future key changes are fast and repeatable.
- Review the live Render service and Supabase project for least-privilege settings and remove anything no longer needed from the old direct-frontend approach.
- Review backend logs and env vars to ensure no secrets are accidentally echoed in startup or error output.

## Priority 1: Score Integrity Hardening

- Decide the long-term trust model now that attempt-based sync is live:
  - backend-issued signed attempt tokens, or
  - fully backend-owned question delivery and answer validation
- Remove the remaining trust gap where the backend still derives authoritative question shape from frontend-shipped content.
- Decide whether question selection should move to the backend so refreshes cannot inspect or predict the full answer set in the browser.
- Add attempt expiry / replay rules so stale attempts cannot be reused indefinitely.
- Add an audit trail for score writes showing:
  - normalized player name
  - old best vs new best
  - whether the new attempt replaced the old one
  - request source / client type
  - attempt id
- Add rate-limit metrics or alerting for suspicious bursts on public attempt-write endpoints.
- Review public player-name lookup endpoints for enumeration risk and decide whether response shaping or throttling should change.

## Priority 2: Privacy And Parent Safety

- Add a parent-facing privacy note that explains:
  - what is stored in Supabase
  - what may still be cached on the current device
  - when the app is showing device-only fallback data
- Add a way to delete one child's record without clearing everyone.
- Add a parent-facing `Clear this device cache` action for stale local fallback data.
- Review whether explorer names should remain plain-text identifiers or move to a parent-managed profile model.
- Define retention expectations for score history, reset logs, and device caches.
- Decide whether the reset flow should move from a browser prompt to a small parent-only form with clearer error handling and fewer accidental submissions.

## Priority 3: Architecture And Repo Cleanup

- Archive or clearly mark [supabase/scoreboard_setup.sql](../supabase/scoreboard_setup.sql) as legacy now that the live score flow uses [backend/supabase/backend_schema.sql](../backend/supabase/backend_schema.sql).
- Add a short architecture note or diagram showing:
  - GitHub Pages frontend
  - Render backend
  - Supabase database
  - optional future Android client
  - frontend asset cache-busting expectations
  - backend deploy expectations
  - required post-deploy smoke checks
- Add a short release checklist for unified `master` deploys so frontend and backend changes stay coordinated.
- Decide whether the backend should eventually move to its own repository for operational isolation, or stay co-located with the frontend for simpler releases.

## Priority 4: Defensive Testing And Ops

- Add an automated smoke test suite for:
  - frontend page load
  - explorer record lookup
  - score attempt start / answer / finalize flow
  - reset flow
  - Chrome/Edge consistency
  - mobile modal visibility
  - Story Only mode progression
- Add a build/release step that bumps frontend asset versions automatically before pushing to GitHub Pages.
- Add dependency review and `npm audit` follow-up for the backend package set.
- Add automated verification that Render is still targeting `master` and `backend/` after any service edits.
- Keep the live backend smoke runner aligned with the production API whenever score or schema behavior changes.
- Keep the backend deployment checklist updated as new release checks are added.

## Priority 5: Frontend And API Safety Review

- Review all remaining `innerHTML` render paths and replace them with safer DOM construction where practical.
- Add a stricter Content Security Policy plan for the frontend hosting model.
- Review CORS and headers again after Android support is introduced.
- Add backend request logging rules that are useful for incident review without over-logging child data.
- Add alerting for repeated reset failures, high error rates, and unusual public write activity.
- Review the current admin key model for push-send endpoints and decide whether a stronger admin auth model is needed later.

## Priority 6: Product And Content Improvements

- Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- Move storyline packs out of the main JS bundle into dedicated content files or JSON for easier writing and review.
- Add a story-content validation helper that checks mission text length, ending length, artwork references, and missing story beats before deploy.
- Give Story Only mode its own finale/report path instead of reusing the score-banded results screen.
- Add a parent export or printable summary for mission results and missed-question review.
- Add a lightbox or slideshow mode for the end-of-story gallery.
- Add the remaining mission-complete artworks so every mission has its own custom final reward scene.

## Next Recommended Delivery Slice

1. Clean up docs and legacy SQL labeling so the current architecture is obvious to future contributors.
2. Add live smoke tooling and deployment checklists so release verification is repeatable.
3. Choose the next score-hardening direction and write it down before another score-flow rewrite.
4. Tackle parent privacy UX and single-record deletion after the operational basics are documented.

## Done Definition For This Backlog

- Current score flow is documented accurately and legacy paths are clearly marked.
- Live deploy verification is scriptable and repeatable.
- Remaining score-integrity gaps are explicitly chosen, not accidental.
- Parent-facing privacy and fallback behavior is understandable.
- Frontend, backend, and database releases have a documented and repeatable process.
