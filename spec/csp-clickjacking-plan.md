# CSP And Clickjacking Plan

This note captures the remaining frontend security planning that depends on GitHub Pages' hosting limits.

## Current Constraint

The frontend is served from GitHub Pages, so we cannot set response headers such as `Content-Security-Policy`, `Content-Security-Policy-Report-Only`, or `frame-ancestors` there.

That means two things:

- a meta CSP can help with `style-src` and similar directives, but it cannot fully solve clickjacking protection
- CSP reporting is not a meaningful rollout lever until the frontend moves to a host that can emit response headers or a reverse proxy/CDN is introduced

## Clickjacking Recommendation

Short term:

- accept the residual frame risk if the frontend remains on GitHub Pages
- keep the reset and parent-facing actions obvious in the UI so they are not mistaken for admin-only controls
- if we want a lightweight browser-side fallback, add a frame-busting guard only as a defense-in-depth hint, not as the primary protection

Medium term:

- if the threat model requires real frame protection, move the frontend to a host that can emit headers
- once that host exists, enforce `frame-ancestors 'none'` in a response header instead of relying on meta tags

## CSP Reporting Recommendation

Rollout sequence once the frontend can emit headers:

1. ship the stricter CSP in `Content-Security-Policy-Report-Only`
2. collect reports to a backend endpoint for one release cycle
3. fix any violations or explicitly document accepted exceptions
4. promote the policy to enforcing headers
5. keep the reporting endpoint around for future regressions

Implementation notes:

- use a dedicated backend route for CSP report collection
- store only the directive, blocked URI, user agent, and page URL needed for debugging
- treat the report stream as noisy telemetry, not as user-facing error handling

## Follow-Up

- `spec/security-rollout-plan.md` should point here for the clickjacking/CSP reporting work
- `spec/backlog.md` should mention that the current GitHub Pages host blocks a full header-based rollout
