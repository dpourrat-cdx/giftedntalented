# Next Implementation Todo

This file is the live backlog only. Completed work should not stay here unless it still explains an open dependency or decision.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- CI, SonarCloud, Dependabot, branch protection, and the live smoke runner are already in place.
- Backend schema is hardened: SECURITY DEFINER function lockdown (PR 21) and RLS with service-role-only policies (PR 22) are both live.
- The live API contract is documented in `spec/backend-api-spec.md` (PR 23) and `backend/README.md` (PR 24).
- The review-card `innerHTML` sinks have been replaced with DOM construction (PR 25), covered by targeted frontend tests (PR 26).
- Sonar critical and major issues are now cleared on `master`; the remaining Sonar work is minor-only.
- The remaining security sequence is tracked in `spec/security-rollout-plan.md`.
- The reset-endpoint decision brief lives in `spec/reset-security-decision-brief.md`.
- The reset endpoint decision is now codified: keep the current parent-facing PIN flow for `POST /api/v1/admin/scores/reset`.
- Strict style CSP is now live on `master` (`style-src 'self'`), and the frontend header-security decision brief recommends staying on GitHub Pages unless we move to a header-capable host/proxy for real response-header enforcement.
- The remaining gamification panel renderers now build DOM nodes directly instead of interpolated `innerHTML`.
- Durable architecture and process details belong in:
  - `spec/architecture.md`
  - `CONTRIBUTING.md`
  - `spec/backend-api-spec.md`
- `CONTRIBUTING.md` is the source of truth for cross-agent review expectations: PR comments should explicitly call in Claude/Codex for review, and new Sonar issues must be fixed or logged here before a PR is considered ready.

## Priority 1: Security Hardening

- [x] Codify the reset endpoint decision as the current parent-facing PIN flow and update the API spec accordingly.
- [x] Audit inline style generation in frontend JS as a prerequisite to removing `'unsafe-inline'` from `style-src`. The last app-side blocker was the mini rocket fuel fill renderer, now converted from an inline `style` attribute to discrete CSS level classes.
- [x] Remove `'unsafe-inline'` from `style-src` once inline style generation is eliminated.
- [x] Add clickjacking protection planning for the GitHub Pages frontend. The new decision brief in `spec/frontend-header-security-plan.md` recommends staying on GitHub Pages unless we move to a header-capable host/proxy.
- [x] Add a CSP `report-to` or equivalent reporting endpoint plan. The same decision brief records that real CSP reporting should wait for a host or proxy that can emit CSP response headers.
- [x] Continue replacing remaining `innerHTML` render paths with safer DOM construction. The gamification panel renderers now build DOM nodes directly instead of interpolated `innerHTML`, and the shared panel/overlay helpers keep the safer path below Sonar's duplication gate.
- [ ] Extract `secureRandomIndex` into a shared frontend utility once the surrounding frontend scripts are ready for that cleanup.

## Priority 2: Documentation And Repo Hygiene

- [x] Add a lightweight post-deploy checklist or automation step that runs `npm run smoke:live` after backend releases. The checklist now lives in `backend/README.md`.

## Priority 3: Code Quality And Maintainability

Current slice in progress: minor Sonar cleanup after the merged optional-chaining, nested-ternary, and smoke-runner wave (PRs 54, 56, 58, 59, 61, and 62).

SonarCloud currently reports 0 open critical issues and 0 open major issues. The remaining work is 99 open minor issues, mostly grouped around:

- `javascript:S7764` globalThis opportunities in `app.js`, `gamification.js`, `scoreboard.js`, and frontend test helpers
- `javascript:S7781` replaceAll opportunities in `app.js` and frontend test helpers
- `javascript:S2486` and `javascript:S7723` array-construction cleanup in `app.js`, `question-bank.js`, and helpers
- `typescript:S6551`, `typescript:S7781`, `javascript:S6653`, `javascript:S7778`, and `typescript:S4323` smaller readability/typing cleanups in the frontend helpers and backend utilities
- `javascript:S7758`, `javascript:S7786`, `javascript:S7735`, and `typescript:S4325` isolated one-off cleanups
- [ ] Deduplicate shared score-row mapping logic between `attempt.service.ts` and `score.service.ts`.
- [ ] Review whether schema-cache fallback handling can now be simplified or centralized.
- [ ] Review the double "old best" lookup path in score persistence and simplify it if the RPC already owns that comparison.
- [ ] Broaden frontend source-attributed coverage so Sonar does not need coverage-bridge exclusions for legacy root scripts.
- [x] Extract `secureRandomIndex` into a shared frontend utility and wire the browser scripts to use it.

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

1. **Minor Sonar sweep** - tackle the remaining 99 minor issues in the biggest clusters first (`S7764`, `S7781`, `S2486`/`S7723`), because these are still low-risk and easy to parallelize.
2. **Frontend coverage attribution** - keep improving source-attributed frontend coverage so legacy-root script PRs stay easy to merge without extra coverage bridges.
3. **CSP reporting / clickjacking** - use `spec/frontend-header-security-plan.md` to decide the hosting and reporting path now that strict style CSP is live.
