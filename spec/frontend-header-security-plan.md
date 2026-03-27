# Frontend Header Security Plan

This note captures the two remaining frontend-header security items that cannot be finished entirely inside the current GitHub Pages hosting model:

1. clickjacking protection
2. CSP reporting

## Current Constraint

The frontend is served from GitHub Pages and enforces CSP through a `<meta http-equiv="Content-Security-Policy">` tag in `index.html`.

That works for basic fetch, script, style, image, and font restrictions, but it does **not** give us full parity with response-header-based CSP.

Practical consequences:

- `frame-ancestors` in a meta CSP does not provide real clickjacking protection on GitHub Pages.
- CSP reporting directives (`report-to`, `report-uri`) are not a good fit for the current meta-CSP setup.
- Any durable solution for either item requires a host or proxy that can emit real response headers.

## Clickjacking Options

### Option A: Explicit risk acceptance on GitHub Pages

Keep the frontend on GitHub Pages and document that true anti-framing enforcement is not available in the current hosting model.

Pros:

- no hosting migration
- no runtime behavior change
- cheapest short-term option

Cons:

- no real `frame-ancestors` protection
- security posture depends on browser behavior and user navigation context, not a hard policy

### Option B: Add a JavaScript frame-busting fallback

Add a small client-side guard that breaks out of frames when possible and shows a refusal state when it cannot.

Pros:

- better than silent acceptance
- can ship without changing hosts

Cons:

- not equivalent to response-header enforcement
- can be bypassed in hostile framing contexts
- adds runtime behavior that needs UI testing

### Option C: Move the frontend to a header-capable host

Serve the static frontend from a host that can emit CSP and frame headers, such as a Render static site, Cloudflare Pages with headers, Netlify, or a small reverse-proxy layer in front of the current assets.

Pros:

- real `frame-ancestors` / `X-Frame-Options` style protection
- unlocks CSP reporting at the same time
- cleanest long-term security posture

Cons:

- hosting migration work
- deploy and cache changes
- possible DNS / custom-domain follow-up

## CSP Reporting Options

### Option A: Defer until hosting changes

Do not add reporting directives while the frontend is still served with a meta CSP.

Pros:

- avoids a half-working reporting setup
- keeps the current CSP simple and honest

Cons:

- no browser-fed CSP telemetry for violations

### Option B: Add reporting after moving to response headers

Once the frontend is on a header-capable host:

- send `Content-Security-Policy` as a real response header
- add `report-to` and optionally `report-uri`
- route reports to a lightweight endpoint or third-party collector
- alert only on repeated or high-signal violations

Recommended endpoint characteristics:

- accepts batched browser reports
- rate-limited
- stores only minimal request metadata
- can be reviewed alongside backend smoke/deploy checks

## Recommendation

Short term:

- accept the GitHub Pages clickjacking limitation explicitly
- do not add fake or non-functional CSP reporting yet

Medium term:

- finish frontend CSP tightening in-repo
- then decide whether frontend hosting should move to a platform that can emit security headers

If hosting stays on GitHub Pages long term:

- document the residual clickjacking risk
- consider a lightweight frame-busting fallback as a defense-in-depth measure, but not as a substitute for real headers

If hosting moves:

- implement real `frame-ancestors` protection
- add CSP reporting in the same rollout
