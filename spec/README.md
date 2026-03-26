# Spec-Driven Development

This folder is the home for feature specs before implementation work starts.

## Goal

Spec-driven development helps us make changes with clearer scope, fewer surprises, and better alignment before code is written.

## Current Specs And Docs

### In `spec/`

- `backend-api-spec.md` — Render backend architecture, API responsibilities, and security model. **Note:** predates the March 26 attempt-based flow; a full rewrite is tracked as Priority 2 in `next-implementation-todo.md`
- `backend-deploy-checklist.md` — lightweight deploy checklist and smoke-command reference for Render releases
- `unified-architecture-and-release-flow.md` — current GitHub Pages, Render, and Supabase release flow, CI and branch protection rules, and smoke-check expectations
- `captain-nova-ux-refresh.md` — story-first UX architecture for the Captain Nova mission flow, including mission modals, progress feedback, and payoff-first results
- `captain-nova-current-product-spec.md` — current shipped behavior for cinematic storyline packs, modal mission flow, mission routing, backend-owned attempt flow, and parent controls
- `next-implementation-todo.md` — prioritized backlog after the March 26 CI and docs rollout, with the remaining security, docs, and ops work

### At repo root

- `CONTRIBUTING.md` — branch naming, test expectations, merge+deploy workflow, and multi-agent (Claude + Codex) working conventions

## Current Status

These specs were refreshed through the March 26, 2026 CI, branch protection, and docs rollout. The shipped system now includes:

- cinematic story content with a swappable storyline-pack structure
- blocking mission introduction, update, completion, and final-launch modals
- timer pause behavior while story modals are open
- phone-safe centered modals with fixed action footers
- mission-to-mission routing that skips completed missions
- completed-mission markers in the sidebar
- a parent-controlled `Story Only` mode that plays the narrative scenes without quiz answering
- mission-specific completion artwork plus intro/ending artwork
- a results recap gallery built from the active storyline artwork
- a live Render backend for score read/save/reset
- backend-to-Supabase score persistence with one best row per child name
- backend-owned score attempts with route-level validation and finalize flow
- CI pipeline (GitHub Actions) running check, test, build, and audit on every PR
- branch protection on `master` requiring passing CI before merge
- `CONTRIBUTING.md` documenting the multi-agent (Claude + Codex) workflow conventions
- device-only score fallback messaging instead of silent local-first score display
- server-side reset PIN verification instead of browser-held reset logic
- backend source now merged into `master`
- Render now deploys the backend from `master` with `backend/` as the root directory

## Current Architecture Note

The live system now ships from one main branch:

- `master`
  - GitHub Pages frontend
  - backend source under `backend/`
  - Render deployment source with `backend/` as the service root

For the current release flow and smoke checks, see [unified-architecture-and-release-flow.md](unified-architecture-and-release-flow.md).

This means frontend, backend, and specs now live in one unified repo history.

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
