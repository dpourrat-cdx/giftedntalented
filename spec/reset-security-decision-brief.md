# Reset Endpoint Security Decision Brief

## Current Behavior

`POST /api/v1/admin/scores/reset` is currently a public browser-reachable route that accepts a `resetPin` in the request body.

What the backend does today:

- applies `resetLimiter`
- validates `resetPin` with Zod
- looks up the stored `reset_pin_hash` from `app_admin_settings`
- checks the submitted PIN with `bcrypt.compare`
- deletes all rows from `test_scores`
- deletes all rows from `score_attempts`
- relies on cascade delete to clear `score_attempt_events`

Observed adjacent behavior:

- `POST /api/v1/admin/push/send` already requires `X-Admin-Key`
- the reset route does not use `adminAuth`
- the frontend still presents reset as a parent control, not a hidden admin-only action

## Options

### Option A: Keep the public parent flow

This keeps the current browser-facing reset path and continues using the reset PIN.

Pros:

- preserves the existing parent UX
- avoids exposing the admin key to the browser
- keeps reset available as a parent control instead of a separate admin workflow
- matches the current product framing in the frontend and product docs

Cons:

- the route remains publicly reachable, even if protected by PIN verification
- the reset PIN still has to be handled through a browser prompt
- the endpoint stays distinct from the other admin-key-protected surface

### Option B: Make reset owner-only with `X-Admin-Key`

This would move reset into the same authorization model as admin push send.

Pros:

- stronger authorization model for a destructive operation
- consistent with the existing `ADMIN_API_KEY` pattern
- removes reset PIN handling from the browser path
- reduces the chance that reset is treated like a normal parent-facing feature

Cons:

- breaks the current parent-facing reset flow
- requires a product/UX change, because the browser cannot safely hold the admin key
- would likely need a backend-mediated admin action or a separate owner-only control surface

## Recommendation

Keep the public parent flow for now.

Reason: the current product still treats reset as a parent control, the backend already keeps the secret server-side, and the existing PIN flow avoids putting `X-Admin-Key` into the browser. Moving to owner-only `X-Admin-Key` is the right choice only if we are willing to reclassify reset as a true admin action and redesign the parent UI around that change.
