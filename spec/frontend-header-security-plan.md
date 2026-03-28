# Frontend Header Security Decision Brief

This brief turns the remaining frontend header-security question into a concrete decision path.

## Current Constraint

The frontend is served from GitHub Pages, so it cannot emit response headers such as:

- `Content-Security-Policy`
- `Content-Security-Policy-Report-Only`
- `frame-ancestors`
- `report-to`

That means GitHub Pages cannot provide a fully enforceable clickjacking defense or a meaningful CSP reporting rollout on its own.

## Recommendation

Keep the frontend on GitHub Pages for now unless we decide the threat model justifies moving to a host or proxy that can emit headers.

If we stay on GitHub Pages:

- accept the residual clickjacking risk explicitly
- keep the parent-facing reset and score UI clearly labeled
- treat any browser-side frame-busting guard as defense in depth only, not as a security boundary
- defer CSP reporting until a header-capable host exists

If we move the frontend to a header-capable host or add a reverse proxy/CDN:

- enforce `frame-ancestors 'none'` in response headers
- start with `Content-Security-Policy-Report-Only`
- send reports to a backend endpoint for one release cycle
- promote the policy to enforcing headers after violations are fixed or documented

## Acceptance Criteria

This item is only done once one of these is true:

1. GitHub Pages stays the host and the repo documents that the remaining risk is accepted, or
2. the frontend moves to a header-capable host/proxy and the response-header plan is implemented.

## Follow-Up

- `spec/backlog.md` should point here for the header-security decision work.
- `spec/csp-clickjacking-plan.md` can remain as the older planning note, but this brief is the decision-focused source of truth.
