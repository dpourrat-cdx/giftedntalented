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
- identify every place in frontend JS that generates inline `style` attributes or sets `element.style.*`
- determine whether each can be replaced with a CSS class toggle

Output:
- audit note in backlog or a dedicated PR
- prerequisite for removing `'unsafe-inline'` from `style-src`

### 2. CSP `unsafe-inline` Removal

Goal:
- remove `'unsafe-inline'` from `style-src` in `index.html`

Depends on:
- inline style audit (step 1 above) showing no remaining inline style generation

Validation:
- browser console shows no CSP violations after removal
- visual regression check on rocket scene, progress bar, and gamification panels (the most likely inline-style surfaces)

### 3. Remaining `innerHTML` Passes

Goal:
- convert gamification panel renderers (`MissionPanel`, `OverallProgressBar`, `RocketProgressVisual`, `CelebrationManager`) from `innerHTML` to DOM construction

Current risk:
- these renderers use `innerHTML` with integer/constant-only interpolation — no user data flows in today
- still worth eliminating as defence-in-depth before CSP tightening

### 4. CSP `report-to` Endpoint

Goal:
- add a `report-to` directive pointing at a reporting endpoint after the stricter CSP is in place

Depends on:
- `unsafe-inline` removal (step 2)
- a host or proxy that can emit real CSP response headers

### 5. Clickjacking / `frame-ancestors`

Goal:
- decide whether to accept the GitHub Pages `frame-ancestors` limitation or migrate hosting

Notes:
- GitHub Pages cannot enforce `frame-ancestors` from a meta CSP tag
- options: explicit risk acceptance, move to a host that supports response headers, or add a JS frame-busting fallback
- detailed planning now lives in `spec/frontend-header-security-plan.md`

## Coordination Notes

- Keep security/schema changes in separate PRs.
- Update `spec/backlog.md` whenever one of these steps moves.
- Do not combine the reset-route product decision with CSP or RLS changes.
