# Security Rollout Plan

This document is the working execution plan for the next security-focused delivery slices. It is meant to be short, current, and easy for multiple agents to coordinate against.

## Objective

Reduce the remaining backend and frontend security risk without mixing unrelated changes into one PR.

## Decision Blocker

Before the next auth change lands, we need a product decision for `POST /api/v1/admin/scores/reset`:

- Option A: keep it usable from the public parent flow
- Option B: make it owner-only and require `X-Admin-Key`

That decision affects both the backend route behavior and the API documentation.

## Execution Order

### 1. Reset Route Decision

Goal:
- decide whether the reset route stays parent-accessible or becomes owner-only

Outputs:
- update `spec/backlog.md`
- reflect the decision later in `spec/backend-api-spec.md`

### 2. Security PR 1: Function Execute Lockdown

Goal:
- add explicit function permission controls in `backend/supabase/backend_schema.sql`

Scope:
- `REVOKE EXECUTE FROM PUBLIC`
- `GRANT EXECUTE TO service_role`
- only for the relevant `SECURITY DEFINER` functions

Why separate:
- low blast radius
- easier to validate before introducing RLS changes

Validation:
- schema review
- backend tests
- live smoke after merge if deploy-impacting

### 3. Security PR 2: RLS And Policies

Goal:
- enable or verify RLS and add the needed policies for:
  - `test_scores`
  - `app_admin_settings`
  - `notification_devices`
  - `score_attempts`
  - `score_attempt_events`

Why separate:
- higher production risk
- easier rollback if isolated from grants/revokes

Validation:
- policy review
- backend tests
- live smoke after migration and deploy

### 4. Docs PR: Live API Contract

Goal:
- rewrite `spec/backend-api-spec.md` so it matches the current production behavior

Must cover:
- `POST /attempts`
- `POST /attempts/:attemptId/answers`
- `POST /attempts/:attemptId/finalize`
- disabled legacy record-write behavior
- reset route behavior after the decision above

Optional same-slice follow-up:
- update `backend/README.md`

### 5. Frontend Hardening Follow-Up

After the security/backend docs work:

- continue render-sink cleanup beyond story mode
- remove `'unsafe-inline'` from `style-src`
- broaden source-attributed frontend coverage so those frontend hardening PRs stay easy to merge

## Recommended PR Sequence

1. reset-route decision note
2. function execute lockdown
3. RLS and policies
4. backend API spec refresh
5. frontend render-sink cleanup
6. CSP tightening
7. frontend source-attributed coverage expansion

## Coordination Notes

- Keep security/schema changes in separate PRs.
- Update `spec/backlog.md` whenever one of these slices moves.
- Ask the other agent to review every PR before merge.
- Do not combine the reset-route product decision with RLS unless the decision directly requires it.
