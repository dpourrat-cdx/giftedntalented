# Captain Nova Current Product Spec

## Overview

This document captures the current shipped behavior of the Captain Nova rocket mission app as it exists after the recent UX, story, question-flow, and scoreboard updates.

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

### Mission Structure

- The game contains 8 missions mapped to the 8 question sections.
- Each mission has:
  - a dedicated introduction shown in the mission story panel
  - a midpoint update shown as a persistent celebration overlay
  - a reward/debrief shown when the mission is completed and the rocket part is earned

- Mission mapping:
  - Mission 1: Verbal Challenge -> Rocket Base
  - Mission 2: Math Challenge -> Rocket Body
  - Mission 3: Pattern Vision -> Rocket Window
  - Mission 4: Spatial Assembly -> Rocket Wings
  - Mission 5: Pattern Reactor -> Rocket Engine
  - Mission 6: Analogy Link -> Astronaut Seat
  - Mission 7: Sorting Protocol -> Launch Flames
  - Mission 8: Final Logic System -> Launch Glow

### Question Flow

- The child answers one question at a time.
- The primary action progresses through:
  - `Check Answer`
  - `Next Mission Step`
  - `Launch the Rocket`

- Answer validation behavior:
  - correct selected answers stay green
  - wrong selected answers stay red
  - the correct answer displays the explanation inline
  - there is no separate large feedback box during play

- Mission progress dots:
  - current unanswered step is highlighted
  - validated correct steps turn green
  - validated wrong steps turn red

### Celebration Behavior

- Per-question encouragement appears after validation.
- Midpoint and mission-complete overlays stay visible until the child advances.
- The final celebration appears on completion of the full test.

### Scoreboard and Record Behavior

- The Explorer Record card shows only the typed child's saved best record.
- The record currently displays:
  - best score
  - best percentage
  - elapsed time when that best score was reached

- Saving behavior:
  - records are saved locally in browser storage
  - records are also sent to Supabase when available
  - if two saved records have the same score and percentage, the faster time wins

### Parent Area

- Parent controls are hidden behind a collapsed `Parent Area`.
- Parent actions currently include:
  - restart mission
  - reset saved scores

- Reset protection:
  - the current implementation requires an admin PIN in the browser flow
  - local reset and remote reset share that flow

### Results Screen

- When the test is completed, the child sees:
  - a score-banded final story outcome
  - section-by-section breakdown cards
  - a collapsed Mission Debrief for missed questions

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

## Persistence Model

- Local browser storage:
  - per-child best record cache

- Remote persistence:
  - Supabase `test_scores` table
  - `get_player_top_score` RPC
  - reset RPC for clearing scores

- Saved record fields:
  - player name
  - score
  - percentage
  - total questions
  - elapsed seconds

## Constraints

- This is a static frontend app.
- The frontend currently performs scoring and timing calculations.
- Remote storage depends on Supabase schema being kept in sync with the frontend.
- The question bank and answer logic ship to the browser.

## Known Limitations

- Score integrity is still browser-trusted.
- Parent reset protection still relies on frontend behavior.
- Saved child names and scores can remain on shared devices.
- There is no automated test suite in the repo yet.

## Acceptance Criteria For Current Product

- The introduction story is shown before the child name prompt.
- Each mission shows its own introduction in the mission story card.
- Each mission midpoint shows mission-specific update text.
- Each mission completion shows mission-specific reward/debrief text.
- Explorer Record shows the child-specific best score, percentage, and elapsed time.
- Mission overlays persist until the child advances.
- The results page shows the score-banded ending story first.
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
