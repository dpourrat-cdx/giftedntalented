# Next Implementation Todo

This file is the live backlog only. Completed work should not stay here unless it is still needed to explain an open decision or dependency.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- CI, SonarCloud, Dependabot, branch protection, and the live smoke runner are already in place.
- Backend schema is hardened: SECURITY DEFINER function lockdown (PR 21) and RLS with service-role-only policies (PR 22) are both live.
- The live API contract is documented in `spec/backend-api-spec.md` (PR 23) and `backend/README.md` (PR 24).
- The review-card innerHTML sinks have been replaced with DOM construction (PR 25), covered by targeted frontend tests (PR 26).
- Sonar quick wins landed (PR 28): `@types/*` moved to devDependencies, dead `savePlayerRecord` path removed, CSS contrast fixed, nested template literals and dead `escapeHtml` removed, `buildSectionButton` converted to DOM construction.
- The remaining security sequence is tracked in `spec/security-rollout-plan.md`.
- Durable architecture and process details belong in:
  - `spec/architecture.md`
  - `CONTRIBUTING.md`
  - `spec/backend-api-spec.md`

## Priority 1: Security Hardening

- [ ] Decide whether `POST /api/v1/admin/scores/reset` should stay public-parent reachable or become owner-only with `X-Admin-Key`. This decision blocks the reset-route section of the API spec and any future auth change on that route.
- [ ] Audit inline style generation in frontend JS as a prerequisite to removing `'unsafe-inline'` from `style-src`.
- [ ] Remove `'unsafe-inline'` from `style-src` once inline style generation is eliminated.
- [ ] Add clickjacking protection planning for the GitHub Pages frontend. GitHub Pages cannot enforce `frame-ancestors` from a meta CSP, so this likely requires a hosting decision or an explicit risk acceptance.
- [ ] Add a CSP `report-to` or equivalent reporting endpoint after the stricter CSP is in place.
- [ ] Continue replacing remaining `innerHTML` render paths with safer DOM construction. The gamification panel renderers (`MissionPanel`, `OverallProgressBar`, `RocketProgressVisual`, `CelebrationManager`) still use `innerHTML` with integer/constant-only interpolation — safe today but the natural next pass.
- [ ] Extract `secureRandomIndex` into a shared frontend utility once the surrounding frontend scripts are ready for that cleanup.

## Priority 2: Documentation And Repo Hygiene

- [ ] Add a lightweight post-deploy checklist or automation step that runs `npm run smoke:live` after backend releases.
- [ ] Update `spec/backend-api-spec.md` reset-route section once the security model for `POST /api/v1/admin/scores/reset` is decided.

## Priority 3: Code Quality And Maintainability

SonarCloud currently reports 12 critical cognitive-complexity violations (S3776). Highest severity first:

- [ ] Refactor `renderQuestion()` in `app.js:1243` — complexity 56, worst function in the codebase. Split into question-render, option-render, feedback-render, and state-sync helpers.
- [ ] Refactor `normalizeAttemptQuestion()` in `app.js:196` — complexity 39.
- [ ] Refactor `buildLogicChallengeQuestions()` in `question-bank.js:2221` — complexity 39.
- [ ] Refactor `buildLogicalQuestions()` in `question-bank.js:1444` — complexity 28.
- [ ] Split `saveAuthoritativeScore()` in `backend/src/services/attempt.service.ts:560` — complexity 25. Aligns with the broader `attempt.service.ts` split into question-selection, attempt-state, and score-persistence helpers.
  Progress: PR 31 extracts `fetchOldBest`, `persistScoreLegacyFallback`, and `persistScorePrimary`; `saveAuthoritativeScore` becomes a thin orchestrator. 14 new unit tests, 147 → 161 passing.
- [ ] Refactor `refreshTopScoreForPlayer()` in `scoreboard.js:639` — complexity 22.
- [ ] Refactor `buildQuantitativeQuestions()` in `question-bank.js:563` — complexity 23.
- [ ] Refactor `buildNonverbalQuestions()` in `question-bank.js:742` — complexity 23.
- [ ] Refactor `generateGridQuestions()` in `question-bank.js:938` — complexity 19.
- [ ] Refactor `handleOverlayStateChange()` in `app.js:1714` — complexity 16.
- [ ] Refactor `handleAnswerEvaluation()` in `app.js:1790` — complexity 16.
- [ ] Refactor `buildSpatialQuestions()` in `question-bank.js:1008` — complexity 16.

Additional code quality items:

- [ ] Sweep nested ternaries (28 Sonar MAJOR S3358 issues) across `app.js` and `question-bank.js`.
- [ ] Replace remaining nested template literals — `app.js:1177` and `scoreboard.js:625–626` resolved in PR 28; confirm via Sonar whether any remain.
- [ ] Replace optional-chaining opportunities (9 Sonar MAJOR S6582) across `app.js`, `scoreboard.js`, and `gamification.js`.
- [ ] Deduplicate shared score-row mapping logic between `attempt.service.ts` and `score.service.ts`.
- [ ] Review whether schema-cache fallback handling can now be simplified or centralized.
- [ ] Review the double "old best" lookup path in score persistence and simplify it if the RPC already owns that comparison.
- [ ] Broaden frontend source-attributed coverage so Sonar does not need coverage-bridge exclusions for legacy root scripts.

## Priority 4: Privacy And Parent Safety

- [ ] Add a way to delete one child's record without clearing all saved records.
- [ ] Clarify retention expectations for online score history, reset logs, and local fallback cache data.
- [ ] Decide whether explorer names should stay plain-text or eventually move to a parent-managed profile model.
- [ ] Decide whether the parent reset flow should move from a browser prompt to a dedicated form with clearer confirmation and error handling.

## Priority 5: Testing And Operations

- [ ] Add broader frontend smoke coverage for page load, record lookup, story mode progression, and reset behavior.
- [ ] Add browser-level verification for desktop and mobile layout/interaction paths.
- [ ] Keep `backend/scripts/smoke-live-backend.ts` aligned whenever schema or score flow changes.
- [ ] Keep the Render backend build aligned with the backend dependency model. PR 29 switches `render.yaml` to `npm install --include=dev && npm run build` so TypeScript compilation still sees `@types/*` after PR 28 moved them to `devDependencies`.
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

1. **Backend complexity** — split `saveAuthoritativeScore()` in `attempt.service.ts:560` (complexity 25) as the first step of the broader `attempt.service.ts` decomposition.
2. **Frontend complexity** — refactor `renderQuestion()` in `app.js:1243` (complexity 56), the single largest Sonar issue in the codebase.
3. **Optional chaining sweep** — replace the 9 S6582 optional-chaining opportunities across `app.js`, `scoreboard.js`, and `gamification.js`. Low risk, measurable Sonar improvement.
4. **Decide the reset route security model** — unblocks the API spec update and any future auth change on that route.
