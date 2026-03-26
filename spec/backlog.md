# Next Implementation Todo

This file is the live backlog only. Completed work should not stay here unless it is still needed to explain an open decision or dependency.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- CI, SonarCloud, Dependabot, branch protection, and the live smoke runner are already in place.
- The current multi-step security sequence is tracked in `spec/security-rollout-plan.md`.
- Durable architecture and process details belong in:
  - `spec/architecture.md`
  - `CONTRIBUTING.md`
  - `spec/backend-api-spec.md` once it is refreshed

## Priority 1: Security Hardening

- [ ] Decide whether `POST /api/v1/admin/scores/reset` should stay public-parent reachable or become owner-only with `X-Admin-Key`.
- [ ] Review Supabase table security and explicitly enable or verify Row-Level Security plus policies for `test_scores`, `app_admin_settings`, `notification_devices`, `score_attempts`, and `score_attempt_events`.
  Progress: PR 22 enables RLS and adds service-role-only policies for the backend-owned tables without changing reset-route behavior.
- [ ] Add explicit `REVOKE EXECUTE FROM PUBLIC` and `GRANT EXECUTE TO service_role` statements for `SECURITY DEFINER` functions in `backend/supabase/backend_schema.sql`.
  Progress: PR 21 lands the function execute lockdown for the current `SECURITY DEFINER` functions before the wider RLS/policy pass.
- [ ] Remove `'unsafe-inline'` from `style-src` once inline style generation is eliminated from frontend JS.
- [ ] Add clickjacking protection planning for the GitHub Pages frontend.
  GitHub Pages cannot enforce `frame-ancestors` from a meta CSP, so this likely requires a hosting decision or an explicit risk acceptance.
- [ ] Add a CSP `report-to` or equivalent reporting endpoint after the stricter CSP is in place.
- [ ] Continue replacing remaining `innerHTML` render paths with safer DOM construction where practical.
- [ ] Extract `secureRandomIndex` into a shared frontend utility once the surrounding frontend scripts are ready for that cleanup.

## Priority 2: Documentation And Repo Hygiene

- [ ] Rewrite `spec/backend-api-spec.md` so it documents the live attempt-based flow:
  - `POST /attempts`
  - `POST /attempts/:attemptId/answers`
  - `POST /attempts/:attemptId/finalize`
  - disabled legacy record-write behavior
  Progress: PR 23 rewrites `spec/backend-api-spec.md` as the live contract for attempts, records, reset, device registration, and admin push behavior.
- [ ] Update `backend/README.md` to reflect the smoke runner, current scripts, and backend-owned question-bank flow.
  Progress: PR 24 refreshes `backend/README.md` so it matches the live scripts, smoke runner, schema notes, and backend-owned attempt/question flow.
- [ ] Add a lightweight post-deploy checklist or automation step that runs `npm run smoke:live` after backend releases.

## Priority 3: Code Quality And Maintainability

- [ ] Split `backend/src/services/attempt.service.ts` into smaller units such as question selection, attempt state, and score persistence helpers.
- [ ] Deduplicate shared score-row mapping logic between `attempt.service.ts` and `score.service.ts`.
- [ ] Review whether schema-cache fallback handling can now be simplified or centralized.
- [ ] Remove dead score-write code paths left behind after the `410` legacy endpoint change.
- [ ] Move `@types/cors`, `@types/express`, and `@types/node` from production `dependencies` to `devDependencies`.
- [ ] Review the double "old best" lookup path in score persistence and simplify it if the RPC already owns that comparison.
- [ ] Broaden frontend source-attributed coverage so Sonar does not need coverage-bridge exclusions for legacy root scripts.
  Progress: PR 26 adds targeted `app.js` frontend coverage for the results/review path, including perfect-score and missed-question cards after the review-card DOM hardening slice.
- [ ] Refactor the highest-complexity frontend functions in `app.js`, `question-bank.js`, and `scoreboard.js`.
- [ ] Sweep remaining nested ternaries and similar readability debt file by file.

## Priority 4: Privacy And Parent Safety

- [ ] Add a way to delete one child's record without clearing all saved records.
- [ ] Clarify retention expectations for online score history, reset logs, and local fallback cache data.
- [ ] Decide whether explorer names should stay plain-text or eventually move to a parent-managed profile model.
- [ ] Decide whether the parent reset flow should move from a browser prompt to a dedicated form with clearer confirmation and error handling.

## Priority 5: Testing And Operations

- [ ] Add broader frontend smoke coverage for page load, record lookup, story mode progression, and reset behavior.
- [ ] Add browser-level verification for desktop and mobile layout/interaction paths.
- [ ] Keep `backend/scripts/smoke-live-backend.ts` aligned whenever schema or score flow changes.
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

1. Decide the `POST /api/v1/admin/scores/reset` security model.
2. Continue frontend render-sink cleanup beyond story mode, starting with the next practical `innerHTML` surface after review/results.
3. Remove `'unsafe-inline'` from `style-src` once inline style generation is gone.
4. Add a lightweight post-deploy checklist or automation step that runs `npm run smoke:live` after backend releases.
5. Decide whether browser-level mobile/desktop smoke coverage should land before the next larger frontend refactor slice.
