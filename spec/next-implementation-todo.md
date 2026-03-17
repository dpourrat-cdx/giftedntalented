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
- Add a visible Supabase health / sync state for parents so device-only fallback is easier to understand.
- Add stronger validation and normalization for player names before remote writes.
- Add a clear parent-facing explanation of when scores are local-only versus synced online.
- Add a parent-facing recovery action for stale local cache, such as `Clear this device cache`.

## Priority 2: Product Improvements

- Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- Move storyline packs out of the main JS bundle into dedicated content files or JSON for easier writing and review.
- Add a story-content validation helper that checks mission text length, ending length, and missing story beats before deploy.
- Give Story Only mode its own finale/report path instead of reusing the score-banded results screen.
- Decide whether Story Only mode should persist as a remembered parent preference on the device.
- Add a child-friendly rocket build summary card on results that shows all unlocked parts together.
- Add a tappable lightbox or slideshow mode for the new end-of-story gallery.
- Add gallery captions that can optionally include short story snippets, not just mission labels and score stats.
- Add optional sound effects and a mute control for mission rewards and launch moments.
- Add a progress-resume feature so a child can continue an unfinished mission on the same device.
- Add a parent export or printable summary for mission results and missed-question review.
- Add a parent settings area to change the reset PIN without editing SQL manually.
- Add score-band-specific ending artwork so the final scene matches `Excellent`, `Great Job`, `Nice Work`, `Good Effort`, or `Keep Trying`.
- Add support for mission-specific introduction artwork so future storylines can choose per-mission visuals, not only intro and ending art.
- Add image optimization and size budgeting for story artwork so mobile loads stay fast on GitHub Pages.
- Add a parent-friendly story review/download view that exports the active storyline text and artwork references together.
- Add the remaining mission-complete artworks so every mission has its own final reward scene without reused placeholders.

## Priority 3: Engineering Quality

- Add an automated browser smoke test suite for:
  - start flow and name entry
  - introduction artwork rendering
  - ending artwork rendering
  - responsive ending-art source selection between phone and desktop
  - mission introductions, mission updates, and mission-complete modals
  - story-only mode progression
  - timer pause/resume behavior while modals are visible
  - mission routing to the next unfinished mission
  - completed-mission sidebar markers
  - mobile modal action visibility
  - mobile intro and ending story layout
  - Explorer Record behavior when Supabase is available versus unavailable
  - scoreboard, results, and Mission Debrief
- Add a small build or release script to bump asset versions automatically before deploys.
- Centralize repeated mission and reward mapping logic so story, gamification, and UI all read from the same source.
- Add linting and formatting checks that run before push.
- Add a lightweight deployment checklist for GitHub Pages plus Supabase schema updates.
- Add a content snapshot test that ensures the spec review file stays in sync with the active storyline pack.
- Add a migration verification checklist for Supabase RPC/schema changes so frontend and database do not drift.

## Priority 4: Defensive Frontend Improvements

- Add a strict Content Security Policy that matches the actual assets the app loads.
- Add security headers where GitHub Pages allows them or document a move behind a host that supports them.
- Review all `innerHTML` render paths and replace them with safer DOM construction where practical.
- Add feature flags or environment guards so debug-friendly browser globals are not exposed more than necessary.
- Audit modal accessibility for focus trapping, keyboard dismissal rules, and screen-reader announcement order.
- Review the new parent-area toggle controls for keyboard accessibility and accidental child activation.
- Add `img` loading/fallback behavior for story artwork so the introduction and ending still look good if an asset is missing or fails to load.
- Add explicit timeout handling and retry/backoff for Supabase lookups so the Explorer Record does not depend on browser-specific fetch timing.

## Suggested Delivery Order

1. Secure score submission and reset flow.
2. Lock down score lookup privacy and local-cache fallback UX.
3. Add automated tests, migration checks, and release/version tooling.
4. Improve parent controls, privacy UX, and sync visibility.
5. Add new player-facing features and story/artwork tooling.

## Done Definition For This Backlog

- Security-critical items are removed from the browser and enforced server-side.
- Parent and child data exposure is reduced.
- The app has repeatable verification before deploy.
- Future feature work can build on a documented and safer foundation.
