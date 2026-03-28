# Next Implementation Todo

This file is the live backlog only. Completed work should not stay here unless it still explains an open dependency or decision.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- Sonar critical and major issues are now cleared on `master`; the remaining Sonar work is minor-only.
- The reset endpoint decision is now codified: keep the current parent-facing PIN flow for `POST /api/v1/admin/scores/reset`.
- Strict style CSP is live on `master` (`style-src 'self'`), and `spec/frontend-header-security-plan.md` records the remaining GitHub Pages header limitations and hosting options.
- GitHub Pages remains the frontend host for now, with a lightweight JS frame-busting fallback added as defense in depth only; real response-header protection still requires a header-capable host or proxy.
- Durable architecture and process details belong in:
  - `spec/architecture.md`
  - `CONTRIBUTING.md`
  - `spec/backend-api-spec.md`

## Priority 1: Security Hardening

- [x] Decide whether to accept GitHub Pages' response-header limits, add a proxy/CDN, or move the frontend to a header-capable host so clickjacking protection and CSP reporting can be enforced in real headers. Chosen: stay on GitHub Pages for now and accept the header limits until we move to a header-capable host or proxy.
- [x] If GitHub Pages remains the host, decide whether to add a lightweight JS frame-busting fallback or explicitly accept the residual clickjacking risk in docs. Chosen: add a lightweight JS fallback as defense in depth.
- [ ] If a header-capable host or proxy is chosen, add real CSP reporting and frame-ancestor protection there.

## Priority 2: Documentation And Repo Hygiene
- [ ] Keep `spec/backend-api-spec.md`, `backend/README.md`, and `spec/frontend-header-security-plan.md` aligned when the reset flow, hosting model, frame-busting fallback, or smoke process changes.
- [x] Refresh `spec/backend-api-spec.md` and `backend/README.md` to match the current Render build command, the GitHub Pages hosting decision, and the lightweight frame-busting fallback documented in `spec/frontend-header-security-plan.md`.

## Priority 3: Code Quality And Maintainability

Current slice in progress: minor Sonar cleanup and frontend coverage attribution after the major-issue sweep.

SonarCloud currently reports 0 open critical issues and 0 open major issues. The remaining work is 99 open minor issues, mostly grouped around:

- [x] Clear the medium Sonar cleanup in `gamification.js` and `scoreboard.js`: split the celebration click handler and the scoreboard reset-mode flow into focused helpers.
- [x] Clear a low-risk `app.js` `replaceAll` batch in `escapeHtml()` so the fixed-string character escapes stop using repeated global regex replacements.
- [x] Clear the remaining medium `.indexOf()` follow-ups in `app.js` and `backend/scripts/smoke-live-backend.ts`.
- [x] Clear the question-bank array-construction cleanup in the logical question builders by replacing the rotating slice/concat windows with a small shared helper.

- `javascript:S7764` globalThis opportunities in `app.js`, `gamification.js`, `scoreboard.js`, and frontend test helpers
- `javascript:S7781` replaceAll opportunities in `app.js` and frontend test helpers
- `javascript:S2486` and `javascript:S7723` array-construction cleanup in `app.js`, `question-bank.js`, and helpers
- `typescript:S6551`, `typescript:S7781`, `javascript:S6653`, `javascript:S7778`, and `typescript:S4323` smaller readability/typing cleanups in the frontend helpers and backend utilities
- `javascript:S7758`, `javascript:S7786`, `javascript:S7735`, and `typescript:S4325` isolated one-off cleanups
- [ ] Deduplicate shared score-row mapping logic between `attempt.service.ts` and `score.service.ts`.
- [ ] Review whether schema-cache fallback handling can now be simplified or centralized.
- [ ] Review the double "old best" lookup path in score persistence and simplify it if the RPC already owns that comparison.
- [ ] Broaden frontend source-attributed coverage so Sonar does not need coverage-bridge exclusions for legacy root scripts.
  Current bridge still includes `frame-bust.js`, because the classic pre-app browser script does not yet attribute coverage truthfully through the current Vitest frontend harness.

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

1. **Minor Sonar sweep** - tackle the remaining 99 minor issues in the biggest clusters first (`S7764`, `S7781`, `S2486`/`S7723`), because these are still low-risk and easy to parallelize.
2. **Frontend coverage attribution** - extend the source-attributed pattern beyond `shared-random.js` so more legacy-root script PRs can shed coverage bridges over time.
3. **CSP reporting / clickjacking** - use `spec/frontend-header-security-plan.md` to decide the hosting and reporting path now that strict style CSP is live.
