# Backlog

This file tracks open work only. Completed items should stay here only if they still explain an active dependency or decision.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- The Sonar issue backlog is cleared on `master` after the March 27-28, 2026 cleanup wave.
- GitHub Pages remains the frontend host for now, with a lightweight JS frame-busting fallback as defense in depth only.
- Strict style CSP is live on `master` with `style-src 'self'`.
- Local trusted coverage on `master` is now above target at `88.84%` overall lines and `72.74%` overall branches (`263` tests passing under `npm.cmd run test:coverage` on March 28, 2026).
- `cd backend && npm.cmd run coverage:report` is now the standard local summary step after coverage waves.
- Thin infra wrappers are intentionally low-priority by default: `express.d.ts` is a no-test file, `firebase.ts`, `supabase.ts`, and `logger.ts` remain accepted wrapper gaps unless behavior grows, and `server.ts` / `not-found.ts` only need direct tests if they pick up meaningful logic.

Recent merged progress that still matters for planning:

- March 27-28, 2026 PRs removed the remaining open Sonar issues across frontend runtime files, backend support files, test helpers, and the live smoke script.
- March 28-29, 2026 PRs added source-attributed frontend coverage for `question-bank.js` and `frame-bust.js`, plus deeper runtime coverage for `scoreboard.js`, `app.js`, and `gamification.js`.
- March 29, 2026 PR `#110` added repeatable LCOV reporting so coverage waves can compare current totals and lowest-coverage files consistently.
- March 29, 2026 PR `#109` merged the Privacy & Parent Safety implementation plan in `docs/plans/privacy-parent-safety.md`; future Priority 4 work should use that plan as the starting point rather than reopening the same discovery scope.
- March 29, 2026 Priority 4 Phase 0 ADRs merged: `docs/decisions/explorer-name-model.md`, `docs/decisions/data-retention.md`, `docs/decisions/data-processing-agreements.md`, `docs/decisions/data-breach-response.md`. Implementation proceeds in 6 further PRs per the approved plan.
- March 29, 2026 PR `#117` updated `CONTRIBUTING.md` for cold-start readiness, including the manual review/approval rules, reviewer-prefix direction table, Windows `npm.cmd` note, first-time Supabase setup, and the explicit behind-`master` rebase flow.
- March 27-28, 2026 PRs also aligned hosting/security docs and kept the GitHub Pages frame-busting fallback decision current.
- March 28-29, 2026 docs updates also captured the current PR review automation status, comment-prefix convention, approval semantics, and remote branch hygiene workflow in `CONTRIBUTING.md`.

Use these docs as the durable sources of truth:

- `docs/architecture.md`
- `docs/backend-api-spec.md`
- `docs/decisions/frontend-header-security.md`
- `docs/decisions/reset-route.md`
- `docs/decisions/explorer-name-model.md`
- `docs/decisions/data-retention.md`
- `docs/decisions/data-processing-agreements.md`
- `docs/decisions/data-breach-response.md`
- `docs/plans/privacy-parent-safety.md`
- `CONTRIBUTING.md`

## Priority 1: Security Hardening

- [ ] If a header-capable host or proxy is chosen later, add real CSP reporting and frame-ancestor protection there.

## Priority 2: Documentation And Repo Hygiene

- [ ] Keep `docs/backend-api-spec.md`, `backend/README.md`, and `docs/decisions/frontend-header-security.md` aligned when the reset flow, hosting model, frame-busting fallback, or smoke process changes.
- [ ] Keep the docs in `docs/` purpose-specific, use `docs/backlog.md` for live planning, and delete temporary planning files instead of letting them become stale history.

## Priority 3: Code Quality And Maintainability

- [ ] Keep overall trusted coverage above `80%` and spend new test work on the highest-risk remaining behavior gaps rather than low-value padding.
  Current local baseline on `master` is `88.84%` overall line coverage and `72.74%` overall branch coverage as of March 28, 2026.
- [ ] Target the biggest remaining runtime coverage gaps first: `scoreboard.js` (`83.20%` lines / `66.67%` branches), `app.js` (`83.26%` lines / `66.42%` branches), and `gamification.js` (`89.07%` lines / `74.91%` branches).
- [ ] Keep any future frontend harness changes source-attributed rather than eval-driven so new coverage remains honest and stable in Sonar.
- [ ] Use `cd backend && npm.cmd run coverage:report` after each coverage wave and include the changed file-level summary in the PR thread; when comparing two local runs, use `-- --baseline <lcov-path>`.
- [ ] Treat thin infra wrappers as low-value by default: accept `express.d.ts` as an intentional no-test file, keep `firebase.ts`, `supabase.ts`, and `logger.ts` as accepted wrapper gaps unless behavior grows, and only add direct tests for `server.ts` / `not-found.ts` if they pick up meaningful logic.

## Priority 4: Privacy And Parent Safety

- [ ] Implement per-child deletion (`DELETE /api/v1/admin/players/:playerName/records`) so one child's records can be removed without clearing all saved data.
- [ ] Turn the retention plan into implementation, including a durable `last_active_at` signal for score retention and a cleanup mechanism that matches the documented policy.
- [ ] Capture the explorer-name model decision as a durable ADR and add the chosen guardrails for name input.
- [ ] Replace the browser prompt-based parent reset flow with a dedicated parent controls panel that can also host deletion/export actions cleanly.
- [ ] Publish a privacy policy and choose the consent/operator-information approach required to ship it responsibly.

## Priority 5: Testing And Operations

- [ ] Add the next frontend behavior coverage wave for the remaining highest-value `gamification.js` overlay/finale branches and any residual `app.js` timer/result-transition edges that still show up in `coverage:report`.
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

Priority 4 is now in active implementation. Proceed in PR order:

1. **PR #2 (`claude/p4-phase1-privacy-policy`)** — `privacy.html` + consent notice + name validation (frontend only, no backend changes).
2. **PR #3 (`claude/p4-phase2-delete-backend`)** — Schema migration (`last_active_at`) + `deletePlayerRecords` service + `DELETE /api/v1/admin/players/:playerName/records` route + tests.
3. **PR #4 (`claude/p4-phase2-delete-frontend`)** — Temporary `window.prompt` UI for per-child deletion + frontend tests.
4. **PR #5 (`claude/p4-phase3-cleanup`)** — Cleanup endpoint + GitHub Actions cron + localStorage TTL + tests.
5. **PR #6 (`claude/p4-phase4-export-backend`)** — Data export endpoint + backend tests.
6. **PR #7 (`claude/p4-phase4-parent-controls`)** — Parent Controls panel + remove old prompts + frontend tests.

Owner action required before PR #2 is made public:
- Fill in operator name and contact email in `privacy.html`.
- Accept Supabase, Render, and Firebase DPAs (see `docs/decisions/data-processing-agreements.md`).
