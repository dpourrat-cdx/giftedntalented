# Spec Index

Documentation and specifications for Captain Nova's Rocket Mission.

## Docs At Repo Root

| File | Purpose |
|---|---|
| [`../README.md`](../README.md) | Project overview, live URLs, quick start |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Multi-agent workflow, branch naming, local dev, merge checklist, test expectations |

## Specs In This Folder

| File | Purpose |
|---|---|
| [`product-spec.md`](product-spec.md) | Current shipped product behavior — mission flow, scoring, parent controls |
| [`architecture.md`](architecture.md) | System design, release flow, CI pipeline, branch protection, smoke checks |
| [`backend-api-spec.md`](backend-api-spec.md) | API reference *(predates the attempt-based flow — rewrite tracked in backlog Priority 2)* |
| [`backlog.md`](backlog.md) | Prioritized backlog of next work |

## Current Status

Shipped as of March 26, 2026:

- Story-driven 8-mission rocket adventure with cinematic storyline pack
- Blocking mission introduction, update, completion, and final-launch modals with timer pause
- Parent-controlled Story Only mode
- Backend-owned question selection and answer validation through the score-attempt flow
- Score persistence via Supabase with one best row per child name
- CI pipeline (GitHub Actions) running check, test, build, and audit on every PR
- Branch protection on `master` requiring passing CI before merge
- Multi-agent (Claude + Codex) workflow conventions documented in `CONTRIBUTING.md`

## When To Create A Spec

Write a spec when the work has any of these traits:

- Multiple UI states or flows
- New product behavior or API surface
- Non-obvious requirements or tradeoffs
- Changes that touch several files or systems
- Work that could create regressions if misunderstood

For very small changes, a short note or inline comment is enough.
