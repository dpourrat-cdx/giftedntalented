# Captain Nova UX Refresh

## Overview

Refresh the quiz app so it feels like one coherent Captain Nova rocket adventure instead of a school test with themed add-ons. The experience should stay readable and child-friendly while making the story, rewards, progress, and final launch feel exciting and connected.

## Problem Statement

The app already has rocket rewards, mission structure, and story text, but the overall UX still mixes academic quiz language with adventure language. Parent/admin controls are exposed in the child-facing hero, the in-play story treatment is too large, and the results screen does not fully land as a payoff-first launch sequence.

## Goals

- Make the hero feel like Mission Control, not a worksheet header.
- Keep the child flow focused on Captain Nova, rocket parts, and mission progress.
- Preserve all current gamification, scoring, and question functionality.
- Improve hierarchy so rewards and mission progress are easier to understand than raw quiz mechanics.
- Deliver a stronger final launch moment before exposing detailed review.

## Non-Goals

- No change to question bank logic or scoring rules.
- No change to Supabase/local score persistence behavior.
- No removal of existing icons, rocket stages, midpoint boosts, or celebration overlays.
- No backend schema or API changes.

## Users

- Primary user: an 8-year-old completing the practice adventure.
- Secondary user: a parent or adult managing restart/reset actions and reviewing missed questions.

## Requirements

- The hero must use Captain Nova story-first branding.
- The explorer record must remain visible in the hero.
- Parent/admin actions must move into a hidden-by-default parent area.
- The start state must show the full introduction story.
- In-play missions must use a compact mission strip with mission number, title, reward, and short narrative context.
- The primary CTA labels must read `Check Answer`, `Next Mission Step`, and `Launch the Rocket` in the correct states.
- The question layout must keep the CTA visually stable without creating a large empty gap.
- Dashboard cards must use rocket/mission language instead of generic test language.
- Results must show the ending story first, then summary cards, with detailed review collapsed by default.

## UX Flow

1. The child lands on a Mission Control hero with Captain Nova branding and the explorer record.
2. The child enters an explorer name and sees the introduction story plus the first mission setup.
3. During play, the compact mission strip reinforces which rocket part is being unlocked.
4. Progress cards and celebration moments keep rewarding mission completion and rocket assembly.
5. After the final mission step, the launch ending appears first.
6. Summary cards explain performance by mission.
7. A parent can open the Mission Debrief to review missed steps and correct answers.

## Content Model

- Shared content config drives hero copy, parent area labels, mission briefings, CTA labels, scoreboard copy, result labels, and celebration messages.
- Mission story content maps one-to-one with the 8 test sections.
- Result ending content remains score-banded.

## Technical Notes

- Main implementation areas: `index.html`, `content.js`, `app.js`, `gamification.js`, `scoreboard.js`, and shared CSS.
- Parent controls should remain the same buttons and listeners, only moved into a hidden-by-default container.
- Review detail can use a native `details` element for a simple collapsed debrief.
- The stable question CTA should rely on a compact question dock with reserved feedback space rather than a very large fixed blank stage.

## Acceptance Criteria

- The hero shows Captain Nova story branding and keeps the explorer record visible.
- The parent area is closed by default and contains restart/reset controls.
- The start screen shows the full introduction story.
- During play, the mission strip updates to the active mission and rocket part.
- The CTA label changes correctly across unanswered, validated, and complete states.
- The CTA stays in the same document position when selecting an option and validating an answer.
- Results display the ending story before the summary cards.
- Mission Debrief is collapsed by default and still contains the missed-question review.
- Restart, reset PIN protection, and per-child score record behavior continue to work.

## Test Scenarios

- Load the app and verify Mission Control branding, parent area hidden, and explorer record copy.
- Enter a child name and verify the intro transitions into a compact Mission 1 strip.
- Answer and validate one question and verify the CTA does not jump.
- Complete a mission section and verify the reward copy matches the unlocked rocket part.
- Trigger final results and verify the ending story appears before the breakdown.
- Open the Mission Debrief and verify review content is still available.
- Open the parent area and verify restart/reset controls still function.
