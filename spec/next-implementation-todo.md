# Next Implementation Todo

## Goal

This backlog captures the next high-value work for the Captain Nova app, with security hardening first because the site is public on the internet.

## Priority 0: Security Hardening

- Remove the hardcoded reset PIN from the frontend and move all reset authorization server-side.
- Replace browser-trusted score inserts with a trusted backend flow or Supabase Edge Function.
- Stop allowing anonymous callers to submit arbitrary score, percentage, and elapsed-time payloads directly to the `test_scores` table.
- Stop allowing anonymous name-based score lookups that can expose children's saved performance by brute-forcing names.
- Rotate the current reset PIN and any related secrets after the secure reset flow is deployed.
- Add rate limiting or abuse throttling for any public score or reset endpoint.
- Add an audit trail for reset events and remote score writes.

## Priority 1: Privacy And Safety

- Minimize stored child data and define retention rules for local and remote records.
- Add a parent-facing privacy note explaining what is stored locally and what is stored remotely.
- Add a way to delete one child's record without clearing everyone.
- Add a visible Supabase health / sync state for parents so silent fallback is easier to understand.
- Add stronger validation and normalization for player names before remote writes.

## Priority 2: Product Improvements

- Add a parent settings area to change the reset PIN without editing SQL manually.
- Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- Move storyline packs out of the main JS bundle into dedicated content files or JSON for easier writing and review.
- Add a story-content validation helper that checks mission text length, ending length, and missing story beats before deploy.
- Add a child-friendly rocket build summary card on results that shows all unlocked parts together.
- Add a mission recap view that lets the child revisit completed rocket parts after each mission.
- Add optional sound effects and a mute control for mission rewards and launch moments.
- Add a progress-resume feature so a child can continue an unfinished mission on the same device.
- Add a parent export or printable summary for mission results and missed-question review.

## Priority 3: Engineering Quality

- Add an automated browser smoke test suite for:
  - start flow and name entry
  - mission introductions, mission updates, and mission-complete modals
  - timer pause/resume behavior while modals are visible
  - mission routing to the next unfinished mission
  - completed-mission sidebar markers
  - scoreboard, results, and Mission Debrief
- Add a small build or release script to bump asset versions automatically before deploys.
- Centralize repeated mission and reward mapping logic so story, gamification, and UI all read from the same source.
- Add linting and formatting checks that run before push.
- Add a lightweight deployment checklist for GitHub Pages plus Supabase schema updates.

## Priority 4: Defensive Frontend Improvements

- Add a strict Content Security Policy that matches the actual assets the app loads.
- Add security headers where GitHub Pages allows them or document a move behind a host that supports them.
- Review all `innerHTML` render paths and replace them with safer DOM construction where practical.
- Add feature flags or environment guards so debug-friendly browser globals are not exposed more than necessary.
- Audit modal accessibility for focus trapping, keyboard dismissal rules, and screen-reader announcement order.

## Suggested Delivery Order

1. Secure score submission and reset flow.
2. Lock down score lookup privacy.
3. Add automated tests and release/version tooling.
4. Improve parent controls and privacy UX.
5. Add new player-facing features.

## Done Definition For This Backlog

- Security-critical items are removed from the browser and enforced server-side.
- Parent and child data exposure is reduced.
- The app has repeatable verification before deploy.
- Future feature work can build on a documented and safer foundation.
