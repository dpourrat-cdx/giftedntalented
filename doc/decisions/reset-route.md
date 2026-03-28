# Reset Route Decision

## Current Behavior

`POST /api/v1/admin/scores/reset` is a public browser-reachable route that accepts a `resetPin` in the request body.

Today the backend:

- applies `resetLimiter`
- validates `resetPin` with Zod
- looks up `reset_pin_hash` from `app_admin_settings`
- checks the submitted PIN with `bcrypt.compare`
- deletes rows from `test_scores`
- deletes rows from `score_attempts`
- relies on cascade delete to clear `score_attempt_events`

Adjacent behavior:

- `POST /api/v1/admin/push/send` requires `X-Admin-Key`
- the reset route does not use `adminAuth`
- the frontend still presents reset as a parent control

## Decision

Keep `POST /api/v1/admin/scores/reset` on the current parent-facing flow for now.

The backend remains responsible for verifying the reset PIN server-side, and the browser keeps using the parent-facing prompt. The admin key does not enter the browser.

Reason:

- the current product still treats reset as a parent control
- the backend already keeps the secret server-side
- the existing PIN flow avoids putting `X-Admin-Key` into the browser
- moving to owner-only `X-Admin-Key` would require a product and UI redesign, not just a backend auth tweak

## Future Trigger

Revisit this route only if reset is reclassified as a true admin action and the parent UX is redesigned around that change.
