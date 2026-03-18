# Next Implementation Todo

## Goal

This backlog captures the next high-value work for the Captain Nova app after the March 18 backend deployment and frontend API migration.

The biggest theme now is tightening trust and cleaning up the architecture around the new frontend -> Render backend -> Supabase flow.

## Priority 0: Secret Hygiene And Security Cleanup

- Rotate any values that were exposed in earlier public revisions, including:
  - the old Supabase publishable key used by the score flow
  - any earlier reset PIN values that were ever embedded in frontend code
  - any temporary rollout/admin secrets that should not remain long-lived
- Decide whether to scrub old secrets from git history using a history-rewrite tool, or treat them as permanently rotated legacy values.
- Add a small secret-rotation runbook so future key changes are fast and repeatable.
- Review the live Render service and Supabase project for least-privilege settings and remove anything no longer needed from the old direct-frontend approach.

## Priority 1: Score Integrity And Abuse Resistance

- Stop trusting browser-submitted `score`, `percentage`, and `elapsedSeconds` as authoritative.
- Decide on the next trust model:
  - backend-issued signed attempt tokens, or
  - fully server-owned question delivery and answer validation
- Consider moving question selection to the backend so repeated refreshes cannot inspect or predict the full answer set in the browser.
- Consider moving answer checking to the backend if tamper resistance becomes a product requirement.
- Add an audit trail for score writes showing:
  - normalized player name
  - old best vs new best
  - whether the new attempt replaced the old one
  - request source / client type
- Add rate-limit metrics or alerting for suspicious bursts on public score-write endpoints.

## Priority 2: Privacy And Parent Safety

- Add a parent-facing privacy note that explains:
  - what is stored in Supabase
  - what may still be cached on the current device
  - when the app is showing device-only fallback data
- Add a way to delete one child's record without clearing everyone.
- Add a parent-facing `Clear this device cache` action for stale local fallback data.
- Review whether explorer names should remain plain-text identifiers or move to a parent-managed profile model.
- Define retention expectations for score history, reset logs, and device caches.

## Priority 3: Repo And Architecture Cleanup

- Decide whether to merge `codex/backend` into the main repo history once the backend API is stable.
- If the backend stays on its own branch for a while, document the release process clearly so frontend and backend changes do not drift.
- Decide whether `supabase/scoreboard_setup.sql` on `master` should be archived or marked as legacy now that the live frontend uses the backend API.
- Add a short architecture note or diagram showing:
  - GitHub Pages frontend
  - Render backend
  - Supabase database
  - optional future Android client

## Priority 4: Defensive Testing And Ops

- Add an automated smoke test suite for:
  - frontend page load
  - explorer record lookup
  - score save through the backend
  - reset flow
  - Chrome/Edge consistency
  - mobile modal visibility
  - Story Only mode progression
- Add a backend deployment checklist that includes:
  - Render env var validation
  - health endpoint verification
  - Supabase schema migration verification
  - post-deploy score save/read/reset smoke tests
- Add a build/release step that bumps frontend asset versions automatically before pushing to GitHub Pages.
- Add dependency review and `npm audit` follow-up for the backend package set.

## Priority 5: Cyber Security Review

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

## Suggested Delivery Order

1. Rotate old secrets and clean up trust boundaries.
2. Improve score integrity and abuse resistance.
3. Clean up branch/repo architecture and document the release flow.
4. Add automated smoke tests and deployment checklists.
5. Improve parent privacy UX and safety controls.
6. Continue story/content/product enhancements.

## Done Definition For This Backlog

- No security-critical values remain trusted just because they are in the browser or old public history.
- Score flow is harder to tamper with and easier to monitor.
- Parent-facing privacy and fallback behavior is understandable.
- Frontend, backend, and database releases have a documented and repeatable process.
- Future feature work builds on a cleaner and safer foundation.
