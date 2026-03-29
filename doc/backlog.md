# Backlog

This file tracks open work only. Completed items should stay here only if they still explain an active dependency or decision.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- The Sonar issue backlog is cleared on `master` after the March 27-28, 2026 cleanup wave.
- GitHub Pages remains the frontend host for now, with a lightweight JS frame-busting fallback as defense in depth only.
- Strict style CSP is live on `master` with `style-src 'self'`.
- Local trusted coverage on `master` is now above target at `86.85%` overall lines (`246` tests passing under `npm.cmd run test:coverage` on March 28, 2026).

Recent merged progress that still matters for planning:

- March 27-28, 2026 PRs removed the remaining open Sonar issues across frontend runtime files, backend support files, test helpers, and the live smoke script.
- March 28, 2026 PRs added source-attributed frontend coverage for `question-bank.js` and `frame-bust.js`, plus smoke/behavior coverage for page load, record lookup, reset behavior, runtime helpers, and `app.js`.
- March 27-28, 2026 PRs also aligned hosting/security docs and kept the GitHub Pages frame-busting fallback decision current.
- March 28, 2026 docs updates also captured the current PR review automation, comment-prefix convention, and remote branch hygiene workflow in `CONTRIBUTING.md`.

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

- [ ] Keep overall trusted coverage above `80%` and spend new test work on the highest-risk remaining behavior gaps rather than low-value padding.
  Current local baseline on `master` is `86.85%` overall line coverage as of March 28, 2026.
- [ ] Target the biggest remaining runtime coverage gaps first: `scoreboard.js` (`78.03%` lines / `59.17%` branches), `app.js` (`82.12%` lines / `63.85%` branches), and `gamification.js` (`82.18%` lines / `72.79%` branches).
- [ ] Keep any future frontend harness changes source-attributed rather than eval-driven so new coverage remains honest and stable in Sonar.
- [ ] Add a repeatable coverage reporting step so each PR wave can show which files moved the global coverage number and which high-risk files still lag.
- [ ] Decide whether the thin infra wrappers (`firebase.ts`, `supabase.ts`, `logger.ts`, `server.ts`, `not-found.ts`, `express.d.ts`) should get direct tests, explicit exclusions, or remain accepted low-value gaps.

## Priority 4: Privacy And Parent Safety

Reference plan: `doc/priority-4-privacy-parent-safety-plan.md` (March 28, 2026 baseline for sequencing, GDPR/ePrivacy consent controls, and child-safety safeguards).

- [ ] Add a way to delete one child's record without clearing all saved records.
- [ ] Clarify retention expectations for online score history, reset logs, and local fallback cache data.
- [ ] Decide whether explorer names should stay plain-text or eventually move to a parent-managed profile model.
- [ ] Decide whether the parent reset flow should move from a browser prompt to a dedicated form with clearer confirmation and error handling.

## Priority 5: Testing And Operations

- [ ] Add the next frontend behavior coverage wave for the remaining `scoreboard.js` parent/reset/replay branches and the highest-value `app.js` timer/result-transition branches.
- [ ] Add deeper branch-focused coverage for `gamification.js`, especially queue/celebration transitions that still lag the rest of the frontend runtime.
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

1. **Coverage wave 1** - deepen `scoreboard.js` coverage first, especially the remaining parent/reset/replay and status-message branches where the file still trails the rest of the frontend runtime.
2. **Coverage wave 2** - add targeted `app.js` and `gamification.js` branch coverage for timer expiry, result transitions, overlay queue advancement, and finale paths that still sit below the new master baseline.
3. **Infra coverage decision** - decide whether `firebase.ts`, `supabase.ts`, `logger.ts`, `server.ts`, `not-found.ts`, and `express.d.ts` deserve direct tests or should simply remain accepted thin-wrapper gaps.
4. **Browser verification** - add desktop/mobile browser-level checks for the main learner and parent flows once the higher-value runtime coverage is in place.
5. **Priority 4 privacy kickoff** - execute Sprint 1 from `doc/priority-4-privacy-parent-safety-plan.md` to lock retention decisions, cookie/storage inventory, and child identity model direction before feature implementation.
