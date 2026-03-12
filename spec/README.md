# Spec-Driven Development

This folder is the home for feature specs before implementation work starts.

## Goal

Spec-driven development helps us make changes with clearer scope, fewer surprises, and better alignment before code is written.

## Current Feature Specs

- `captain-nova-ux-refresh.md` - story-first UX architecture for the Captain Nova mission flow, including mission modals, progress feedback, and payoff-first results
- `captain-nova-current-product-spec.md` - current shipped behavior for cinematic storyline packs, modal mission flow, mission routing, score saving, and parent controls
- `next-implementation-todo.md` - prioritized backlog after the March 12 mission-story and navigation updates, with security hardening still first

## Current Status

These specs were refreshed through the March 12, 2026 product pass. The shipped app now includes:

- cinematic story content with a swappable storyline-pack structure
- blocking mission introduction, update, and completion modals
- timer pause behavior while story modals are open
- mission-to-mission routing that skips completed missions
- completed-mission markers in the sidebar

Instead of jumping straight into implementation, we write down:

- the problem we are solving
- who the change is for
- what success looks like
- what is in scope and out of scope
- how we expect the feature to behave
- how we will know it is done

## When To Create A Spec

Create a spec when work has one or more of these traits:

- multiple UI states or flows
- new product behavior
- non-obvious requirements or tradeoffs
- work that touches several files or systems
- changes that could create regressions if misunderstood

For very small changes, a full spec may not be necessary. A short note can be enough.

## Recommended Workflow

1. Define the problem clearly.
2. Describe the user and the user goal.
3. Write functional requirements.
4. List constraints and non-goals.
5. Describe the UX flow and important states.
6. Note technical approach and integration points.
7. Add acceptance criteria.
8. Review the spec before coding.
9. Implement against the spec.
10. Update the spec if the plan changes during implementation.

## Suggested Folder Structure

Use one folder per feature or initiative when the work is substantial.

Example:

```text
spec/
  README.md
  rocket-gamification/
    spec.md
    notes.md
    assets/
```

For smaller efforts, a single markdown file is enough.

Example:

```text
spec/
  improve-mobile-layout.md
```

## What A Good Spec Should Include

### 1. Overview

Explain the feature in plain language.

Questions to answer:

- What are we building?
- Why are we building it?
- Who benefits from it?

### 2. Problem Statement

Describe the current pain point or gap.

### 3. Goals

List the outcomes we want.

Example:

- Make the test feel less overwhelming.
- Improve clarity of progress.
- Keep implementation lightweight.

### 4. Non-Goals

Be explicit about what the work will not do.

Example:

- No changes to question content.
- No backend work.
- No change to scoring rules.

### 5. Requirements

Write clear, testable requirements.

Good requirement example:

- The app must show a section progress indicator with 8 steps.

Less useful example:

- The app should feel better.

### 6. User Experience

Describe the main flow from the user's perspective.

Include:

- entry point
- normal flow
- edge cases
- empty states
- completion states

### 7. Technical Notes

Document implementation expectations without turning the spec into code.

Include when useful:

- files likely to change
- integration points
- state needs
- performance concerns
- accessibility requirements

### 8. Acceptance Criteria

Acceptance criteria should be concrete and easy to verify.

Example:

- Given a user answers question 4 in a section, a midpoint milestone appears once.
- Given a user completes all 8 questions in a section, the section completion state appears once.

### 9. Open Questions

List decisions that are still unresolved.

### 10. Rollout Notes

Optional, but useful for larger work.

Include:

- launch risks
- follow-up tasks
- future extensions

## Spec Review Checklist

Before implementation starts, check that the spec:

- explains the user problem
- has clear scope
- separates goals from non-goals
- includes testable requirements
- defines acceptance criteria
- names important technical constraints
- is understandable by someone new to the task

## Lightweight Spec Template

Copy this into a new spec file when starting a feature:

```md
# Feature Name

## Overview

## Problem Statement

## Goals

- 

## Non-Goals

- 

## Users

## Requirements

- 

## UX Flow

## Technical Notes

## Acceptance Criteria

- 

## Open Questions

- 
```

## Implementation Rule

When possible:

- write or update the spec first
- implement second
- verify against acceptance criteria last

This keeps product intent, UX behavior, and engineering work aligned.
