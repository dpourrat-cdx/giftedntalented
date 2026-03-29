# Priority 4 Delivery Plan: Privacy And Parent Safety

## Purpose

This document turns the Priority 4 backlog items into a concrete multi-ticket implementation plan with legal/privacy guardrails for a child-facing web app used internationally.

It is intentionally detailed so work can be split across multiple PRs without losing product, legal, or technical context.

## Scope And Source Tickets

Backlog scope in `doc/backlog.md`, Priority 4:

1. Add a way to delete one child's record without clearing all saved records.
2. Clarify retention expectations for online score history, reset logs, and local fallback cache data.
3. Decide whether explorer names should stay plain-text or eventually move to a parent-managed profile model.
4. Decide whether the parent reset flow should move from a browser prompt to a dedicated form with clearer confirmation and error handling.

## Current-State Snapshot (March 28, 2026)

### Frontend behavior

- Parent reset currently relies on browser `confirm` + `prompt` UX in `scoreboard.js`.
- Local fallback score cache is stored in browser `localStorage` under a scoreboard cache key.
- Score lookup and save flows still use explorer name as the primary identifier in user-facing interactions.

### Backend behavior

- Parent reset endpoint exists at `POST /api/v1/admin/scores/reset` and clears all score rows.
- Backend tracks attempt and score data through attempt-based save flow.
- No dedicated endpoint exists for deleting just one child profile/record.

## Compliance Lens (Design Constraints)

> This plan is product/engineering guidance, not formal legal advice. Before launch, run legal review for each target region.

When the app may be used by children globally, design to the strictest practical baseline:

- **Data minimization and storage limitation by default** (GDPR principles).
- **Child-understandable and parent-understandable notices** in plain language.
- **No non-essential cookies/storage before consent where required** (EU/UK style consent rules).
- **High privacy defaults for children** (UK children’s privacy expectations).
- **Parental control and deletion pathways** that are easy to use and verifiable.
- **US COPPA-conscious behavior** for under-13 users (notice + parental consent model if personal information collection is in scope).

## Delivery Strategy

Ship in four waves so each backlog item gets a concrete outcome while keeping risk manageable.

---

## Wave 0 - Discovery, Data Mapping, And Guardrails (Required Before Build)

### Objectives

- Confirm exactly what child-related data exists, where it is stored, and retention behavior today.
- Decide privacy baseline that all later tickets must satisfy.

### Tasks

1. **Create a data inventory matrix**
   - Fields: data element, source, storage location, purpose, legal basis candidate, retention candidate, deletion path, regional sensitivity.
   - Include at least: explorer name, scores, attempts, attempt events, reset metadata, local cache entries, and any analytics/device identifiers.

2. **Classify browser storage usage**
   - Distinguish strictly necessary storage vs optional analytics/telemetry.
   - Document whether any cookies are currently used and by whom (first-party vs third-party).

3. **Define age/region policy assumptions**
   - Decide launch assumption for consent/parent flow by geography (EU/EEA, UK, US, rest-of-world fallback).
   - Define how product behaves if age is unknown.

4. **Draft privacy acceptance criteria for all Priority 4 tickets**
   - Every ticket must include privacy-by-design checks.

### Deliverables

- `doc/privacy-data-map.md` (new, durable).
- `doc/privacy-baseline.md` (new, durable).
- Priority 4 ticket checklist updated with privacy acceptance criteria.

### Exit Criteria

- Team can answer: what personal data exists, why it exists, how long it lives, and how it is deleted.

---

## Wave 1 - Single-Child Record Deletion (Ticket 1)

### Product Decision

Add parent-initiated deletion of an individual child/explorer record, without full data reset.

### UX Plan

- Add a dedicated "Manage saved explorers" section in parent area.
- Allow parent to search/select one explorer name.
- Show clear irreversible-action warning.
- Require reset PIN (or equivalent parent verification step) before delete.
- Provide post-delete confirmation with timestamp and affected explorer name.

### Backend/API Plan

1. Add new endpoint (proposed):
   - `DELETE /api/v1/admin/scores/player/:playerName`
2. Validation:
   - Same normalization rules as score lookup/save name handling.
   - Reject empty/invalid names with clear errors.
3. AuthN/AuthZ:
   - Reuse parent reset PIN model short-term (aligned with current reset-route decision).
   - Consider migration path to stronger parent auth in future wave.
4. Data deletion semantics:
   - Delete only targeted player score row(s).
   - Define handling for related attempts/events:
     - Option A: hard delete linked attempt/events.
     - Option B: retain aggregated safety audit log with pseudonymized identifier.
   - Pick one and document rationale in a decision record.
5. Abuse controls:
   - Add dedicated rate limiter for per-child deletion endpoint.
   - Add structured audit event (without leaking raw child name in logs if avoidable).

### Frontend Engineering Tasks

- Replace ad hoc delete action with structured form + inline validation states.
- Add pending, success, and failure statuses for deletion.
- Ensure keyboard and screen-reader accessibility for confirmation flow.
- Ensure local cache purge for targeted player key only.

### Testing

- Backend unit/integration tests:
  - valid delete, missing player, invalid PIN, rate limit, storage failure.
- Frontend tests:
  - successful delete updates UI and cache.
  - cancellation path leaves data intact.
  - error messages are deterministic and user-friendly.
- Smoke tests:
  - full reset still works.
  - single delete does not impact other players.

### Acceptance Criteria

- Parent can delete one child record safely and predictably.
- Other child records remain untouched.
- Audit trail and logs meet privacy minimization rules.

---

## Wave 2 - Retention Policy, Deletion Timers, And Cookie/Storage Policy (Ticket 2)

### Product Decision

Publish explicit retention windows and enforce them in code + operations.

### Policy Outputs

Define and document retention windows for:

- Online best-score history (`test_scores` / equivalent).
- Attempt logs / event logs (`score_attempts`, `score_attempt_events`).
- Reset/admin action logs.
- Local browser fallback cache (`localStorage`).

Each class needs:

- retention duration,
- deletion trigger,
- legal/operational rationale,
- implementation owner,
- verification method.

### Engineering Tasks

1. **Server-side retention enforcement**
   - Add scheduled cleanup job or SQL routine for expired rows.
   - Add safe batching and observability metrics.

2. **Local storage TTL enforcement**
   - Add cache metadata timestamp and TTL checks on read/write.
   - Auto-prune stale entries.

3. **Cookie/storage consent controls**
   - If only strictly necessary storage is used: document exemption logic and avoid consent banner dark patterns.
   - If non-essential cookies/storage are introduced now or later:
     - block until opt-in where required,
     - provide reject-all equal prominence,
     - store consent proof and version.

4. **Policy/docs alignment**
   - Update privacy notice and parent-facing text to match actual behavior.
   - Version policy changes and record effective date.

### Testing

- Automated tests for TTL expiry behavior and cleanup job idempotency.
- Contract tests ensuring expired data is not returned by read endpoints.
- Manual QA for consent flow variants (accept/reject/close/no action).

### Acceptance Criteria

- Retention is no longer implied; it is explicit, enforceable, and tested.
- Browser data lifecycle is transparent and bounded.

---

## Wave 3 - Explorer Name Model Decision (Ticket 3)

### Decision To Make

Whether to keep plain-text explorer names as primary identifier or move to parent-managed profiles.

### Decision Framework

Score each option across:

- child safety/privacy risk,
- implementation complexity,
- migration risk,
- accessibility/parent usability,
- legal exposure (PII handling),
- offline resilience.

### Option A - Keep plain-text names (hardened)

- Keep current user model.
- Add stricter normalization and disallow high-risk patterns (email-like strings, phone-number-like entries).
- Add UI copy guiding parents not to use real full names.
- Add optional local aliasing (display nickname separate from stored stable identifier).

### Option B - Parent-managed profile model (recommended long-term)

- Parent creates child profiles (nickname + internal ID).
- Gameplay references child ID; display name can change without changing identity.
- Enables robust per-child controls (delete/export/retention/consent flags).
- Better foundation for global child privacy compliance and future parental dashboards.

### Required Discovery

- Migration strategy from existing plain-text records.
- Handling collisions and renamed children.
- Data model and API changes required.

### Deliverables

- ADR: `doc/decisions/profile-model.md` with final option and rationale.
- If Option B chosen, phased migration plan with backward compatibility window.

### Acceptance Criteria

- Decision is explicit and documented.
- Future tickets can build on stable identity model assumptions.

---

## Wave 4 - Replace Prompt-Based Reset With Dedicated Parent Form (Ticket 4)

### Product Decision

Move from browser `prompt`/`confirm` to dedicated parent reset form with explicit confirmation UX.

### UX Requirements

- Dedicated reset panel in parent area with:
  - masked PIN input,
  - explicit action scope ("delete one child" vs "delete all"),
  - typed confirmation for destructive all-data reset,
  - deterministic error messaging,
  - success receipt message.
- Anti-mistake design:
  - no ambiguous browser dialogs,
  - clear cancel path,
  - prevent duplicate submissions while request in flight.

### Security/Privacy Requirements

- Never log raw PIN client-side.
- Avoid storing PIN beyond request lifecycle.
- Distinguish auth errors vs network errors without exposing sensitive internals.
- Maintain rate limiting + abuse safeguards.

### Engineering Tasks

- Add parent reset form component and state machine.
- Refactor scoreboard controller reset handlers to use explicit modal/panel flow.
- Extend tests for validation, retries, and accessible error narration.

### Acceptance Criteria

- Parent reset actions are clearer, safer, and more testable.
- Browser-native prompt dependencies are removed.

---

## Cross-Cutting GDPR/Cookie/Children Requirements (Apply To All Waves)

1. **Data minimization**
   - Do not collect fields unless tied to a clear product need.

2. **Purpose limitation**
   - Every stored field has a documented purpose and owner.

3. **Storage limitation**
   - Every personal-data table/storage key has a retention timer and cleanup path.

4. **Consent and cookies/trackers**
   - No non-essential tracker before consent where required.
   - Strictly necessary storage only by default.

5. **Children-first defaults**
   - High privacy defaults.
   - No profiling/targeted advertising assumptions.

6. **Parental rights workflows**
   - Deletion/edit/export request paths should be practical and auditable.

7. **Plain-language notices**
   - Parent notices + child-facing copy in understandable language.

8. **Regionalization readiness**
   - Keep policy/config extensible for jurisdiction-specific behavior.

## Proposed Ticket Breakdown (Execution-Ready)

### Epic P4-A: Per-child deletion

- P4-A1: API + service delete-one-player implementation.
- P4-A2: Parent UI for per-child deletion.
- P4-A3: Tests + smoke + docs.

### Epic P4-B: Retention and storage policy

- P4-B1: Data inventory + retention matrix docs.
- P4-B2: Server cleanup automation.
- P4-B3: Local cache TTL + pruning.
- P4-B4: Privacy/cookie notice update.

### Epic P4-C: Identifier model decision

- P4-C1: Option analysis workshop + scorecard.
- P4-C2: ADR publication.
- P4-C3: (Conditional) migration technical design.

### Epic P4-D: Parent reset UX hardening

- P4-D1: UX specs + accessibility review.
- P4-D2: Frontend implementation.
- P4-D3: Error handling + telemetry + tests.

## Dependencies And Sequencing

Recommended sequence:

1. Wave 0 (mandatory).
2. Wave 2 policy definitions in parallel with Wave 1 API design.
3. Wave 1 implementation (per-child delete).
4. Wave 4 reset UX refactor (can start once Wave 1 auth decisions are stable).
5. Wave 3 profile-model ADR before any large identity-schema migration.

## Risk Register

- **Legal ambiguity by region**
  - Mitigation: legal checkpoint before launch per target market.
- **Identity collisions with plain-text names**
  - Mitigation: short-term normalization + long-term profile model.
- **Retention drift between code and docs**
  - Mitigation: CI check requiring retention table updates with schema changes.
- **Destructive admin UX errors**
  - Mitigation: dedicated form, explicit confirmation, and robust test coverage.
- **Cookie/consent regressions from third-party tooling**
  - Mitigation: third-party script review gate in PR checklist.

## Definition Of Done For Priority 4

Priority 4 is complete when all of the following are true:

- Single-child deletion exists and is tested.
- Retention policy is documented, implemented, and verified.
- Explorer-name model decision is captured in an ADR with a forward plan.
- Parent reset flow uses dedicated UI, not browser prompt dialogs.
- Privacy/cookie behavior is documented and aligned with child-focused global usage assumptions.

## Review Cadence

- Weekly privacy + product + engineering triage until Priority 4 closure.
- Monthly policy/doc drift review across:
  - `doc/backlog.md`
  - `doc/backend-api-spec.md`
  - privacy policy / parent notices
  - relevant ADRs.
