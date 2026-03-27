# Security Rollout Plan

This document is the working execution plan for the remaining security-focused delivery slices. It is meant to be short, current, and easy for multiple agents to coordinate against.

## Objective

Reduce the remaining backend and frontend security risk without mixing unrelated changes into one PR.

## Completed Steps

| Step | PR | Notes |
|---|---|---|
| Function execute lockdown | PR 21 | `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO service_role` for all `SECURITY DEFINER` functions |
| RLS and service-role policies | PR 22 | RLS enabled on all backend-owned tables; service-role-only policies in place |
| Backend API spec refresh | PR 23 | Live attempt-based contract documented; legacy 410 behavior noted |
| Backend README refresh | PR 24 | Smoke runner, scripts, schema notes, and backend-owned flow updated |
| Review-card innerHTML hardening | PR 25 | Missed-question and perfect-score cards converted to DOM construction |
| Frontend coverage for review cards | PR 26 | Targeted `app.js` frontend tests covering both card variants |

## Open Decision Blocker

`POST /api/v1/admin/scores/reset` security model:

- **Option A:** keep it usable from the public parent flow (current behavior)
- **Option B:** make it owner-only and require `X-Admin-Key`

This decision must be made before any auth change lands on that route. It also affects the reset-route section of `spec/backend-api-spec.md`.

## Remaining Execution Order

### 1. Inline Style Audit

Goal:
- confirm every remaining `element.style.*` write or inline `style` attribute source in frontend JS
- decide whether each one is a class toggle, a CSS custom property, or a genuine inline style that should be removed before CSP tightening

Output:
- a short audit note in `spec/backlog.md` or a dedicated PR
- prerequisite for removing `'unsafe-inline'` from `style-src`

### 2. CSP `unsafe-inline` Removal

Goal:
- remove `'unsafe-inline'` from `style-src` in `index.html`

Depends on:
- inline style audit showing no remaining unaccounted-for inline style generation

Validation:
- browser console shows no CSP violations after removal
- visual regression check on rocket scene, progress bar, and gamification panels

### 3. Remaining `innerHTML` Passes

Goal:
- convert gamification panel renderers (`MissionPanel`, `OverallProgressBar`, `RocketProgressVisual`, `CelebrationManager`) from `innerHTML` to DOM construction

Current risk:
- these renderers use `innerHTML` with integer/constant-only interpolation today
- still worth eliminating as defense in depth before or alongside CSP tightening

### 4. Clickjacking / `frame-ancestors`

Goal:
- decide whether to accept the GitHub Pages `frame-ancestors` limitation or migrate hosting

Notes:
- GitHub Pages cannot enforce `frame-ancestors` from a meta CSP tag
- see `spec/csp-clickjacking-plan.md` for the concrete recommendation and rollout sequence

### 5. CSP `report-to` Endpoint

Goal:
- add a `report-to` directive pointing at a reporting endpoint after the stricter CSP is in place and the frontend can emit response headers

Depends on:
- `'unsafe-inline'` removal and a hosting setup that can set response headers

## Coordination Notes

- Keep security/schema changes in separate PRs.
- Update `spec/backlog.md` whenever one of these steps moves.
- Do not combine the reset-route product decision with CSP or RLS changes.
