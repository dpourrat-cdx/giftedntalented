# Backlog

This file tracks open work only.

Use the durable docs for system details and settled decisions:

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

## Working Assumptions

- Privacy & Parent Safety remains Claude-owned unless explicitly redirected.

## Priority 1: Security Hardening

- [ ] If a header-capable host or proxy is chosen later, add real CSP reporting and frame-ancestor protection there.

## Priority 2: Documentation And Repo Hygiene

- [ ] Before any privacy-policy page is published on GitHub Pages, get the real operator name and working contact email from the repo owner and replace placeholders instead of shipping an incomplete public legal notice.

## Priority 3: Code Quality And Maintainability

- [ ] Keep any future frontend harness changes source-attributed rather than eval-driven so new coverage remains honest and stable in Sonar.
- [ ] Treat thin infra wrappers as low-value by default: accept `express.d.ts` as an intentional no-test file, keep `firebase.ts`, `supabase.ts`, and `logger.ts` as accepted wrapper gaps unless behavior grows, and only add direct tests for `server.ts` / `not-found.ts` if they pick up meaningful logic.

## Priority 4: Privacy And Parent Safety

Claude owns Priority 4 execution. Codex should stay out of that implementation track unless explicitly redirected.

- [ ] Treat the current privacy-policy step as a draft/WIP release only; before calling Priority 4 complete, replace placeholder operator/contact details with owner-provided values and reconcile the live policy wording with the actually shipped controls.
- [ ] Once the repo owner provides the operator name and contact email, add them to `privacy.html`, restore the privacy-policy link in the consent notice text, and restore the Privacy Policy footer link in `index.html`.
- [ ] Implement per-child deletion (`DELETE /api/v1/admin/players/:playerName/records`) so one child's records can be removed without clearing all saved data.
- [ ] Turn the retention plan into implementation, including a durable `last_active_at` signal for score retention and a cleanup mechanism that matches the documented policy.
- [ ] Capture the explorer-name model decision as a durable ADR and add the chosen guardrails for name input.
- [ ] Replace the browser prompt-based parent reset flow with a dedicated parent controls panel that can also host deletion/export actions cleanly.
- [ ] Publish a privacy policy and choose the consent/operator-information approach required to ship it responsibly.

## Priority 5: Testing And Operations

- [ ] Repeat browser-level verification when a major UI flow changes, but treat it as maintenance now that the latest live pass did not surface a clear blocker.
- [ ] Keep `backend/scripts/smoke-live-backend.ts` aligned whenever schema or score flow changes.
- [ ] Add backend observability for unusual public write bursts, repeated reset failures, and backend error spikes, starting with request/error telemetry and searchable logs rather than child-level product analytics.

## Priority 6: Product And Content Improvements

- [ ] Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- [ ] Move storyline packs out of the main JS bundle into dedicated content files or JSON.
- [ ] Add a story-content validation helper for mission text, endings, and artwork references.
- [ ] Give Story Only mode its own finale or report path instead of reusing the score-banded result screen.
- [ ] Add a parent export or printable summary for mission results and missed-question review.
- [ ] Add the remaining mission-complete artworks and gallery improvements.

## Next Recommended Delivery Slice

Priority 4 stays on Claude's side. The next recommended Codex-only slice is:

1. **Browser verification maintenance** - repeat the live desktop/mobile pass only after another meaningful UI change lands, or if a PR appears risky enough to justify it.
2. **Priority 4 coordination** - keep treating Privacy & Parent Safety as Claude-owned unless you explicitly redirect Codex into that lane.
