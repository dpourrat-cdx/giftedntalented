# Privacy & Parent Safety — Implementation Plan

**Status:** Planning (not yet started)
**Created:** March 28, 2026
**Covers:** Backlog Priority 4 — all four tickets

This plan accounts for GDPR (EU), UK Age Appropriate Design Code, COPPA (US), LGPD (Brazil), and general international best practices for a children's educational web app used by ages 5–12.

> This is a product and engineering plan, not legal advice. Legal counsel review is a required gate before shipping policy text and final consent mechanics.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Legal Landscape Summary](#2-legal-landscape-summary)
3. [Ticket 1: Per-Child Record Deletion](#3-ticket-1-per-child-record-deletion)
4. [Ticket 2: Data Retention Policy](#4-ticket-2-data-retention-policy)
5. [Ticket 3: Explorer Name Model Decision](#5-ticket-3-explorer-name-model-decision)
6. [Ticket 4: Parent Reset UX Redesign](#6-ticket-4-parent-reset-ux-redesign)
7. [Cross-Cutting: Privacy Policy](#7-cross-cutting-privacy-policy)
8. [Cross-Cutting: Parental Consent Flow](#8-cross-cutting-parental-consent-flow)
9. [Cross-Cutting: Data Processing Agreements](#9-cross-cutting-data-processing-agreements)
10. [Cross-Cutting: Data Breach Response](#10-cross-cutting-data-breach-response)
11. [Implementation Phases](#11-implementation-phases)
12. [Execution-Ready Epic/Ticket Breakdown](#12-execution-ready-epicticket-breakdown)
13. [Risks and Mitigations](#13-risks-and-mitigations)
14. [Definition of Done for Priority 4](#14-definition-of-done-for-priority-4)
15. [Open Questions for the Owner](#15-open-questions-for-the-owner)
16. [External Compliance References](#16-external-compliance-references)

---

## 1. Current State Assessment

### What data is collected

| Data element | Storage location | Personal data? | Notes |
|---|---|---|---|
| Explorer name (first name / nickname) | Supabase `test_scores.player_name`, `score_attempts.player_name`, `score_attempt_events.player_name`, localStorage | **Yes** | Plain text, case-insensitive, 1–40 chars. Combined with scores and device-local storage, this identifies an individual child. |
| Scores & percentages | Supabase `test_scores`, localStorage (`gifted-scoreboard-player-best-scores-v2`) | **Yes** | Linked to the explorer name profile |
| Attempt history | Supabase `score_attempts`, `score_attempt_events` | **Yes** | Question selections, answers, timing data — linked to explorer name |
| Admin PIN hash | Supabase `app_admin_settings` | **Yes** | bcrypt-hashed authentication credential |
| FCM device token | Supabase `notification_devices` (optional) | **Yes** | Persistent device identifier; currently optional, backend-only |

### What data is NOT collected

- No cookies
- No IP address logging (beyond standard web server access logs on Render)
- No third-party analytics (no Google Analytics, no Segment, no tracking pixels)
- No geolocation
- No email addresses
- No full names, addresses, or contact information
- No cross-site tracking identifiers

### Browser storage inventory

| Key / mechanism | Type | Purpose | Classification | Retention | Vendor |
|---|---|---|---|---|---|
| `gifted-scoreboard-player-best-scores-v2` | localStorage | Cache best scores per explorer for offline display and faster load | Strictly necessary | Persistent until parent clear or app reset | First-party |
| `gifted-scoreboard-player-best-scores` (legacy) | localStorage | Legacy cache key, auto-cleaned on load | Strictly necessary (migration) | Deleted on first load | First-party |
| _(no cookies)_ | — | — | — | — | — |
| _(no sessionStorage)_ | — | — | — | — | — |

All current browser storage is strictly necessary for the requested service (ePrivacy Directive Art. 5(3) exemption). No consent banner is required for storage. If non-essential storage is ever added (analytics, preferences beyond core function), consent must be obtained before write in EEA/UK jurisdictions.

### Current privacy controls

- **Bulk reset** via admin PIN (`POST /api/v1/admin/scores/reset`) — deletes ALL scores and attempts for ALL players. No per-child option.
- **Rate limiting** on reset endpoint (5 attempts per 15 minutes).
- **CSP** via HTML meta tag (GitHub Pages cannot send response headers).
- **Frame-busting** script to prevent iframe embedding.
- **Helmet** middleware on backend (X-Content-Type-Options, X-Frame-Options, etc.).
- **CORS** whitelist on backend.
- **No privacy policy** exists today.
- **No parental consent flow** exists today.
- **No data retention policy** is defined.

---

## 2. Legal Landscape Summary

### Jurisdictions and why they apply

This app is publicly accessible on GitHub Pages. Any child worldwide can use it. The following regulations apply because the app is **directed at children under 13** and processes their personal data:

| Regulation | Jurisdiction | Key age threshold | Parental consent required? |
|---|---|---|---|
| **GDPR** Art. 8 | EU/EEA | 13–16 (varies by country) | Yes — for all target users (ages 5–12) |
| **UK Children's Code** | United Kingdom | Under 18 (graduated) | Yes — high-privacy defaults mandatory |
| **COPPA** 16 CFR 312 | United States | Under 13 | Yes — "verifiable parental consent" |
| **LGPD** Art. 14 | Brazil | Under 12 | Yes — "specific and prominent" consent |
| **APPI** | Japan | No fixed age (capacity-based) | Yes — for ages 5–12 |
| **Privacy Act** | Australia | No fixed age (capacity-based) | Expected for under-13s |

### Key legal requirements for this app

1. **Parental consent before data collection** — required in every jurisdiction. Cannot rely on the child's own consent for ages 5–12.
2. **Per-child right to erasure** — GDPR Art. 17, COPPA 16 CFR 312.10. Bulk-only deletion is insufficient.
3. **Privacy policy** — required everywhere, must be written in child-friendly language (layered: simple for kids, detailed for parents).
4. **Data minimisation** — collect only what is necessary. Current approach (nickname + scores) is good.
5. **Defined retention period** — must be disclosed and enforced.
6. **Push notifications off by default** — UK Children's Code Standard 7, GDPR, COPPA.
7. **Data breach notification** — 72 hours (GDPR/UK), "promptly" (others).
8. **International data transfers** — Supabase, Render, and Firebase may store data outside the EU/UK. Must ensure adequate safeguards (Standard Contractual Clauses or equivalent).
9. **No profiling of children** — GDPR Recital 71, UK Children's Code Standard 12. Scores must not be used for profiling, targeted content adaptation, or marketing.

### What the app already gets right

- **No cookies** — no cookie banner needed.
- **localStorage for core functionality only** — qualifies for the ePrivacy "strictly necessary" exemption, no consent banner needed for localStorage itself.
- **Minimal data collection** — only nickname + scores, no email/address/full name.
- **No third-party tracking or analytics** — excellent for data minimisation.
- **No profiling** — scores are not used to adapt difficulty or target content.
- **Frame-busting** — protects against clickjacking.
- **FCM is optional and off by default** — aligns with "high privacy by default."
- **No marketing, no ads, no data selling** — the cleanest possible commercial posture.

---

## 3. Ticket 1: Per-Child Record Deletion

> Backlog: "Add a way to delete one child's record without clearing all saved records."

### Why this is legally required

- **GDPR Art. 17(1)(f):** A parent has the right to request erasure of their specific child's data. Offering only bulk deletion does not satisfy this.
- **COPPA 16 CFR 312.6(a)(2):** A parent must be able to "request deletion of the child's personal information."
- **LGPD Art. 14 + Art. 18(VI):** Right to erasure of the specific child's data.

### Implementation plan

#### 3.1 Backend: New API endpoint

**`DELETE /api/v1/admin/players/:playerName/records`**

| Aspect | Detail |
|---|---|
| Auth | Admin PIN in request body (same mechanism as bulk reset) |
| Rate limit | Same as reset: 5 attempts per 15 minutes per IP |
| Behaviour | Delete all `test_scores` rows for the given `player_name` (case-insensitive). Delete all `score_attempts` and cascading `score_attempt_events` for that player. Return `{ deletedScoreCount, deletedAttemptCount, playerName, deletedAt }`. |
| Validation | `playerName` path param: 1–40 chars, trimmed. `resetPin` body param: non-empty string. |
| Error cases | 401 `INVALID_RESET_PIN` if PIN doesn't match. 404 `PLAYER_NOT_FOUND` if no records exist for that name. |
| Idempotency | If called twice for the same player after deletion, return 404. |

#### 3.2 Backend: Service layer

Add to `score.service.ts`:

```
deletePlayerRecords(playerName: string, resetPin: string): Promise<{
  deletedScoreCount: number;
  deletedAttemptCount: number;
  playerName: string;
  deletedAt: string;
}>
```

Steps:
1. Verify admin PIN (reuse existing `verifyResetPin()` logic).
2. Count existing records for the player (for the response).
3. Delete from `score_attempts` WHERE `lower(btrim(player_name)) = lower(btrim($1))` — cascade deletes events.
4. Delete from `test_scores` WHERE `lower(btrim(player_name)) = lower(btrim($1))`.
5. Return counts and timestamp.

#### 3.3 Backend: Route and validation

Add route in the admin router:
- `DELETE /api/v1/admin/players/:playerName/records`
- Reuse `resetLimiter` middleware.
- Zod schema for body: `{ resetPin: z.string().min(1) }`.
- Zod/validation for `playerName` param: string, 1–40 chars after trim.

#### 3.4 Security requirements

- **Never log the raw admin PIN** — not in application logs, not in audit events, not in error messages.
- **Do not persist the PIN beyond the request lifecycle** — verify against the stored hash and discard immediately.
- **Audit events should record:** actor context (IP hash or request ID), target player name, action type, result, timestamp. Avoid storing raw child names in logs where a pseudonymised identifier would suffice.
- **Distinguish auth errors from network errors** in API responses without exposing internal implementation details.

#### 3.5 Frontend: UI for per-child deletion

Add a "Delete one explorer" option in the parent controls area (near the existing "Reset Saved Scores" button):

1. Parent clicks "Delete one explorer's records."
2. `window.prompt("Enter the explorer name to delete:")` — collects the name.
3. `window.prompt("Enter the admin PIN to confirm deletion:")` — collects the PIN.
4. Frontend calls `DELETE /api/v1/admin/players/{name}/records` with `{ resetPin }`.
5. On success: remove the player from localStorage cache, show confirmation message.
6. On 401: show "Invalid admin PIN" error.
7. On 404: show "No records found for that explorer."
8. On network failure: show "Could not reach the server. Local records for this explorer have been cleared." and remove from localStorage only.

**Note:** This `window.prompt` flow will be replaced with a proper form UI in Ticket 4, but this gets the backend functionality in place first.

#### 3.6 Tests

- `score.service.test.ts`: Test `deletePlayerRecords` — happy path, wrong PIN, player not found, database errors.
- New route test or integration test for the `DELETE` endpoint.
- `scoreboard.frontend.test.ts`: Test the per-child deletion UI flow (prompt, API call, localStorage cleanup, error states).
- Smoke test: create two child records, delete one, verify the other remains intact.

#### 3.7 Documentation

- Update `docs/backend-api-spec.md` with the new endpoint.
- Update `docs/decisions/reset-route.md` to explain the per-child deletion addition and why it uses the same PIN mechanism.

---

## 4. Ticket 2: Data Retention Policy

> Backlog: "Clarify retention expectations for online score history, reset logs, and local fallback cache data."

### Why this is legally required

- **GDPR Art. 5(1)(e):** Data must be kept "for no longer than is necessary."
- **COPPA 16 CFR 312.10:** Must retain personal information "only as long as reasonably necessary."
- **LGPD Art. 16:** Data must be deleted after the processing purpose ends.
- All frameworks require the retention period to be **disclosed in the privacy policy**.

### Retention matrix

| Data type | Purpose | Legal basis | Recommended retention | Deletion trigger | Owner |
|---|---|---|---|---|---|
| `test_scores` (best scores) | Display mission progress | Consent / legitimate interest | **12 months after last activity** for that player | Scheduled cleanup job, or parent request | Backend cleanup job |
| `score_attempts` (in-progress) | Anti-cheat, attempt integrity | Strictly necessary for service | **2 hours** (active, via `expires_at`); **30 days** (completed) | Scheduled cleanup job | Backend cleanup job |
| `score_attempt_events` (audit) | Troubleshooting, security audit | Legitimate interest | **30 days** (cascade with attempt deletion) | Cascade delete | Backend cleanup job |
| localStorage cache | Offline score display | Strictly necessary | **No automatic expiration** (device-local) | Parent clear, app reset, or browser clear. Disclose in privacy policy. | Frontend / user action |
| FCM device tokens | Optional push notifications | Consent | **90 days of inactivity** | Scheduled cleanup job | Backend cleanup job |
| Render access logs | Standard web server logging | Legitimate interest | **Per Render's retention policy** | Render-managed | Render (processor) |
| Admin action audit logs | Security tracing for reset/delete | Legitimate interest | **90 days** | Scheduled cleanup job | Backend cleanup job |

### Implementation plan

#### 4.1 Automated cleanup job

Create a scheduled Supabase function (or a backend cron endpoint) that runs daily:

1. **Delete stale scores:** `DELETE FROM test_scores WHERE completed_at < NOW() - INTERVAL '12 months'` — but only if the player has had no activity (no attempts started) in the last 12 months. Use a subquery:
   ```sql
   DELETE FROM test_scores ts
   WHERE ts.completed_at < NOW() - INTERVAL '12 months'
   AND NOT EXISTS (
     SELECT 1 FROM score_attempts sa
     WHERE lower(btrim(sa.player_name)) = lower(btrim(ts.player_name))
     AND sa.started_at > NOW() - INTERVAL '12 months'
   );
   ```

2. **Delete old completed attempts:** `DELETE FROM score_attempts WHERE completed_at IS NOT NULL AND completed_at < NOW() - INTERVAL '30 days'` — cascade deletes events.

3. **Delete expired incomplete attempts:** `DELETE FROM score_attempts WHERE expires_at < NOW() AND completed_at IS NULL` — cleanup abandoned attempts beyond the 2-hour TTL.

4. **Delete stale FCM tokens:** `DELETE FROM notification_devices WHERE updated_at < NOW() - INTERVAL '90 days'` (if FCM is in use).

#### 4.2 Backend implementation options

**Option A — Supabase pg_cron extension:**
- Enable `pg_cron` in Supabase.
- Schedule a PL/pgSQL function to run daily at 03:00 UTC.
- Pro: No backend involvement, runs even if the Express server is down.
- Con: Requires Supabase plan that supports `pg_cron` (check availability).

**Option B — Backend scheduled endpoint (recommended):**
- Add `POST /api/v1/admin/maintenance/cleanup` (admin-key protected).
- Call it via an external cron service (Render cron job, or a GitHub Actions scheduled workflow).
- Pro: Easy to implement, test, and log. Safe batching and observability metrics.
- Con: Requires the backend to be running.

**Option C — On-demand cleanup in existing flows:**
- Run cleanup queries opportunistically when a reset or delete is triggered.
- Pro: Simplest, no cron needed.
- Con: Cleanup only happens when someone uses the app.

**Recommendation:** Start with Option B for testability, then consider migrating to Option A if pg_cron is available.

#### 4.3 Local cache TTL enforcement

Add optional TTL metadata to localStorage cache entries:
- On write: include a `cachedAt` timestamp alongside the score data.
- On read: if `cachedAt` is older than 30 days, treat the entry as stale and remove it.
- Auto-prune stale entries opportunistically at app load.

This provides a safety net if a child stops using the app but their scores linger on a shared device indefinitely.

#### 4.4 Documentation

- Create `docs/decisions/data-retention.md` documenting the policy, the retention periods, and the justification.
- Reference this policy in the privacy policy (Section 7).
- Update `docs/backend-api-spec.md` if a cleanup endpoint is added.

#### 4.5 Tests

- Test the cleanup queries in isolation (mock Supabase, verify correct WHERE clauses).
- Test edge cases: player with a recent attempt should NOT have scores deleted even if the score's `completed_at` is old.
- Test local cache TTL expiry logic.
- Contract tests ensuring expired data is not returned by read endpoints after cleanup.

---

## 5. Ticket 3: Explorer Name Model Decision

> Backlog: "Decide whether explorer names should stay plain-text or eventually move to a parent-managed profile model."

### Analysis

#### Option A — Keep plain-text nicknames (recommended for now)

**Pros:**
- Already implemented and working.
- Minimal data — a nickname like "Alex" or "RocketGirl" is the least invasive identifier possible.
- No email collection, no account creation — avoids significant COPPA/GDPR consent complexity.
- Data minimisation: collecting less data is always better from a privacy standpoint.

**Cons:**
- No access control: anyone who knows or guesses a name can view that player's score.
- No authentication: a child can type any name and see/overwrite records.
- No way to associate a parent with a specific child for consent/deletion requests (must use admin PIN for all actions).
- Risk of children entering real full names, email-like strings, or phone numbers.

**Mitigations (if Option A is chosen):**
- Scores are not sensitive data (mission scores for educational games).
- The admin PIN protects destructive operations (reset, delete).
- The app does not expose a player list — you must know the exact name to look up a score.
- Add input validation to reject high-risk patterns (email-like strings, phone-number-like entries, strings longer than a reasonable first name).
- Add UI copy guiding parents: "Use a first name or fun nickname — not a full name or email address."
- Add optional profanity/sensitive-text filtering as a safety measure.

#### Option B — Parent-managed profiles

**Pros:**
- Parent creates child profiles after consent, giving explicit control.
- Each profile could have its own access token for per-child auth.
- Natural fit for per-child deletion, consent tracking, and data export.
- Better foundation for global child privacy compliance and future parental dashboards.

**Cons:**
- Requires collecting **parent email** (or another contact method) — significantly increases COPPA/GDPR compliance burden.
- Requires a full authentication system (signup, login, password reset, email verification).
- Requires verifiable parental consent (COPPA "Email Plus" at minimum).
- Much more engineering work and ongoing maintenance.
- More personal data = more risk = more obligations.

#### Option C — Pseudonymous local aliases

**Pros:**
- Generate a stable internal ID (UUID) per explorer, with an editable display nickname.
- Child sees their nickname; backend stores/queries by internal ID.
- Changing or correcting a nickname does not break score history linkage.
- Better deletion and export semantics (target by immutable ID, not mutable name).
- No parent email required.

**Cons:**
- Migration from current name-based system requires a mapping step.
- Shared-device collisions (siblings) still possible if nicknames overlap visually.
- Adds backend and frontend complexity beyond Option A, though less than Option B.

**When to consider:** If Option A's plain-text model causes practical problems (name collisions in classrooms, children entering real names despite guidance), Option C provides a middle ground without the full weight of Option B.

### Decision recommendation

**Keep plain-text nicknames (Option A, hardened)** for the current scope. The app's minimal data collection is a privacy advantage, not a gap. Add the input validation, UI guidance, and optional filtering described in the mitigations. Document this decision and revisit if usage patterns change.

**Trigger conditions for revisiting:**
- Multi-device sync becomes a requirement.
- Parent dashboards or class/school management features are needed.
- Name collisions become a reported problem.
- Regulatory guidance specifically recommends pseudonymous identifiers for this use case.

**Action items:**
1. Create `docs/decisions/explorer-name-model.md` documenting the decision, Options A/B/C, the mitigations adopted, and the trigger conditions for revisiting.
2. Add a short note in the privacy policy: "We collect only a first name or nickname chosen by the child. We do not collect email addresses, full names, home addresses, or other contact information."
3. Add input validation rejecting email-like and phone-number-like patterns in the name field.
4. Add UI hint text: "Use a first name or fun nickname."

---

## 6. Ticket 4: Parent Reset UX Redesign

> Backlog: "Decide whether the parent reset flow should move from a browser prompt to a dedicated form with clearer confirmation and error handling."

### Why the current `window.prompt` approach is insufficient

1. **Accessibility:** `window.prompt()` and `window.confirm()` produce browser-native dialogs that cannot be styled, are not screen-reader-friendly on all platforms, and do not support password masking for the PIN.
2. **Error handling:** Native dialogs cannot show inline error messages (wrong PIN, network failure). The current flow shows status messages in a separate area after the dialog closes.
3. **UK Children's Code Standard 15:** Must provide "prominent, accessible tools" for exercising data rights. A `window.prompt` is not prominent or accessible.
4. **Combined flow needed:** Per-child deletion (Ticket 1) and bulk reset should be in a unified parent controls area, not scattered across separate prompts.

### Proposed design: Parent Controls Panel

#### 6.1 UI structure

Add a collapsible "Parent Controls" section at the bottom of the app (below the scoreboard area):

```
┌─────────────────────────────────────────┐
│  [🔒 Parent Controls]     [▼ Expand]    │
└─────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────┐
│  🔒 Parent Controls                     │
│                                         │
│  Admin PIN: [________] [Show/Hide]      │
│                                         │
│  ┌─ Delete One Explorer ──────────────┐ │
│  │ Explorer name: [________________]  │ │
│  │ [Delete this explorer's records]   │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌─ Reset All Records ───────────────┐ │
│  │ This will permanently delete      │ │
│  │ every explorer's saved records    │ │
│  │ on this device and online.        │ │
│  │                                   │ │
│  │ [Reset all explorer records]      │ │
│  └────────────────────────────────────┘ │
│                                         │
│  Status: [___________________________]  │
│                                         │
│  ── Privacy ──                          │
│  [View Privacy Policy]                  │
│  [Download my child's data]             │
│                                         │
└─────────────────────────────────────────┘
```

#### 6.2 Behaviour

1. **Panel toggle:** Collapsed by default. Clicking "Parent Controls" expands it. No authentication to expand (the PIN is entered inside).
2. **Admin PIN field:** `<input type="password">` with a show/hide toggle. Entered once, used for all actions in the session. Not stored in localStorage (cleared on page refresh).
3. **Delete one explorer:** Text input for the name + confirmation button. On click:
   - Inline confirmation: "Are you sure you want to delete all records for [name]? This cannot be undone." with [Cancel] and [Confirm Delete] buttons.
   - On success: inline success message with timestamp + clear the name field.
   - On error: inline error message (wrong PIN, not found, network failure).
4. **Reset all records:** Confirmation button with inline "Are you sure?" step (same pattern). Typed confirmation phrase ("delete all") for the bulk destructive action.
5. **Status area:** Shows success/error messages inline, styled with the existing `is-success`, `is-error`, `is-info` CSS classes.
6. **Privacy Policy link:** Links to the privacy policy page (see Section 7).
7. **Data export:** "Download my child's data" button — calls a new endpoint to export the child's data as JSON. See section 6.3.

#### 6.3 Anti-mistake design principles

- **No ambiguous browser dialogs** — all confirmation happens inline with clear, styled UI.
- **Clear cancel path** at every step — no trapped flows.
- **Prevent duplicate submissions** — disable buttons while a request is in flight.
- **Separate destructive actions visually** — per-child delete and bulk reset should not look the same. Use colour, spacing, and copy to distinguish severity.
- **Post-action receipt** — after any destructive action, show a clear summary of what was deleted, when, and that it cannot be undone.

#### 6.4 Data export endpoint (supports GDPR Art. 15 right of access)

**`GET /api/v1/admin/players/:playerName/export`**

| Aspect | Detail |
|---|---|
| Auth | Admin PIN in `X-Admin-Pin` header (or query param for simplicity) |
| Rate limit | 5 per 15 minutes per IP |
| Response | JSON with all data for that player: scores, attempts, events |
| Format | Machine-readable (JSON) per GDPR Art. 20 (right to data portability) |

Response shape:
```json
{
  "playerName": "Alex",
  "exportedAt": "2026-03-28T12:00:00Z",
  "scores": [ { "score": 8, "totalQuestions": 10, ... } ],
  "attempts": [ { "attemptId": "...", "answers": [...], ... } ],
  "events": [ { "eventType": "answer_accepted", ... } ]
}
```

#### 6.5 PIN security requirements

- PIN input uses `type="password"` — never displayed in plain text by default.
- **Never log the raw PIN client-side** — not to console, not to error tracking, not to localStorage.
- **Do not store the PIN beyond the page session** — cleared on page refresh, never written to localStorage or sessionStorage.
- **Distinguish auth errors from network errors** in the UI without exposing whether the PIN was close to correct.
- Maintain the existing rate limiting (5 attempts per 15 minutes) with lockout/backoff feedback in the UI.

#### 6.6 Implementation steps

1. **HTML:** Add a `<section id="parentControls">` to `index.html` (collapsed by default).
2. **CSS:** Style the panel with existing design tokens. Use `is-hidden` for collapse state.
3. **JS:** New `parent-controls.js` script (or extend `scoreboard.js`):
   - Toggle expand/collapse.
   - PIN field handling (show/hide, validation).
   - Delete-one flow (inline confirm → API call → status).
   - Reset-all flow (typed confirmation → API call → status).
   - Data export flow (name input → API call → trigger download).
4. **Backend:** Add the export endpoint (see 6.4).
5. **Tests:** Frontend tests for the panel behaviour, backend tests for the export endpoint.

#### 6.7 Accessibility requirements

- All form inputs have `<label>` elements with descriptive text.
- PIN input has `type="password"` and `autocomplete="off"`.
- Buttons have clear, descriptive text (not just icons).
- Status messages use `role="status"` or `role="alert"` for screen readers.
- Panel can be navigated with keyboard (Tab, Enter, Escape to close).
- Colour is not the only indicator of success/error (text messages accompany colour changes).
- Focus management: after a destructive action completes, move focus to the status message.

---

## 7. Cross-Cutting: Privacy Policy

### Why this is required

Every jurisdiction requires a privacy policy when personal data is collected from children. COPPA specifically requires it to be linked from every page where data is collected and from the homepage.

### Content requirements

The privacy policy must cover (synthesised from GDPR Art. 13, COPPA 16 CFR 312.4, UK Children's Code Standard 4, LGPD Art. 14):

#### Section 1 — Who we are
- App name: Captain Nova's Rocket Mission
- Operator: [owner name and contact info — must be a real person or entity]
- Contact email for privacy requests

#### Section 2 — What data we collect
- Explorer name (first name or nickname chosen by the child)
- Mission scores and percentages
- Mission attempt history (questions, answers, timing)
- Device-local cache (localStorage — scores cached on this device)
- Optional: push notification token (if FCM is enabled)
- What we do NOT collect: email, full name, address, cookies, location, browsing history

#### Section 3 — Why we collect it
- To save and display mission scores
- To enable the parent reset and per-explorer deletion features
- To provide the educational gameplay experience

#### Section 4 — How we store it
- Online: Supabase (PostgreSQL database), hosted by Supabase Inc.
- Backend server: Render (render.com)
- Optional push notifications: Firebase Cloud Messaging (Google)
- Device-local: browser localStorage (stays on the device)
- Hosting regions: [disclose specific regions — check Supabase/Render/Firebase project settings]

#### Section 5 — How long we keep it
- Best scores: 12 months after last activity, then automatically deleted
- Mission attempts: 30 days after completion, then automatically deleted
- localStorage: until cleared by the parent or browser
- Push notification tokens: 90 days of inactivity

#### Section 6 — Who we share it with
- **We do not sell data.** We do not share data with advertisers or marketers.
- Data processors: Supabase Inc. (database), Render (backend hosting), Google/Firebase (optional push notifications only)
- We do not share data with any other third parties

#### Section 7 — International data transfers
- Data may be stored in [US/EU — check provider regions]
- Safeguards: Standard Contractual Clauses with Supabase and Render; Google's Data Processing Terms for Firebase
- [Disclose specific transfer mechanisms used]

#### Section 8 — Parent rights
- **Access:** Request a copy of your child's data (export feature in Parent Controls)
- **Correction:** Update your child's explorer name
- **Deletion:** Delete one child's records or all records (Parent Controls)
- **Withdraw consent:** Stop using the app and request deletion
- **Complaint:** File a complaint with your local data protection authority (link to EU DPA list, ICO, FTC)

#### Section 9 — Security
- Data is encrypted in transit (HTTPS) and at rest (Supabase encryption)
- Admin PIN is hashed with bcrypt
- Rate limiting on sensitive endpoints
- Content Security Policy and frame-busting protections

#### Section 10 — Changes to this policy
- We will update this page when the policy changes
- Versioned change log with effective dates
- Last updated: [date]

### Implementation

1. Create `privacy.html` at the repo root (served by GitHub Pages alongside `index.html`).
2. Write the policy in simple, clear language. Use short sentences. Avoid legal jargon.
3. Add a "kid-friendly summary" box at the top: "We only save your explorer name and mission scores. Your parent can delete them anytime. We don't track you or sell your information."
4. Add a link to `privacy.html` in `index.html` (footer area and in the Parent Controls panel).
5. Add a link in the backend's `/` health endpoint response (optional).

---

## 8. Cross-Cutting: Parental Consent Flow

### The challenge

GDPR and COPPA require **parental consent before collecting personal data** from children under their respective age thresholds. Since all target users (ages 5–12) are below every threshold, consent is always required.

However, the app currently collects data (explorer name + scores) as soon as a child types a name and starts a mission. There is no consent gate.

### Options

#### Option A — Minimal consent notice (recommended for current scope)

Display a clear notice **before the child enters their name** explaining:
- What data will be saved (name and scores)
- That a parent should be present or have agreed
- Link to the privacy policy

This is NOT full verifiable parental consent (VPC), but it is a reasonable first step for a small, free, non-commercial educational app. The FTC has historically focused enforcement on commercial operators with significant user bases.

**Implementation:**
1. Before the name input becomes active, show a notice panel:
   ```
   "Before starting, a parent or guardian should know that we save your
   explorer name and mission scores. Read our Privacy Policy for details.
   By entering a name and starting the mission, a parent or guardian agrees
   to our Privacy Policy."
   ```
2. Add a "I'm a parent — I understand" checkbox or button that enables the name input.
3. Store the consent acknowledgment in localStorage so it's not shown every session on the same device.

#### Option B — Email-based verifiable parental consent (COPPA "Email Plus")

Full COPPA compliance for US users:
1. Before the child can play, parent provides their email.
2. Backend sends a consent notification email with a confirmation link or PIN.
3. Parent clicks the link or enters the PIN on the app.
4. Only after confirmation can the child enter a name and play.

**This requires:**
- Collecting parent email (more personal data — increases compliance burden).
- Email sending infrastructure (SendGrid, Postmark, etc.).
- Consent record storage (which parent consented, when, for which child, policy version).
- An unsubscribe/revoke flow.

**Recommendation:** Defer Option B until the app has a larger user base or faces specific regulatory pressure. Option A provides a reasonable, good-faith consent mechanism for a small educational app while avoiding the significant engineering and operational burden of email-based VPC.

### Decision needed from owner

Choose between Option A (consent notice, simpler) and Option B (email VPC, legally stronger). See [Open Questions](#15-open-questions-for-the-owner).

---

## 9. Cross-Cutting: Data Processing Agreements

### What is required

Under GDPR Art. 28, when personal data is processed by a third party on behalf of the controller, a Data Processing Agreement (DPA) must be in place. The same concept exists under COPPA, LGPD, and the UK GDPR.

### Third-party processors

| Processor | Service | DPA available? | Action needed |
|---|---|---|---|
| **Supabase Inc.** | PostgreSQL database | Yes — Supabase DPA available at supabase.com/legal | Review and sign/accept the DPA. Verify it includes Standard Contractual Clauses for EU transfers. |
| **Render** | Backend hosting | Yes — Render DPA available at render.com/legal | Review and sign/accept the DPA. |
| **Google (Firebase)** | Optional push notifications | Yes — Google Cloud Data Processing Terms | Review and accept if FCM is in use. |
| **GitHub (Pages)** | Frontend hosting | GitHub's Terms of Service apply | GitHub does not process personal data on behalf of the app — it serves static files. No DPA needed. |

### Action items

1. Review each processor's DPA for adequacy (especially international transfer mechanisms).
2. Accept/sign each DPA through the respective platform's settings.
3. Keep a record of accepted DPAs (date, version) in `docs/decisions/data-processing-agreements.md`.
4. Disclose processors in the privacy policy.

---

## 10. Cross-Cutting: Data Breach Response

### Why this is needed

GDPR Art. 33–34 requires notification within **72 hours** of becoming aware of a breach. COPPA, LGPD, and APPI have similar requirements. Breaches involving children's data are treated with heightened severity by regulators.

### Notification timeline

| Jurisdiction | Notify authority | Notify individuals | Timeline |
|---|---|---|---|
| GDPR (EU) | Supervisory authority | If high risk to rights/freedoms | 72 hours |
| UK GDPR | ICO | If high risk | 72 hours |
| COPPA (US) | FTC (if enforcement) | Per state breach laws | ASAP / per state law |
| LGPD (Brazil) | ANPD | If significant risk | "Reasonable" timeframe |
| APPI (Japan) | PPC | If risk of harm | Promptly |
| Australia | OAIC | If serious harm likely | As soon as practicable |

### Incident response plan (to be created)

Create `docs/decisions/data-breach-response.md` documenting:

1. **Detection:** How breaches are identified (monitoring alerts, user reports, vendor notifications).
2. **Assessment:** Severity classification (what data was exposed, how many children affected, likelihood of harm).
3. **Containment:** Immediate steps to stop the breach (revoke credentials, patch vulnerability, disable affected endpoints).
4. **Notification:** Who to notify, when, and how — using the timeline table above.
5. **Remediation:** Root cause analysis, fix, and prevention measures.
6. **Record-keeping:** Document every breach (even non-notifiable ones) in a breach register.

### Monitoring and alerting

- Alert on unusual patterns: reset/delete bursts, repeated auth failures, elevated error rates on admin endpoints.
- Alert on Supabase/Render security notifications.
- Review third-party vendor security bulletins regularly.

---

## 11. Implementation Phases

### Phase 0 — Discovery and decisions (before any code)

**Deliverables:**
- [ ] `docs/decisions/explorer-name-model.md` — ADR for name model decision
- [ ] `docs/decisions/data-retention.md` — retention policy decision
- [ ] `docs/decisions/data-processing-agreements.md` — DPA records
- [ ] `docs/decisions/data-breach-response.md` — incident response plan
- [ ] Review and accept DPAs with Supabase, Render, Firebase
- [ ] Owner answers the open questions in Section 15

**Estimated scope:** 1–2 PRs, documentation-heavy, no backend changes.

### Phase 1 — Privacy policy + consent notice

**Deliverables:**
- [ ] `privacy.html` — privacy policy page
- [ ] Link to privacy policy in `index.html` footer
- [ ] Consent notice before name input (Option A or B per owner decision)
- [ ] Name input validation (reject email-like, phone-number-like patterns)
- [ ] UI hint: "Use a first name or fun nickname"

**Estimated scope:** 1 PR, frontend-only.

### Phase 2 — Per-child deletion (backend + minimal frontend)

**Deliverables:**
- [ ] `DELETE /api/v1/admin/players/:playerName/records` endpoint
- [ ] `deletePlayerRecords()` in `score.service.ts`
- [ ] Route, validation, rate limiting
- [ ] Temporary `window.prompt` UI for per-child deletion (will be replaced in Phase 4)
- [ ] Tests for all of the above
- [ ] Update `docs/backend-api-spec.md`

**Estimated scope:** 1 PR, moderate backend work + tests.

### Phase 3 — Automated data cleanup

**Deliverables:**
- [ ] Cleanup endpoint or Supabase function
- [ ] Scheduled execution (Render cron or pg_cron)
- [ ] Local cache TTL enforcement (optional `cachedAt` timestamp + 30-day expiry)
- [ ] Tests for cleanup queries and local cache expiry
- [ ] Update `docs/backend-api-spec.md` if endpoint-based

**Estimated scope:** 1 PR, moderate backend work.

### Phase 4 — Parent Controls panel redesign

**Deliverables:**
- [ ] `<section id="parentControls">` in `index.html`
- [ ] CSS for the panel
- [ ] `parent-controls.js` (or extension of `scoreboard.js`)
- [ ] Data export endpoint (`GET /api/v1/admin/players/:playerName/export`)
- [ ] Remove old `window.prompt`/`window.confirm` reset flow
- [ ] Accessibility audit of the panel
- [ ] Tests for all frontend and backend changes

**Estimated scope:** 2–3 PRs (backend endpoint, frontend panel, integration).

### Phase 5 — Compliance hardening (as needed)

**Deliverables (only if usage grows or regulatory pressure requires it):**
- [ ] Email-based verifiable parental consent (Option B)
- [ ] DPIA (Data Protection Impact Assessment) document
- [ ] kidSAFE or ESRB Safe Harbor certification
- [ ] Region-aware consent behaviour (EEA/UK strict mode vs rest-of-world)

---

## 12. Execution-Ready Epic/Ticket Breakdown

### Epic P4-A: Per-Child Deletion
- **P4-A1:** API + service `deletePlayerRecords` implementation + tests
- **P4-A2:** Admin route, validation, rate limiting + route tests
- **P4-A3:** Temporary `window.prompt` frontend + localStorage cleanup + frontend tests
- **P4-A4:** Documentation updates (`docs/backend-api-spec.md`, `docs/decisions/reset-route.md`)

### Epic P4-B: Retention and Cleanup
- **P4-B1:** Data retention decision document (`docs/decisions/data-retention.md`)
- **P4-B2:** Server cleanup endpoint + SQL queries + tests
- **P4-B3:** Scheduled execution setup (Render cron or pg_cron)
- **P4-B4:** Local cache TTL enforcement + frontend tests

### Epic P4-C: Explorer Name Model
- **P4-C1:** Decision analysis and ADR (`docs/decisions/explorer-name-model.md`)
- **P4-C2:** Name input validation (reject email-like, phone-like patterns) + UI hint
- **P4-C3:** (Conditional, if Option C chosen) Migration technical design + implementation

### Epic P4-D: Parent Reset UX
- **P4-D1:** Parent Controls panel HTML/CSS + collapse/expand + accessibility review
- **P4-D2:** PIN field, delete-one flow, reset-all flow + frontend tests
- **P4-D3:** Data export endpoint + backend tests
- **P4-D4:** Remove old `window.prompt`/`window.confirm` flow

### Epic P4-E: Privacy Policy and Consent
- **P4-E1:** `privacy.html` content + kid-friendly summary
- **P4-E2:** Consent notice before name input + localStorage acknowledgment
- **P4-E3:** Footer link in `index.html` + Parent Controls panel link

### Epic P4-F: Compliance Foundations
- **P4-F1:** DPA review and acceptance records
- **P4-F2:** Data breach response plan document
- **P4-F3:** (Optional) DPIA document
- **P4-F4:** (Optional) kidSAFE/ESRB Safe Harbor application

---

## 13. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Legal ambiguity across regions | Medium | High | Default to strictest practical baseline. Legal checkpoint before launch. |
| Profile migration complexity (if Option C chosen later) | Low | Medium | Dual-read migration window. Rollback plan. Only trigger if current model fails. |
| Parent UX complexity increase | Medium | Medium | Task-focused UI copy. Progressive disclosure (collapsed panel). Accessibility testing. |
| Retention docs diverge from implementation | Medium | Medium | PR checklist requiring docs update with every retention-affecting change. |
| Cookie/consent regressions from future third-party scripts | Low | High | Third-party script review gate in PR checklist. No non-essential scripts without consent mechanism. |
| Children entering real names despite guidance | Medium | Low | Input validation for email/phone patterns. UI hint text. Not a blocker since first names alone are low-risk. |
| Data breach involving children's data | Low | Very High | Incident response plan. Monitoring/alerting. 72-hour notification process. |

---

## 14. Definition of Done for Priority 4

Priority 4 is complete when **all** of the following are true:

1. Parents can delete one child's records without wiping all records — tested and documented.
2. Retention policy is documented, parent-visible, and technically enforced with automated cleanup.
3. Explorer name model decision is recorded in an ADR with rationale and forward plan.
4. Parent reset uses a dedicated UI form, not browser `prompt`/`confirm` dialogs.
5. Privacy policy is published, linked from the app, and covers all required sections.
6. Parental consent mechanism is in place (Option A or B per owner decision).
7. Data Processing Agreements are reviewed and accepted with all processors.
8. Data breach response plan is documented.
9. Automated tests cover all new behaviour.
10. All new privacy-related docs match the actual implementation.

---

## 15. Open Questions for the Owner

These decisions require human input and cannot be made by the agents alone:

1. **Operator identity for the privacy policy:** GDPR and COPPA require disclosing the name, address, email, and (for COPPA) phone number of the data controller/operator. Who should be listed? An individual name, a business entity, or another arrangement?

2. **Parental consent level:** Option A (consent notice — simpler, good-faith, sufficient for a small free app) or Option B (email-based verifiable parental consent — legally stronger, significantly more engineering)? See [Section 8](#8-cross-cutting-parental-consent-flow).

3. **Supabase hosting region:** Where is the Supabase project hosted? If in the US, EU users' data crosses borders — the privacy policy must disclose this and the DPA must include Standard Contractual Clauses. Consider whether migrating to an EU-region Supabase instance is worthwhile.

4. **Firebase Cloud Messaging:** Is FCM currently active in production? If not used, consider removing the FCM code entirely to reduce the data processing surface area and the number of required DPAs.

5. **Data retention periods:** Are the recommended periods (12 months for scores, 30 days for attempts, 90 days for FCM tokens) appropriate? A shorter period (e.g., end of school year) might be more aligned with the educational use case.

6. **Compliance budget:** Is there budget for a kidSAFE or ESRB Safe Harbor certification? These cost $1,000–5,000/year but provide a compliance framework and some liability protection.

7. **Legal review:** Should a lawyer review the privacy policy and consent flow before publication? Recommended for any app directed at children, even a small one.

8. **Analytics future:** Are there plans to add any analytics or telemetry in the future? If so, the consent architecture must be designed now to support opt-in before non-essential tracking is activated.

---

## 16. External Compliance References

Use these authoritative sources during implementation and legal review:

- **GDPR full text** (Regulation (EU) 2016/679): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- **ePrivacy Directive** (Directive 2002/58/EC): https://eur-lex.europa.eu/eli/dir/2002/58/oj
- **UK ICO Children's Code** overview and guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/
- **FTC COPPA Rule** hub: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
- **Brazil LGPD** full text (Lei 13.709/2018): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- **EDPB Guidelines 05/2020** on consent: https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en

---

_Review cadence: revisit this plan monthly during active Priority 4 work. Check for drift between this plan, `docs/backlog.md`, `docs/backend-api-spec.md`, the privacy policy, and the actual implementation._
