# ADR: Explorer Name Model

**Status:** Accepted
**Date:** 2026-03-29
**Deciders:** Repo owner + Claude
**Relates to:** Backlog Priority 4 — Privacy & Parent Safety (Ticket 3)

---

## Context

The app identifies each child by an explorer name (first name or nickname) entered at the start of a mission. This name is stored in Supabase (`test_scores.player_name`, `score_attempts.player_name`, `score_attempt_events.player_name`) and in browser localStorage.

Three models were evaluated:

| Option | Description |
|---|---|
| **A — Plain-text nicknames** | Keep the current approach. Child types any name; backend normalises and stores it as-is. |
| **B — Parent-managed profiles** | Parent creates child profiles (requires collecting parent email, full auth system, verifiable consent flow). |
| **C — Pseudonymous local aliases** | Generate a stable UUID per explorer; nickname is editable but the internal ID is immutable. |

---

## Decision

**Option A — Plain-text nicknames, hardened.**

The app's minimal data collection posture is a privacy advantage, not a gap. Collecting less data (no email, no accounts, no UUIDs) reduces compliance burden and attack surface. Options B and C introduce significant engineering complexity and require collecting additional personal data.

---

## Rationale

- Scores are not sensitive data — mission scores for an educational game carry low harm potential.
- The app does not expose a player list; you must know the exact name to look up a score.
- The admin PIN protects all destructive operations (reset, per-child delete).
- Data minimisation (GDPR Art. 5(1)(c)) favours the simplest model that meets the need.
- Options B and C both require collecting parent email or generating persistent device identifiers, increasing obligations under GDPR, COPPA, and LGPD.

---

## Mitigations adopted (implemented in PR #2)

| Risk | Mitigation |
|---|---|
| Child enters real full name | Input validation rejects email-like and phone-number-like patterns |
| Child enters email address | Regex reject on `/.+@.+\..+/` pattern before submission |
| Child enters phone number | Regex reject on phone-number-like digit patterns before submission |
| Name too long to be a nickname | Hard limit: 1–40 characters (already enforced backend + frontend) |
| Parent unaware data is saved | Consent notice before first name entry; UI hint: "Use a first name or fun nickname" |
| No parent guidance on what to type | Placeholder text: "First name or nickname" on the name input |

---

## Trigger conditions for revisiting

Revisit this decision if any of the following occur:

- Multi-device sync becomes a requirement (names must be portable across devices).
- Parent dashboards or class/school management features are requested.
- Name collisions become a reported problem in practice (siblings or classmates sharing a device and accidentally overwriting each other's scores).
- Regulatory guidance specifically recommends pseudonymous identifiers for apps in this category.

Until one of these triggers fires, Option A hardened is the correct choice.

---

## Consequences

- **Positive:** Minimal data, lowest compliance burden, no email infrastructure needed.
- **Positive:** No migration required — current data model stays unchanged.
- **Negative:** No immutable identity — a child can change their nickname and lose score history linkage (acceptable for this use case).
- **Negative:** No per-child access control — anyone who knows a name can look up that player's score (acceptable given the low sensitivity of mission scores).
