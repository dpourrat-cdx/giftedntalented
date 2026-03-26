# Next Implementation Todo

## Goal

This backlog captures the next high-value work for the Captain Nova app after the March 26, 2026 rollout of backend-owned, randomized web score attempts and the related live verification.

## Current State Snapshot

- [x] Frontend score submission now goes through backend-owned score attempts instead of posting raw score payloads directly.
- [x] The legacy `POST /players/:playerName/record` endpoint is live but intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- [x] The backend now uses a backend-owned question snapshot (`question-bank.data.json`) instead of executing the frontend question bundle at runtime.
- [x] For web quiz attempts, the backend now owns question selection and answer-order randomization for each new attempt.
- [x] The web app now waits for the backend-issued attempt payload before a quiz becomes interactive, avoiding local/backend answer drift.
- [x] Replay-safe finalize behavior and structured score-save audit metadata are live.
- [x] Public player-record lookup hardening and parent device-cache controls are live.
- [x] A one-command live backend smoke runner and deploy checklist exist in `backend/` and `spec/`.
- [x] Backend tests and TypeScript checks are currently passing locally (`149` tests plus `npm run check` as of March 26, 2026).
- [ ] There is still no CI workflow in the repo to run checks automatically on pushes and PRs.

## Priority 0: Release Safety And Delivery Guardrails

- [ ] Add `.github/workflows/ci.yml` that runs `npm run check`, `npm test`, and `npm run build` for `backend/` on every push and pull request.
- [ ] Add `.github/dependabot.yml` so backend dependency updates are surfaced continuously instead of manually.
- [ ] Add `npm audit --audit-level=high` to CI or to a scheduled workflow.
- [ ] Enable and verify branch protection on `master` so merges require passing checks and review.
- [ ] Add a lightweight post-deploy automation or checklist step that runs `npm run smoke:live` after backend releases.

## Priority 1: Security Hardening

- [ ] Replace direct admin-secret string comparison in `backend/src/middleware/admin-auth.ts` with `crypto.timingSafeEqual()`.
- [ ] Require admin auth middleware on `POST /api/v1/admin/scores/reset` in addition to the reset PIN flow.
- [ ] Review Supabase table security and explicitly enable or verify Row-Level Security plus policies for `test_scores`, `app_admin_settings`, `notification_devices`, `score_attempts`, and `score_attempt_events`.
- [ ] Add explicit `REVOKE EXECUTE FROM PUBLIC` and `GRANT EXECUTE TO service_role` statements for `SECURITY DEFINER` functions in `backend/supabase/backend_schema.sql`.
- [ ] Add a stricter Content Security Policy plan for the GitHub Pages frontend.
- [ ] Review remaining `innerHTML` render paths across the frontend and replace them with safer DOM construction where practical.

## Priority 2: Documentation And Repo Hygiene

- [ ] Rewrite `spec/backend-api-spec.md` so it fully documents the attempt-based flow:
  - `POST /attempts`
  - `POST /attempts/:attemptId/answers`
  - `POST /attempts/:attemptId/finalize`
  - legacy `POST /players/:playerName/record` disabled behavior
- [ ] Add or refresh an architecture note showing GitHub Pages frontend, Render backend, Supabase, and the live verification path.
- [ ] Add `CONTRIBUTING.md` with branch naming, test expectations, merge flow, and multi-agent working conventions.
- [ ] Update `backend/README.md` to reflect the smoke runner, current scripts, and backend-owned question-bank flow.

## Priority 3: Code Quality And Maintainability

- [ ] Split `backend/src/services/attempt.service.ts` into smaller units such as question selection, attempt state, and score persistence helpers.
- [ ] Deduplicate shared score-row mapping logic between `attempt.service.ts` and `score.service.ts`.
- [ ] Review whether schema-cache fallback handling can be simplified or centralized now that the live schema is aligned.
- [ ] Remove dead score-write code paths that are no longer reachable after the `410` legacy endpoint change.
- [ ] Move `@types/cors`, `@types/express`, and `@types/node` from production `dependencies` to `devDependencies`.
- [ ] Review the double "old best" lookup path in score persistence and simplify it if the RPC already owns that comparison.

## Priority 4: Privacy And Parent Safety

- [ ] Add a way to delete one child's record without clearing all saved records.
- [ ] Clarify retention expectations for online score history, reset logs, and local fallback cache data.
- [ ] Decide whether explorer names should stay as plain-text identifiers or move to a parent-managed profile model later.
- [ ] Decide whether the parent reset flow should move from a browser prompt to a small dedicated form with clearer confirmation and error handling.

## Priority 5: Testing And Operations

- [ ] Add broader frontend smoke coverage for page load, record lookup, story mode progression, and reset behavior.
- [ ] Add browser-level verification for desktop and mobile layout/interaction paths.
- [ ] Keep `backend/scripts/smoke-live-backend.ts` aligned with production behavior whenever schema or score flow changes.
- [ ] Add alerting or monitoring for unusual public write bursts, repeated reset failures, and backend error spikes.
- [ ] Review Render cold-start behavior and decide whether uptime mitigation is worth the cost.

## Priority 6: Product And Content Improvements

- [ ] Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- [ ] Move storyline packs out of the main JS bundle into dedicated content files or JSON.
- [ ] Add a story-content validation helper for mission text, endings, and artwork references.
- [ ] Give Story Only mode its own finale/report path instead of reusing the score-banded result screen.
- [ ] Add a parent export or printable summary for mission results and missed-question review.
- [ ] Add the remaining mission-complete artworks and gallery improvements.

## Next Recommended Delivery Slice

1. Add CI for backend check, test, and build.
2. Enable or verify branch protection on `master`.
3. Land timing-safe admin auth plus admin middleware on score reset.
4. Rewrite `spec/backend-api-spec.md` for the attempt-based contract.
5. Start breaking up `attempt.service.ts` so future score-flow work is easier to land safely.

## Done Definition For This Backlog

- Current score flow is documented accurately and legacy paths are clearly marked.
- Automated checks run before merges instead of relying only on manual local runs.
- Live deploy verification remains scriptable and repeatable.
- Remaining security and integrity gaps are explicitly chosen, not accidental.
- Parent-facing privacy and fallback behavior is understandable.
- Frontend, backend, and database releases have a documented and repeatable process.
