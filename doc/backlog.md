# Backlog

This file tracks open work only. Completed items should stay here only if they still explain an active dependency or decision.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- Sonar critical and major issues are cleared on `master`; the remaining Sonar work is minor-only.
- GitHub Pages remains the frontend host for now, with a lightweight JS frame-busting fallback as defense in depth only.
- Strict style CSP is live on `master` with `style-src 'self'`.

Use these docs as the durable sources of truth:

- `doc/architecture.md`
- `doc/backend-api-spec.md`
- `doc/decisions/frontend-header-security.md`
- `doc/decisions/reset-route.md`
- `CONTRIBUTING.md`

## Priority 1: Security Hardening

- [ ] If a header-capable host or proxy is chosen later, add real CSP reporting and frame-ancestor protection there.

## Priority 2: Documentation And Repo Hygiene

- [ ] Keep `doc/backend-api-spec.md`, `backend/README.md`, and `doc/decisions/frontend-header-security.md` aligned when the reset flow, hosting model, frame-busting fallback, or smoke process changes.
- [ ] Keep the docs in `doc/` purpose-specific and delete temporary planning files instead of letting them become stale history.

## Priority 3: Code Quality And Maintainability

- [ ] Broaden frontend source-attributed coverage so Sonar does not need coverage-bridge exclusions for legacy root scripts.
  Remaining bridge still includes `frame-bust.js`, and the eval-driven suites for `gamification.js`, `question-bank.js`, and `scoreboard.js` still need a separate harness slice before their exclusions can be removed.
- [ ] Continue the minor Sonar sweep in the biggest remaining clusters first.
  Current clusters already noted in repo work:
  - `javascript:S7764` globalThis opportunities
  - `javascript:S7781` replaceAll opportunities
  - `javascript:S2486` and `javascript:S7723` array-construction cleanup
  - smaller helper readability and typing rules in frontend helpers and backend utilities

## Priority 4: Privacy And Parent Safety

- [ ] Add a way to delete one child's record without clearing all saved records.
- [ ] Clarify retention expectations for online score history, reset logs, and local fallback cache data.
- [ ] Decide whether explorer names should stay plain-text or eventually move to a parent-managed profile model.
- [ ] Decide whether the parent reset flow should move from a browser prompt to a dedicated form with clearer confirmation and error handling.

## Priority 5: Testing And Operations

- [ ] Add broader frontend smoke coverage for page load, record lookup, story mode progression, and reset behavior.
- [ ] Add browser-level verification for desktop and mobile layout and interaction paths.
- [ ] Keep `backend/scripts/smoke-live-backend.ts` aligned whenever schema or score flow changes.
- [ ] Add alerting or monitoring for unusual public write bursts, repeated reset failures, and backend error spikes.
- [ ] Review Render cold-start behavior and decide whether uptime mitigation is worth the cost.

## Priority 6: Product And Content Improvements

- [ ] Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- [ ] Move storyline packs out of the main JS bundle into dedicated content files or JSON.
- [ ] Add a story-content validation helper for mission text, endings, and artwork references.
- [ ] Give Story Only mode its own finale or report path instead of reusing the score-banded result screen.
- [ ] Add a parent export or printable summary for mission results and missed-question review.
- [ ] Add the remaining mission-complete artworks and gallery improvements.

## Next Recommended Delivery Slice

1. **Frontend coverage attribution** - replace the remaining eval-driven legacy suites so more root scripts can lose their coverage bridges honestly.
2. **Minor Sonar sweep** - keep chipping away at the low-risk clusters in parallel.
3. **Hosting and header decision follow-through** - if GitHub Pages stops being sufficient, use `doc/decisions/frontend-header-security.md` to drive the move to a header-capable host or proxy.
