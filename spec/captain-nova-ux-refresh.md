# Captain Nova UX Refresh

## Overview

Refresh the quiz app so it feels like one coherent Captain Nova rocket adventure instead of a school test with themed add-ons. The experience should stay readable and child-friendly while making the story, rewards, progress, and final launch feel exciting and connected.

This spec now reflects the implemented UX direction after the March 18 story, artwork, gallery, and backend-record refinements.

## Problem Statement

The app already has rocket rewards, mission structure, and story text, but the experience must read as one connected mission from the first briefing through the final launch. Story moments, question feedback, navigation, and completed-state visuals all need to feel like parts of the same game system rather than separate quiz widgets.

## Goals

- Make the hero feel like Mission Control, not a worksheet header.
- Keep the child flow focused on Captain Nova, rocket parts, and mission progress.
- Preserve all current gamification, scoring, and question functionality.
- Improve hierarchy so rewards and mission progress are easier to understand than raw quiz mechanics.
- Deliver a stronger final launch moment before exposing detailed review.
- Make mission storytelling feel chapter-based, with a clear opening, midpoint, and reward moment for each mission.
- Keep modal reading moments calm by pausing time pressure while they are visible.
- Keep story modals comfortable to use on phones without losing the primary action.

## Non-Goals

- No change to question bank logic or scoring rules.
- No removal of existing icons, rocket stages, midpoint boosts, or celebration overlays.
- No move away from the current static frontend deployment model.

## Users

- Primary user: an 8-year-old completing the practice adventure.
- Secondary user: a parent or adult managing restart/reset actions and reviewing missed questions.

## Requirements

- The hero must use Captain Nova story-first branding.
- The explorer record must remain visible in the hero.
- Parent/admin actions must move into a hidden-by-default parent area.
- The start state must show the full introduction story.
- In-play missions must keep a compact mission card for orientation, but the full mission story beats must appear in dedicated modals.
- Each mission must have a blocking introduction modal before the child starts its first unanswered question.
- Each mission must have a midpoint update modal with a `Continue mission` action.
- Each mission must have a mission-complete modal with a `Next mission` action.
- The final celebration modal must use `Finish mission`.
- The timer must pause while any blocking mission modal is on screen.
- The primary CTA labels must read `Check Answer`, `Next Mission Step`, and `Launch the Rocket` in the correct states.
- The last question of a mission must use `Next mission` instead of `Next Mission Step`.
- The question layout must keep the CTA visually stable without creating a large empty gap.
- Mission intro and mission-update modals should stay text-led and uncluttered.
- Mission-complete modals should visually reinforce the unlocked rocket part with a mission-specific reward icon.
- On phones, story modals must remain centered and keep the action button visible in a fixed footer.
- Dashboard cards must use rocket/mission language instead of generic test language.
- Completed mission cards in the sidebar must show a clear finished marker.
- The parent area may offer a `Story Only` path that plays the narrative scenes without quiz answering.
- Results must show the ending story first, then summary cards, with detailed review collapsed by default.
- Results recap should feel like a visual story epilogue rather than a spreadsheet of section stats.

## UX Flow

1. The child lands on a Mission Control hero with Captain Nova branding and the explorer record.
2. The child reads the global introduction, enters an explorer name, and starts Mission 1.
3. When a mission begins, a blocking mission-introduction modal explains the story beat and reward at stake.
4. During play, the compact mission card and mission-step indicators reinforce current progress without repeating the full story text.
5. At the midpoint, a `Mission Update` modal appears and pauses the timer until dismissed.
6. On mission completion, a reward modal confirms the rocket part is earned and routes the child to the next unfinished mission.
7. Completed missions show a clear finished-state marker in the sidebar so the child can see progress at a glance.
8. If a parent enables `Story Only`, the child progresses through mission scenes without answering questions.
9. After the final mission step, the launch ending appears first.
10. A recap gallery lets the child scroll through the introduction, unlocked mission moments, and final ending artwork.
11. A parent can open the Mission Debrief to review missed steps and correct answers.

## Content Model

- Shared content config drives hero copy, parent area labels, mission briefings, CTA labels, scoreboard copy, result labels, and celebration messages.
- Mission story content maps one-to-one with the 8 test sections.
- Mission story content must stay coherent across introduction, midpoint update, and mission completion.
- Result ending content remains score-banded.
- Story content should be swappable as storyline packs without changing app logic.

## Technical Notes

- Main implementation areas: `index.html`, `content.js`, `app.js`, `gamification.js`, `scoreboard.js`, and shared CSS.
- Explorer Record and reset interactions now route through the deployed backend API rather than direct browser-to-Supabase calls.
- Parent controls should remain the same buttons and listeners, only moved into a hidden-by-default container.
- Review detail can use a native `details` element for a simple collapsed debrief.
- The stable question CTA should rely on a compact question dock with reserved feedback space rather than a very large fixed blank stage.
- Story content should resolve from an active storyline id so alternate story packs can be added later.
- Story artwork should also resolve from storyline config, including optional responsive mobile/desktop variants.
- Mission overlays must coordinate with timer state and auto-advance rules.
- Re-entering a mission before its first answer is validated must replay the mission introduction.
- Re-entering a completed mission must replay the mission-complete modal instead of dropping the child back on a solved last question.
- Story modals should use a split layout with scrollable content and a stable action footer for mobile safety.
- The visual treatment of mission modals should vary by state:
  - intro and update modals stay text-first
  - completion modals show the unlocked reward icon
- Story Only mode should be implemented as a real alternate flow, not as hidden simulated button clicks.

## Acceptance Criteria

- The hero shows Captain Nova story branding and keeps the explorer record visible.
- The parent area is closed by default and contains restart/reset controls.
- The start screen shows the full introduction story.
- During play, the mission card updates to the active mission and rocket part.
- Opening a mission before its first validated answer replays the mission introduction modal.
- Opening a completed mission replays the mission-complete modal.
- The timer pauses while mission introduction, mission update, and mission-complete modals are visible.
- The final celebration modal uses `Finish mission`.
- The CTA label changes correctly across unanswered, validated, and complete states.
- The last question in a mission uses `Next mission`.
- The CTA stays in the same document position when selecting an option and validating an answer.
- On phones, the modal action button remains visible and the modal appears centered rather than bottom-locked.
- Completed missions show a clear finished-state marker in the sidebar.
- Story Only mode can be enabled from the parent area and plays the mission scenes without answering questions.
- Results display the ending story before the summary cards.
- The ending headline includes the score-band label before `Captain Nova's Final Flight`.
- The results recap renders as a responsive gallery using the active storyline artwork set.
- On phones, the ending gallery uses the portrait ending art while larger screens use the wider ending art.
- Mission Debrief is collapsed by default and still contains the missed-question review.
- Explorer Record no longer depends on direct browser-held Supabase credentials.
- Restart, reset PIN protection, and per-child score record behavior continue to work.

## Test Scenarios

- Load the app and verify Mission Control branding, parent area hidden, and explorer record copy.
- Enter a child name and verify the global introduction is followed by a Mission 1 introduction modal.
- Answer and validate one question and verify the CTA does not jump.
- Trigger a mission midpoint and verify the `Mission Update` modal pauses the timer and uses `Continue mission`.
- Complete a mission section and verify the reward copy matches the unlocked rocket part and the modal uses `Next mission`.
- Complete the full app and verify the final modal button reads `Finish mission`.
- Reopen an unstarted mission and verify its introduction modal reappears.
- Reopen a completed mission and verify the mission-complete modal appears instead of the solved question.
- On a phone-sized viewport, verify the modal remains centered and the action button stays visible.
- Enable `Story Only` in the parent area and verify the app advances mission-to-mission through modals without requiring answer selection.
- Trigger final results and verify the ending story appears before the breakdown.
- Trigger final results and verify the recap gallery includes intro art, mission art, and ending art.
- Verify the ending title includes the correct score-band label:
  - `Excellent`
  - `Great Job`
  - `Nice Work`
  - `Good Effort`
  - `Keep Trying`
- Open the Mission Debrief and verify review content is still available.
- Open the parent area and verify restart/reset controls still function.
- Verify Explorer Record waits for the remote score lookup instead of flashing local cached score first.
