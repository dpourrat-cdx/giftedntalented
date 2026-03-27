# Next Implementation Todo

This file is the live backlog only. Completed work should not stay here unless it still explains an open dependency or decision.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- CI, SonarCloud, Dependabot, branch protection, and the live smoke runner are already in place.
- Backend schema is hardened: SECURITY DEFINER function lockdown (PR 21) and RLS with service-role-only policies (PR 22) are both live.
- The live API contract is documented in `spec/backend-api-spec.md` (PR 23) and `backend/README.md` (PR 24).
- The review-card `innerHTML` sinks have been replaced with DOM construction (PR 25), covered by targeted frontend tests (PR 26).
- Sonar critical cognitive-complexity issues are now cleared on `master`.
- The remaining security sequence is tracked in `spec/security-rollout-plan.md`.
- The reset-endpoint decision brief lives in `spec/reset-security-decision-brief.md`.
- Durable architecture and process details belong in:
  - `spec/architecture.md`
  - `CONTRIBUTING.md`
  - `spec/backend-api-spec.md`
- `CONTRIBUTING.md` is the source of truth for cross-agent review expectations: PR comments should explicitly call in Claude/Codex for review, and new Sonar issues must be fixed or logged here before a PR is considered ready.

## Priority 1: Security Hardening

- [ ] Decide whether `POST /api/v1/admin/scores/reset` should stay public-parent reachable or become owner-only with `X-Admin-Key`. See `spec/reset-security-decision-brief.md` for the current behavior, options, tradeoffs, and recommendation.
- [x] Audit inline style generation in frontend JS as a prerequisite to removing `'unsafe-inline'` from `style-src`. Progress: current frontend audit isolated the last app-side blocker to the mini rocket fuel fill renderer; this slice converts it from an inline `style` attribute to discrete CSS level classes.
- [ ] Remove `'unsafe-inline'` from `style-src` once inline style generation is eliminated.
- [x] Add clickjacking protection planning for the GitHub Pages frontend. Planning now lives in `spec/frontend-header-security-plan.md`, which records the GitHub Pages limitation and the options: explicit risk acceptance, JS frame-busting fallback, or a move to header-capable hosting.
- [x] Add a CSP `report-to` or equivalent reporting endpoint plan. The same plan doc now records that real CSP reporting should wait for a host or proxy that can emit CSP response headers.
- [ ] Continue replacing remaining `innerHTML` render paths with safer DOM construction. The gamification panel renderers (`MissionPanel`, `OverallProgressBar`, `RocketProgressVisual`, `CelebrationManager`) still use `innerHTML` with integer/constant-only interpolation - safe today but the natural next pass.
- [ ] Extract `secureRandomIndex` into a shared frontend utility once the surrounding frontend scripts are ready for that cleanup.

## Priority 2: Documentation And Repo Hygiene

- [ ] Add a lightweight post-deploy checklist or automation step that runs `npm run smoke:live` after backend releases.
- [ ] Update `spec/backend-api-spec.md` reset-route section once the security model for `POST /api/v1/admin/scores/reset` is decided.

## Priority 3: Code Quality And Maintainability

Current slice in progress: refreshing the backlog to match the live post-critical Sonar state and queue the remaining major issues by lowest-risk sweep order.

SonarCloud currently reports 0 open critical issues and 15 open major issues. Current sweep order:

- [ ] Replace the remaining optional-chaining opportunities (9 Sonar MAJOR `S6582`):
  - `app.js:214`
  - `app.js:326`
  - `app.js:687`
  - `app.js:723`
  - `app.js:767`
  - `app.js:1949`
  - `app.js:2001`
  - `gamification.js:568`
  - `scoreboard.js:837`
- [ ] Extract the remaining nested ternaries (5 Sonar MAJOR `S3358` issues):
  - `app.js:1341`
  - `app.js:1344`
  - `scoreboard.js:336`
  - `question-bank.js:344`
  - `question-bank.js:1000`
- [ ] Modernize `backend/scripts/smoke-live-backend.ts:351` to use top-level await instead of a promise chain (Sonar MAJOR `typescript:S7785`).
- [ ] Replace remaining nested template literals - `app.js:1177` and `scoreboard.js:625-626` were resolved in PR 28; confirm via Sonar after the next scan that no more remain.
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

1. **Optional chaining sweep** - replace the 9 remaining `S6582` issues across `app.js`, `scoreboard.js`, and `gamification.js`. Lowest risk and easiest to parallelize.
2. **Nested ternary sweep** - extract the 5 remaining `S3358` sites in `app.js`, `scoreboard.js`, and `question-bank.js`.
3. **Gamification DOM hardening** - replace the remaining `innerHTML` renderers in `gamification.js` and pair the cleanup with targeted frontend coverage.
4. **Reset route decision** - use `spec/reset-security-decision-brief.md` to choose the public-parent flow or owner-only `X-Admin-Key` path before coding the route change.
