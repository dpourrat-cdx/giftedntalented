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

## Current Repo Decision

Keep `POST /api/v1/admin/scores/reset` on the current public parent flow for now.

The backend stays responsible for verifying the reset PIN server-side, and the browser keeps using the parent-facing prompt. The admin key does not enter the browser.

Reason:

- the current product still treats reset as a parent control
- the backend already keeps the secret server-side
- the existing PIN flow avoids putting `X-Admin-Key` into the browser
- moving to owner-only `X-Admin-Key` would require a product/UI redesign, not just a backend auth tweak

## What Would Change This

Revisit the route only if we decide to reclassify reset as a true admin action and are willing to redesign the parent UI around that change.
