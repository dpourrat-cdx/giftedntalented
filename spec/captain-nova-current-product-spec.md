# Captain Nova Current Product Spec

## Overview

This document captures the current shipped behavior of the Captain Nova rocket mission app as it exists after the March 18 backend deployment and frontend API integration updates.

The product is a static, story-driven gifted practice site for children. It combines an 8-mission question flow, rocket-building rewards, per-child score tracking, and a parent-only control area.

## Product Goals

- Make gifted practice feel like a story-driven rocket mission instead of a worksheet.
- Keep the child flow simple, readable, and motivating.
- Let a child see only their own saved best record after typing their name.
- Preserve parent controls for restarting and resetting saved scores.

## Primary Users

- Child user:
  An 8-year-old completing Captain Nova's rocket missions.

- Parent or adult helper:
  An adult who may restart the mission, clear saved scores, or review missed questions.

## Current Experience

### Start Screen

- The hero area presents Mission Control branding and the Explorer Record card.
- The start panel shows briefing badges first.
- The story introduction appears before the child name prompt.
- The child enters an explorer name before starting Mission 1.
- The currently shipped story comes from the active storyline pack in `content.js`.
- The parent area includes a `Story Only` toggle for narrative-only play.

### Mission Structure

- The game contains 8 missions mapped to the 8 question sections.
- Each mission has:
  - a dedicated introduction shown in a blocking mission-introduction modal
  - a midpoint update shown as a persistent celebration overlay
  - a reward/debrief shown when the mission is completed and the rocket part is earned
- The current storyline is the cinematic Captain Nova arc centered on the Luma-7 beacon.

- Mission mapping:
  - Mission 1: Verbal Challenge -> Rocket Base
  - Mission 2: Math Challenge -> Rocket Body
  - Mission 3: Pattern Vision -> Rocket Window
  - Mission 4: Spatial Assembly -> Rocket Wings
  - Mission 5: Pattern Reactor -> Rocket Engine
  - Mission 6: Analogy Link -> Astronaut Seat
  - Mission 7: Sorting Protocol -> Launch Flames
  - Mission 8: Final Logic System -> Launch Glow

### Mission Storytelling And Modal Behavior

- Mission introductions are shown in dedicated modals instead of inside the main question card.
- Mission update and mission-complete moments also use blocking modals.
- The final all-missions-complete celebration also uses a modal before the results screen.
- The timer pauses while any of these blocking mission modals are on screen:
  - mission introduction
  - mission update
  - mission complete
- Mission introduction modals use the actual mission title as the main heading.
- Mission modal actions currently read:
  - `Start mission`
  - `Continue mission`
  - `Next mission`
- The final all-missions-complete modal uses `Finish mission`.
- Mission introduction text, mission update text, and mission-complete text are authored to tell one connected story beat per mission.
- Story content is split into swappable storyline packs in `content.js`, and the app resolves content from `activeStorylineId`.
- Intro and mission-update modals use a text-led layout with no decorative mission image.
- Mission-complete modals use a mission-specific reward icon that matches the unlocked rocket part.
- On phones, mission modals are centered, use a scrollable content area, and keep their primary action visible in a fixed footer.

### Question Flow

- The child answers one question at a time.
- The primary action progresses through:
  - `Check Answer`
  - `Next Mission Step`
  - `Launch the Rocket`
- On the last question of a mission, the action becomes `Next mission`.

- Answer validation behavior:
  - correct selected answers stay green
  - wrong selected answers stay red
  - correct answers do not show an explanation
  - correct answers auto-advance after about 1 second when no blocking mission modal is triggered
  - there is no separate large feedback box during play
  - incorrect answers show the explanation inline inside the correct answer card and wait for manual advance

- Mission progress dots:
  - current unanswered step is highlighted
  - validated correct steps turn green
  - validated wrong steps turn red

### Story Only Mode

- The parent area includes a toggle that enables `Story Only` mode before the child starts.
- In Story Only mode:
  - the child still enters an explorer name
  - the app starts with Mission 1 and plays only the story scenes
  - each mission runs through:
    - mission introduction
    - mission update
    - mission completion
  - the question panel is replaced with story-only placeholder copy instead of answer choices
  - the timer is not used for active play
  - live score saving and final score persistence are skipped
- Story Only mode still routes from one mission to the next and ends on the shared final results/ending flow.

### Mission Navigation And Routing

- Clicking a mission card before the first answer in that mission is validated replays the mission-introduction modal.
- Clicking a completed mission card replays the mission-complete modal instead of showing the solved last question.
- When a mission finishes, both the mission-complete modal and the final-question button route to the next unfinished mission.
- Next-mission routing wraps around the mission list.
- Example routing behavior:
  - if Missions 2 and 3 are already complete, finishing Mission 1 routes to Mission 4
  - if Mission 1 is the only unfinished mission, finishing Mission 8 routes to Mission 1

### Celebration Behavior

- Per-question encouragement appears after validation.
- Midpoint and mission-complete overlays stay visible until the child advances.
- Mission update and mission-complete overlays no longer show the `Star boost unlocked` badge.
- The booster/encouragement badge is rendered inside the bottom validation dock instead of floating above the question.
- The final celebration appears on completion of the full test.

### Scoreboard and Record Behavior

- The Explorer Record card shows only the typed child's saved best record.
- The record currently displays:
  - best score
  - best percentage
  - elapsed time when that best score was reached

- Saving behavior:
  - the frontend now sends score reads and writes to the deployed backend
  - the backend writes records to Supabase as the preferred shared source of truth
  - browser local storage is kept only as a device fallback cache
  - the UI no longer shows cached local score optimistically before the backend lookup finishes
  - if the backend is unavailable, the app may show a cached local score with explicit device-only messaging
  - cached local score is not auto-pushed back to the backend later
  - if two saved records have the same score and percentage, the faster time wins
  - the backend and Supabase are intended to keep only one best-score row per normalized child name

### Mission Sidebar And Rocket Build Status

- Mission cards use a row layout with the mission icon on the left and mission text on the right.
- Completed mission cards show a finished-state marker in the top-right:
  - a gold star-style icon
  - a `Done` label
- Completed mission cards also use a warmer completed-state background treatment.
- The rocket-build card is simplified to show only the current unlocked-stage count plus the rocket visual.

### Parent Area

- Parent controls are hidden behind a collapsed `Parent Area`.
- Parent actions currently include:
  - toggle Story Only mode
  - restart mission
  - reset saved scores

- Reset protection:
  - the current implementation still uses a browser prompt for entering the admin PIN
  - the frontend no longer contains the correct PIN
  - reset verification now happens server-side through the backend
  - successful reset clears the shared remote records
  - the earlier public reset PIN value has now been rotated

### Results Screen

- When the test is completed, the child sees:
  - a score-banded final story outcome
  - a story recap gallery
  - a collapsed Mission Debrief for missed questions
- Final endings are longer-form cinematic outcomes matched to score bands.
- The current ending labels are:
  - `Excellent`
  - `Great Job`
  - `Nice Work`
  - `Good Effort`
  - `Keep Trying`
- The ending headline is shown as `{ending label} - Captain Nova's Final Flight`.
- Story Only sessions use story-only summary copy in the results header but still reuse the shared ending screen.
- The recap gallery currently includes:
  - the introduction artwork
  - the 8 mission-complete artworks
  - the ending artwork
- Gallery cards keep short captions, and quiz-mode sessions still show mission power details there.
- The ending artwork is responsive:
  - portrait Luma-7 art on phones
  - wider Luma-7 art on larger screens

## Content Model

- `content.js` is the main narrative and UI copy source.
- It provides:
  - hero text
  - dashboard labels
  - start-screen copy
  - mission introductions
  - mission midpoint updates
  - mission reward/debrief text
  - final score-based endings
  - scoreboard microcopy
  - celebration labels
- `content.js` also provides:
  - `storylines`
  - `activeStorylineId`
  - the derived `story` object used by the app
- Story artwork can define `src`, `mobileSrc`, and `desktopSrc` so the app can swap images by viewport.
- This structure is intended to support alternate story packs in the future without rewriting the app.

## Persistence Model

- Local browser storage:
  - per-child best record cache used only as a device fallback when the backend cannot be reached

- Remote persistence:
  - Render backend API
  - backend-to-Supabase score persistence
  - server-side reset verification and delete flow

- Current live API paths used by the frontend:
  - `GET /api/v1/players/:playerName/record`
  - `POST /api/v1/players/:playerName/record`
  - `POST /api/v1/admin/scores/reset`

- Saved record fields:
  - player name
  - score
  - percentage
  - total questions
  - elapsed seconds

- Current row model:
  - one best-score row per normalized child name
  - new attempts overwrite that row only when the new result is better
  - reset clears the table through the Supabase reset RPC

## Constraints

- This is a static frontend app.
- The frontend currently still performs scoring and timing calculations before submitting them to the backend.
- Remote storage depends on the Render backend staying in sync with its Supabase schema.
- The question bank and answer logic ship to the browser.
- The backend now lives in the same repo and `master` branch as the frontend, but deploys from the `backend/` root on Render.

## Known Limitations

- Score integrity is still browser-trusted even though writes now route through the backend.
- Parent reset still relies on a browser prompt for PIN entry, even though verification is server-side.
- Saved child names and scores can remain on shared devices.
- There is no automated test suite in the repo yet.
- Storyline selection is still code-configured rather than parent-configurable.
- Story Only mode currently reuses the normal ending screen and score-band ending story instead of having a separate story-only finale.
- Older secrets and reset values may still exist in git history from earlier public versions.
- The old frontend-used Supabase publishable key and old reset PIN value have already been rotated, so the remaining concern is historical exposure rather than current live use.

## Acceptance Criteria For Current Product

- The introduction story is shown before the child name prompt.
- Each mission shows its own introduction in a blocking mission modal.
- Each mission midpoint shows mission-specific update text.
- Each mission completion shows mission-specific reward/debrief text.
- The timer pauses while mission introduction, mission update, and mission-complete modals are visible.
- The final all-missions-complete modal uses `Finish mission`.
- Mission intro and update modals do not show the decorative rocket visual, while mission-complete modals show a mission-specific reward icon.
- On phones, the modal action remains visible without needing to scroll past the full story text.
- Reopening an unstarted mission replays its mission introduction.
- Reopening a completed mission replays its mission-complete modal.
- The last step of a mission uses `Next mission` and routes to the next unfinished mission.
- Correct answers do not show explanation text but still auto-advance when no blocking modal is shown.
- Story Only mode can be enabled from the parent area and plays the mission scenes without requiring question answers.
- Story Only mode does not save explorer scores.
- Explorer Record shows the child-specific best score, percentage, and elapsed time.
- Explorer Record does not show cached local score first while the backend lookup is pending.
- If a cached local score is shown because the backend is unavailable, the UI explicitly labels it as device-only.
- The live frontend no longer embeds the old reset PIN or direct Supabase score credentials.
- Mission overlays persist until the child advances.
- Completed mission cards show a clear completion marker in the sidebar.
- The results page shows the score-banded ending story first, with the ending label prefixed in the title.
- The recap below the ending story is an artwork gallery instead of a plain section-only score grid.
- Mission Debrief remains collapsed by default.

## Main Files

- `index.html`
- `content.js`
- `app.js`
- `scoreboard.js`
- `gamification.js`
- `styles.css`
- `scoreboard.css`
- `gamification.css`
- `supabase/scoreboard_setup.sql`
- `spec/backend-api-spec.md`
