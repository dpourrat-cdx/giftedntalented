# Documentation Index

This `docs/` directory holds the durable project documentation for Captain Nova.

Use these files as the current sources of truth:

## Core Docs

- `product-spec.md`
  - current shipped child and parent experience
  - mission flow, scoring, persistence, and acceptance criteria

- `architecture.md`
  - system topology
  - release flow
  - CI rules
  - smoke checks
  - environment variables

- `backend-api-spec.md`
  - live backend contract
  - request and response shapes
  - security model
  - data model

- `backlog.md`
  - live backlog only
  - current open delivery slices
  - no completed history unless it still explains an open dependency or decision

## Decision Records

- `decisions/frontend-header-security.md`
  - why the frontend stays on GitHub Pages for now
  - what response-header limits are accepted
  - what future move would unlock real CSP reporting and frame protection

- `decisions/reset-route.md`
  - why `POST /api/v1/admin/scores/reset` remains parent-facing and reset-PIN based

## Related Docs Outside This Folder

- `README.md`
  - project overview
  - quick start

- `CONTRIBUTING.md`
  - branch workflow
  - multi-agent rules
  - PR and merge requirements

- `backend/README.md`
  - backend runtime and deployment notes

## Purpose Rules

Add a new document here only if at least one is true:

- it is a durable source of truth
- it records a decision that may need to be revisited later
- it coordinates a multi-PR effort that does not fit cleanly inside `backlog.md`

For live planning and active work tracking, prefer `docs/backlog.md` over creating temporary planning files in this directory.

If a file becomes only historical or duplicates the backlog, delete it or merge the still-useful parts into an existing doc.
