# Supabase Scoreboard Setup

This app saves progress and finished test results to Supabase and shows the best score for the child name typed into the start prompt.

## What stays out of the frontend

- The database password is not used by the website.
- The reset PIN is not stored in the website.
- The reset PIN is checked inside Supabase against a bcrypt hash.

## Setup steps

1. Open the Supabase SQL editor for this project.
2. Run [`scoreboard_setup.sql`](./scoreboard_setup.sql).
3. In the SQL editor, set the admin reset PIN:

```sql
select public.set_reset_pin('replace-with-your-reset-pin');
```

## Recommended follow-up

- Use a stronger reset PIN than a short numeric code.
- If a database password was shared in chat or elsewhere, rotate it in Supabase after setup.

## Notes

- The public site uses the publishable Supabase key, which is safe to expose in browser code.
- Re-run [`scoreboard_setup.sql`](./scoreboard_setup.sql) after this update so Supabase adds the `elapsed_seconds` field and refreshes the score lookup functions the frontend now calls.
- The score board trusts the score sent by the browser because this project is a static frontend. If we want tamper-resistant scoring later, we should move score submission behind a trusted server or Supabase Edge Function.
