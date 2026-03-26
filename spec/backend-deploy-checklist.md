# Backend Deploy Checklist

Use this when the Render backend or the `master` branch changes.

## Before Merge

- Confirm the backend tests pass locally.
- Confirm the TypeScript check passes locally.
- Confirm the new smoke runner is available with `npm run smoke:live`.

## After Deploy

- Verify `GET /api/v1/health` returns `status: ok` and Supabase is healthy.
- Verify the Supabase schema migration is present, including the `score_attempts` table and its update trigger.
- Verify `POST /api/v1/players/:playerName/record` returns `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- Verify the attempt flow works end to end with the smoke script:
  - start attempt
  - submit answer
  - finalize attempt
  - confirm no score is saved for the wrong-answer smoke run
- If the smoke script fails with `PGRST205`, the `score_attempts` schema migration is not present in Supabase yet.
- If any check fails, stop and investigate before publishing the change.

## One-Command Smoke

Run from `backend/`:

```bash
npm run smoke:live
```

Set `BACKEND_BASE_URL` if you need to target a non-production backend.
