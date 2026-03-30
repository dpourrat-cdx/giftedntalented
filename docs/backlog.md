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

## Priority 2: Privacy And Parent Safety

Claude owns this priority. Codex should stay out of that implementation track unless explicitly redirected.

- [ ] Treat the current privacy-policy step as a draft/WIP release only; before calling Priority 2 complete, replace placeholder operator/contact details with owner-provided values and reconcile the live policy wording with the actually shipped controls.
- [ ] Before any privacy-policy page is published on GitHub Pages, get the real operator name and working contact email from the repo owner, add them to `privacy.html`, and restore the privacy-policy links in the consent notice and footer.
- [ ] Implement per-child deletion (`DELETE /api/v1/admin/players/:playerName/records`) so one child's records can be removed without clearing all saved data.
- [ ] Turn the retention plan into implementation, including a durable `last_active_at` signal for score retention and a cleanup mechanism that matches the documented policy.
- [ ] Capture the explorer-name model decision as a durable ADR and add the chosen guardrails for name input.
- [ ] Replace the browser prompt-based parent reset flow with a dedicated parent controls panel that can also host deletion/export actions cleanly.
- [ ] Publish a privacy policy and choose the consent/operator-information approach required to ship it responsibly.

## Priority 3: Testing And Operations

- [ ] Add backend observability for unusual public write bursts, repeated reset failures, and backend error spikes, starting with request/error telemetry and searchable logs rather than child-level product analytics.

## Priority 4: Android And Accounts

- [ ] Choose the Android delivery approach for the current app and document the path to Google Play release, including packaging strategy, app identity/assets, signing, privacy/support metadata, internal testing, and production rollout steps.
- [ ] Define the minimum Android-ready product changes needed for Play release, including mobile install/runtime behavior, offline/failure handling expectations, and any app-shell or hosting changes required by the chosen packaging approach.
- [ ] Design parent account ownership around passwordless email-code login using the existing Supabase stack, with no password flow.
- [ ] Define what parent login unlocks, including cross-device score retrieval, future parent controls, and any account-bound export or management actions.
- [ ] Keep score tracking server-side for monitoring and operations even without login, but do not let children retrieve historical scores later unless a parent account flow is in place.
- [ ] Separate child play from parent account actions clearly in the UX so children can play without credentials while parent-only retrieval and management stay behind the email-code flow.

## Priority 5: Product And Content Improvements

- [ ] Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- [ ] Move storyline packs out of the main JS bundle into dedicated content files or JSON.
- [ ] Add a story-content validation helper for mission text, endings, and artwork references.
- [ ] Give Story Only mode its own finale or report path instead of reusing the score-banded result screen.
- [ ] Add a parent export or printable summary for mission results and missed-question review.
- [ ] Add the remaining mission-complete artworks and gallery improvements.

## Next Recommended Delivery Slice

Priority 2 stays on Claude's side. The next recommended Codex-only slice is:

1. **Priority 4: Android and account planning** - define the Google Play delivery path and parent passwordless account model before implementation work starts.
