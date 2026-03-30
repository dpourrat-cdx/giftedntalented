# Backlog

This file tracks open work only. Completed items should stay here only if they still explain an active dependency or decision.

## Current Context

- The live score flow is attempt-based and backend-owned.
- The legacy `POST /players/:playerName/record` write path is intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- The Sonar issue backlog is cleared on `master`.
- GitHub Pages remains the frontend host for now, with a lightweight JS frame-busting fallback as defense in depth only.
- Strict style CSP is live on `master` with `style-src 'self'`.
- Local trusted coverage on `master` is above target. After PR `#130`, a fresh March 29, 2026 local rerun produced about `92.05%` overall lines / `77.44%` overall branches under `npm.cmd run test:coverage`. The lightweight `coverage:report` summary still trails slightly (`91.96%` / `77.32%`) and its per-file summary can lag the raw Vitest table, so use the raw `test:coverage` output as the planning baseline when the two disagree.
- SonarCloud's project dashboard may still show a lower overall number because it is a broader dashboard metric than the local runtime-focused planning summary.
- Thin infra wrappers are intentionally low-priority by default: `express.d.ts` is a no-test file, `firebase.ts`, `supabase.ts`, and `logger.ts` remain accepted wrapper gaps unless behavior grows, and `server.ts` / `not-found.ts` only need direct tests if they pick up meaningful logic.
- A March 29, 2026 live-browser pass on GitHub Pages exercised learner start, leaderboard lookup/reset-cancel entry, and Story Only entry without surfacing a clear blocker, so browser verification should now move behind the next narrow code or ops slice until another major UI change lands.
- A March 30, 2026 Markdown coherence pass found a small amount of non-product doc drift; keep `README.md`, `docs/README.md`, `docs/architecture.md`, and `CONTRIBUTING.md` aligned on branch/worktree expectations and operational commands.

Only keep completed work here when it still affects what happens next:

- `docs/plans/privacy-parent-safety.md` and the accepted privacy ADRs remain the starting point for Priority 4. Do not reopen that discovery work.
- `CONTRIBUTING.md` is the source of truth for cold-start rules, review ownership, branch/worktree usage, approval semantics, and merge flow.
- `backend/scripts/smoke-live-backend.ts` is the existing end-to-end production check and should stay aligned with backend behavior changes.

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
- [ ] Keep `README.md`, `docs/README.md`, and `docs/architecture.md` aligned with `CONTRIBUTING.md` whenever branch/worktree rules, Windows command guidance, or merge expectations change.

## Priority 3: Code Quality And Maintainability

- [ ] Keep overall trusted coverage above `80%` and spend new test work on the highest-risk remaining behavior gaps rather than low-value padding.
  Current local baseline on `master` is about `92.05%` overall line coverage and `77.44%` overall branch coverage as of March 29, 2026.
- [ ] Target the biggest remaining meaningful runtime gaps first. The latest raw local rerun points at `scoreboard.js` (`88.88%` lines / `73.03%` branches) and `app.js` (`89.08%` lines / `73.57%` branches) as the main frontend runtime gaps; `gamification.js` is materially healthier at `93.58%` lines / `81.97%` branches.
- [ ] Keep any future frontend harness changes source-attributed rather than eval-driven so new coverage remains honest and stable in Sonar.
- [ ] Use `cd backend && npm.cmd run coverage:report` after each coverage wave and include the changed file-level summary in the PR thread; when comparing two local runs, use `-- --baseline <lcov-path>`.
- [ ] Treat thin infra wrappers as low-value by default: accept `express.d.ts` as an intentional no-test file, keep `firebase.ts`, `supabase.ts`, and `logger.ts` as accepted wrapper gaps unless behavior grows, and only add direct tests for `server.ts` / `not-found.ts` if they pick up meaningful logic.

## Priority 4: Privacy And Parent Safety

Claude owns Priority 4 execution. Codex should stay out of that implementation track unless explicitly redirected.

- [ ] Implement per-child deletion (`DELETE /api/v1/admin/players/:playerName/records`) so one child's records can be removed without clearing all saved data.
- [ ] Turn the retention plan into implementation, including a durable `last_active_at` signal for score retention and a cleanup mechanism that matches the documented policy.
- [ ] Capture the explorer-name model decision as a durable ADR and add the chosen guardrails for name input.
- [ ] Replace the browser prompt-based parent reset flow with a dedicated parent controls panel that can also host deletion/export actions cleanly.
- [ ] Publish a privacy policy and choose the consent/operator-information approach required to ship it responsibly.

## Priority 5: Testing And Operations

- [ ] Revisit `scoreboard.js` first and then any residual `app.js` timer/result-transition edges that still show up in the current local coverage report.
- [ ] Repeat browser-level verification when a major UI flow changes, but treat it as maintenance now that the latest live pass did not surface a clear blocker.
- [ ] Keep `backend/scripts/smoke-live-backend.ts` aligned whenever schema or score flow changes.
- [ ] Add backend observability for unusual public write bursts, repeated reset failures, and backend error spikes, starting with request/error telemetry and searchable logs rather than child-level product analytics.
- [ ] Decide whether long-lived observability should use Elastic / OpenSearch-backed log search and alerts or stay with a lighter hosted logging path, based on cost, maintenance burden, and the small current traffic profile.
- [ ] Review Render cold-start behavior and decide whether uptime mitigation is worth the cost.

## Priority 6: Product And Content Improvements

- [ ] Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- [ ] Move storyline packs out of the main JS bundle into dedicated content files or JSON.
- [ ] Add a story-content validation helper for mission text, endings, and artwork references.
- [ ] Give Story Only mode its own finale or report path instead of reusing the score-banded result screen.
- [ ] Add a parent export or printable summary for mission results and missed-question review.
- [ ] Add the remaining mission-complete artworks and gallery improvements.

## Next Recommended Delivery Slice

Priority 4 stays on Claude's side. The next recommended Codex-only slice is:

1. **Operations observability** - add the smallest credible backend telemetry slice first: structured request/error logging, a basic alert path for resets/write bursts/5xx spikes, and a decision memo on whether Elastic / OpenSearch is justified yet.
2. **Next coverage wave** - revisit `scoreboard.js` first and then any residual `app.js` edges, using the latest raw `npm.cmd run test:coverage` output as the planning baseline when it disagrees with `coverage:report`.
3. **Browser verification maintenance** - repeat the live desktop/mobile pass only after another meaningful UI change lands, or if a PR appears risky enough to justify it.
4. **Priority 4 coordination** - keep treating Privacy & Parent Safety as Claude-owned unless you explicitly redirect Codex into that lane.
