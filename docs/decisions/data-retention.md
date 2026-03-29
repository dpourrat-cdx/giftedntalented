# ADR: Data Retention Policy

**Status:** Accepted
**Date:** 2026-03-29
**Deciders:** Repo owner + Claude
**Relates to:** Backlog Priority 4 — Privacy & Parent Safety (Ticket 2)
**Legal basis:** GDPR Art. 5(1)(e), COPPA 16 CFR 312.10, LGPD Art. 16

---

## Context

All personal data must be retained only as long as necessary for the purpose for which it was collected. This ADR records the retention periods for each data type in the app, the technical mechanism that enforces them, and the implementation status.

---

## Retention Matrix

| Data type | Table / location | Purpose | Legal basis | Retention period | Deletion trigger | Implementation status |
|---|---|---|---|---|---|---|
| Best scores | `test_scores` | Display mission progress | Consent / legitimate interest | **12 months after last activity** (`last_active_at`) | Scheduled cleanup job | Pending — `last_active_at` column added in PR #3; cleanup job in PR #5 |
| Attempt state | `score_attempts` (completed) | Anti-cheat, attempt integrity | Strictly necessary | **30 days after `completed_at`** | Scheduled cleanup job | Pending — cleanup job in PR #5 |
| Attempt state | `score_attempts` (incomplete/expired) | In-progress session | Strictly necessary | **2 hours** (TTL via `expires_at`) | `expires_at` column already present; cleanup in PR #5 removes stale rows | Partially enforced — TTL column exists; periodic deletion pending PR #5 |
| Attempt audit | `score_attempt_events` | Troubleshooting, security | Legitimate interest | **Same as parent attempt** (cascade-deleted) | `ON DELETE CASCADE` from `score_attempts` | Already enforced by DB schema |
| localStorage cache | `gifted-scoreboard-player-best-scores-v2` | Offline score display | Strictly necessary | **30 days from last write** | TTL check on read; stale entries auto-removed | Pending — TTL enforcement added in PR #5 |
| FCM device tokens | `notification_devices` | Push notifications | Consent | **90 days of inactivity** (`updated_at`) | Scheduled cleanup job | Pending — cleanup in PR #5 |
| Render access logs | Render platform | Standard web server logging | Legitimate interest | **Per Render's retention policy** | Render-managed | Delegated to processor |
| Admin action audit | Application logs (Pino / Render) | Security tracing for reset/delete | Legitimate interest | **Per Render's log retention** | Render-managed | Delegated to processor |

---

## Activity signal design (`last_active_at`)

The 12-month retention for `test_scores` requires a "last activity" signal that survives beyond the 30-day attempt window.

**Design:** Add `last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` to `test_scores`. Update this column whenever a player starts a new attempt (`startAttempt()` in `attempt.service.ts`), regardless of whether the attempt improves the best score.

**Fallback before migration:** Until the `last_active_at` column exists, the cleanup query uses `completed_at` as the activity signal and documents this limitation. This is conservative — it may retain data slightly longer than 12 months for active players, but will not delete data too aggressively.

**Migration:** Added in `backend/supabase/migrations/` as part of PR #3.

---

## Cleanup mechanism

**Option B (backend endpoint + GitHub Actions cron) selected** — see `docs/plans/privacy-parent-safety.md` §4.2 for the options analysis.

A `POST /api/v1/admin/maintenance/cleanup` endpoint (added in PR #5) runs the four cleanup queries. A GitHub Actions scheduled workflow calls it daily at 03:00 UTC via `curl` with the `X-Admin-Key` header.

Cleanup queries (run in order):

```sql
-- 1. Stale scores (no activity in 12 months)
DELETE FROM test_scores
WHERE last_active_at < NOW() - INTERVAL '12 months';

-- 2. Old completed attempts
DELETE FROM score_attempts
WHERE completed_at IS NOT NULL
  AND completed_at < NOW() - INTERVAL '30 days';

-- 3. Expired incomplete attempts
DELETE FROM score_attempts
WHERE completed_at IS NULL
  AND expires_at < NOW();

-- 4. Stale FCM tokens
DELETE FROM notification_devices
WHERE updated_at < NOW() - INTERVAL '90 days';
```

`score_attempt_events` rows are cascade-deleted by query 2 and 3 automatically.

---

## Disclosure requirement

These retention periods must be disclosed in the privacy policy (`privacy.html`, Section 5 — "How long we keep it"). See PR #2.

---

## Consequences

- **Positive:** Defined retention periods satisfy GDPR Art. 5(1)(e), COPPA 16 CFR 312.10, and LGPD Art. 16 disclosure requirements.
- **Positive:** Automated cleanup reduces long-term storage cost and data breach exposure.
- **Negative:** `last_active_at` requires a schema migration and an `attempt.service.ts` update; these must ship together in PR #3.
- **Negative:** Cleanup depends on the backend being reachable at 03:00 UTC; a Render cold-start or downtime window could delay cleanup by up to 24 hours (acceptable).
