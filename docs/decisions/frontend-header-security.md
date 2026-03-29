# Frontend Header Security Decision

This document records the current frontend hosting and header-security decision.

## Current Constraint

The frontend is served from GitHub Pages, so it cannot emit response headers such as:

- `Content-Security-Policy`
- `Content-Security-Policy-Report-Only`
- `frame-ancestors`
- `report-to`

That means GitHub Pages cannot provide fully enforceable clickjacking defense or meaningful CSP reporting on its own.

## Decision

Keep the frontend on GitHub Pages for now.

That means the repo explicitly accepts these limitations for the current deployment:

- GitHub Pages cannot emit `Content-Security-Policy`, `Content-Security-Policy-Report-Only`, `frame-ancestors`, or `report-to`
- clickjacking protection cannot be enforced through response headers on GitHub Pages
- CSP reporting cannot be rolled out meaningfully without a header-capable host or proxy
- the browser-side frame-busting fallback is defense in depth only, not a security boundary

## Future Trigger

If the frontend later moves to a header-capable host or gains a reverse proxy or CDN layer:

- enforce `frame-ancestors 'none'` in real response headers
- start with `Content-Security-Policy-Report-Only`
- send reports to a backend endpoint for one release cycle
- promote the policy to enforcing headers after violations are fixed or documented

## Follow-Up

- `docs/backlog.md` should point here for the header-security decision work.
- `backend/README.md` and `docs/backend-api-spec.md` should stay aligned with this decision whenever hosting or fallback behavior changes.
