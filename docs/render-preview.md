# Render Preview Flow

Use the Render static site as a quick frontend preview environment for phone testing and manual UAT-style checks.

This preview is additive to GitHub Pages:

- **GitHub Pages** remains the main published frontend.
- **Render preview** is a temporary branch-based frontend for validating a change before merge.

## Current Service

- Service name: `giftedntalented-frontend-preview`
- Service type: Render static site
- Preview URL: `https://giftedntalented-frontend-preview.onrender.com`

The preview site should normally point to `master` when no active UAT-style test is running.

## When To Use It

Use the Render preview when at least one is true:

- you need to test a frontend change on a real phone without waiting for merge
- you want a temporary branch-hosted URL for manual review
- you need a stable environment to compare a feature branch against GitHub Pages

Do not treat the Render preview as a permanent second production frontend.

## Default State

When no branch-specific test is active:

- the Render preview service should point to `master`
- GitHub Pages remains the source of truth for the public frontend

## Quick UAT Workflow

1. Push the frontend branch you want to test.
2. In Render, open `giftedntalented-frontend-preview`.
3. Change the service branch from `master` to the branch you want to validate.
4. Trigger a deploy if Render does not start one automatically.
5. Test the branch at `https://giftedntalented-frontend-preview.onrender.com`.
6. When testing is complete, switch the service branch back to `master`.
7. Trigger one more deploy so the preview URL stops serving the temporary branch.

Important:

- a GitHub PR is optional for this workflow
- the branch alone is enough for Render preview testing
- if the test branch should never merge, close the PR and switch the preview site back to `master`

## Render Static Site Settings

If the static site needs to be recreated manually in Render, use:

- Branch: `master`
- Root Directory: empty
- Build Command: `node ./scripts/render-static-build.mjs`
- Publish Directory: `render-static`

No environment variables are required for the static frontend itself.

## Backend Dependency

The frontend preview calls the live Render backend:

- API: `https://giftedntalented.onrender.com`

The backend must allow the preview origin in `ALLOWED_ORIGINS`:

```text
https://dpourrat-cdx.github.io,https://giftedntalented-frontend-preview.onrender.com
```

If the preview site slug or domain changes, update that backend environment variable before expecting API calls to succeed.

## Repo Files That Support This Flow

- `render.yaml`
  - defines the preview static site and backend blueprint defaults
- `scripts/render-static-build.mjs`
  - builds the frontend-only publish directory for Render

## Guardrails

- Do not leave the preview site pointed at an old feature branch after testing.
- Do not rely on the preview branch as a substitute for merge review or CI.
- Do not change the preview site branch for backend-only work; this flow is for frontend validation.
