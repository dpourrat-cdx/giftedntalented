# Frontend Header Security Decision Brief

This brief turns the remaining frontend header-security question into a concrete decision path.

## Current Constraint

The frontend is served from GitHub Pages, so it cannot emit response headers such as:

- `Content-Security-Policy`
- `Content-Security-Policy-Report-Only`
- `frame-ancestors`
- `report-to`

That means GitHub Pages cannot provide a fully enforceable clickjacking defense or a meaningful CSP reporting rollout on its own.

## Decision

Keep the frontend on GitHub Pages for now.

That means the repo explicitly accepts these current limitations:

- GitHub Pages cannot emit `Content-Security-Policy`, `Content-Security-Policy-Report-Only`, `frame-ancestors`, or `report-to`
- clickjacking protection cannot be enforced through response headers on GitHub Pages
- CSP reporting cannot be rolled out meaningfully without a header-capable host or proxy
- any browser-side frame-busting guard is defense in depth only, not a security boundary

If we later move the frontend to a header-capable host or add a reverse proxy/CDN:

- enforce `frame-ancestors 'none'` in response headers
- start with `Content-Security-Policy-Report-Only`
- send reports to a backend endpoint for one release cycle
- promote the policy to enforcing headers after violations are fixed or documented

## Acceptance Criteria

This item is done for now because GitHub Pages remains the host and the repo documents that the remaining risk is accepted.

## Follow-Up

- `spec/backlog.md` should point here for the header-security decision work.
- `spec/csp-clickjacking-plan.md` can remain as the older planning note, but this brief is the decision-focused source of truth.
