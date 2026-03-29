# Priority 4 Delivery Plan: Privacy And Parent Safety

## Purpose

This plan expands the Priority 4 backlog items into an implementation roadmap that can be delivered across multiple PRs without losing compliance context. It focuses on child users, parent/admin controls, and globally deployable privacy safeguards (especially GDPR + ePrivacy cookie requirements).

> Compliance note: this is a product and engineering plan, not legal advice. Counsel review is a required gate before production rollout.

## Scope And Priority 4 Tickets

Backlog tickets covered by this plan:

1. Delete one child's record without clearing all records.
2. Clarify retention expectations for online score history, reset logs, and local fallback cache data.
3. Decide whether explorer names stay plain-text or move to a parent-managed profile model.
4. Decide whether parent reset moves from browser prompt to dedicated form with clearer confirmations/errors.

## Regulatory Baseline To Plan Against

Because children worldwide may use the app, delivery should meet a strict baseline first, then apply region-specific rules by configuration:

- **GDPR / UK GDPR**: lawful basis, purpose limitation, data minimization, retention limits, security controls, data subject rights, records of processing.
- **ePrivacy (EU cookie rules)**: consent before non-essential cookies/storage, clear choice, and revocation as easy as acceptance.
- **Children's privacy overlays** (country dependent):
  - COPPA-style parental notice/consent patterns for under-13 users in US contexts.
  - Age-appropriate design expectations (UK AADC, EU DSA risk expectations where relevant).
- **Cross-border transfer controls**: identify where backend + logs are hosted and document transfer mechanism(s).

Minimum engineering stance:

- No non-essential cookies/local storage without explicit consent in impacted jurisdictions.
- Collect only data needed for gameplay + parent safety.
- Default to shortest feasible retention windows.
- Build parent-facing delete/export/correction flows before adding new child profile features.

## Workstream A: Data Inventory, Classification, And Governance (Foundational)

### A1. Data map and ROPA-lite inventory

Create a durable inventory table (doc + implementation reference) for every field collected or derived:

- Explorer name (plain text today)
- Attempt telemetry (question order, correctness, elapsed time)
- Best-score row in Supabase
- Parent reset events and admin verification events
- Local fallback cache in browser storage
- Any analytics, error logs, CDN access logs

For each item capture:

- Purpose
- Data category (child personal data? pseudonymous? operational log?)
- Storage location and region
- Retention target + deletion trigger
- Access controls
- Legal basis / consent dependency

### A2. Privacy risk review (DPIA-lite)

Run a lightweight privacy impact assessment focused on:

- Child identifiers in plain text
- Shared-device risks (siblings/classrooms)
- Re-identification potential when combined with timestamps
- Abuse cases (unauthorized reset/delete attempts)

Output: risk register with owner, mitigation, and deadline; unresolved high risks block feature launch.

### A3. Policy artifact updates

Draft/update:

- Parent privacy notice (plain language)
- Data retention schedule
- Cookie/storage notice and consent text
- Internal incident + deletion SOP

## Workstream B: Per-Child Record Deletion

### B1. Product and UX decisions

- Add parent-facing "Delete this explorer" action scoped to one child name.
- Keep global reset, but separate visually and textually as a destructive bulk action.
- Add explicit consequences in UI (what is deleted locally vs remotely, what remains in logs).

### B2. Backend/API design

Add a new authenticated admin endpoint (example):

- `DELETE /api/v1/admin/scores/:playerName`

Requirements:

- Server-side admin verification (same or stronger than reset flow)
- Canonical normalization of `playerName`
- Idempotent response shape
- Audit event emission with actor metadata and request ID
- Rate limiting and abuse monitoring

### B3. Frontend integration

- Parent area list/search by explorer name.
- Confirmation dialog requiring typed explorer name (or equivalent high-friction confirm).
- Clear success/error states; retry guidance.
- Update scoreboard UI immediately after delete and invalidate local cache key.

### B4. Testing + rollout

- Unit tests for normalization, auth checks, and idempotent deletes.
- Route/integration tests for success, not-found, unauthorized, and rate-limited paths.
- Frontend behavior tests for confirmation and error copy.
- Staged rollout with feature flag and admin-only observability dashboard.

## Workstream C: Retention And Deletion Lifecycle

### C1. Retention matrix definition

Define explicit defaults (example targets for legal review):

- Best-score rows: retain while account/profile is active; auto-expire after inactivity window (e.g., 12 months).
- Reset/delete audit logs: short security retention (e.g., 90-180 days).
- Operational request logs: 30-90 days unless incident hold is active.
- Local fallback cache: short TTL (e.g., 30 days) + manual parent clear.

### C2. Technical enforcement

- Scheduled cleanup job for expired score rows and logs.
- DB-level timestamp indexing and purge procedures.
- Local cache schema version + expiry timestamp validation on read.
- "Right to erasure" admin workflow tying together remote deletion + local clear guidance.

### C3. Transparency in product copy

- Add parent-readable retention explanations in Parent Area and privacy notice.
- Add error copy for cases where data is already expired/deleted.

### C4. Verification

- Automated tests for TTL expiry behavior.
- Quarterly retention audit script + evidence artifact in repo/docs.

## Workstream D: Explorer Identity Model Decision (Plain Text vs Parent-Managed Profiles)

### D1. Decision options

Evaluate three options:

1. **Keep plain-text explorer names** with stronger minimization and deletion controls.
2. **Pseudonymous local aliases** (e.g., generated IDs, optional display nickname).
3. **Parent-managed profiles** with child slots and stronger access gating.

### D2. Decision criteria

Score each option against:

- Child privacy risk and re-identification risk
- Parent usability friction
- Shared-device behavior
- Backend complexity and migration risk
- Compliance posture in stricter jurisdictions

### D3. Migration plan (if changing model)

- Data migration mapping from normalized names to profile IDs.
- Backward-compatible read path for existing records.
- Parent communication and one-time migration UX.

### D4. Decision checkpoint

Record result as an ADR in `doc/decisions/` and update `product-spec.md` + `backend-api-spec.md` in same PR.

## Workstream E: Parent Reset UX Upgrade (Prompt -> Dedicated Form)

### E1. UX requirements

Replace browser prompt with dedicated parent reset screen/modal:

- PIN entry field with masked input and reveal toggle.
- Explicit destructive-action language.
- Secondary confirmation step.
- Accessible error handling and lockout feedback.

### E2. Security hardening

- CSRF/replay protections appropriate for architecture.
- Incremental lockout/backoff after failed PIN attempts.
- Structured audit logs for reset attempts and outcomes.
- Optional step-up verification design (future: email OTP or parent secret).

### E3. Engineering tasks

- Frontend component + validation states.
- Backend error taxonomy for invalid PIN, lockout, and transient failures.
- Shared API contract update and tests.

### E4. Acceptance and rollout

- Parent usability test with comprehension checks.
- Abuse simulation (rapid invalid attempts).
- Gradual rollout with kill switch.

## Workstream F: Cookies, Local Storage, And Consent Management

### F1. Storage audit

Inventory all browser storage usage:

- localStorage keys (records, flags, story mode settings)
- sessionStorage usage
- any third-party scripts or SDK storage side effects

Classify each as:

- Strictly necessary for requested service
- Functional preference
- Analytics/measurement
- Marketing (should remain disabled for child-first product)

### F2. Consent architecture

Implement region-aware consent flow:

- Consent banner/center for jurisdictions requiring opt-in before non-essential storage.
- Granular toggles (Necessary always on; optional categories off by default).
- Store consent receipts (timestamp, policy version, categories).
- Add "Change privacy choices" entry point in Parent Area.

### F3. Engineering constraints

- Block initialization of non-essential SDKs until consent is granted.
- Enforce consent checks before writing optional localStorage/cookies.
- Add automated tests proving no optional storage writes pre-consent.

### F4. Documentation

- Cookie table in privacy notice (name, purpose, duration, provider, category).
- Versioned change log for consent text.

## Workstream G: Child Safety, Access Control, And Abuse Monitoring

### G1. Parent/admin guardrails

- Strengthen admin endpoint protections (rate limits, request IDs, monitoring).
- Restrict dangerous actions to parent-authenticated context only.

### G2. Child-safe defaults

- Avoid exposing sensitive account details in child flow.
- Keep risky controls hidden/collapsed and require intentional parent entry.

### G3. Monitoring and alerts

- Alert on reset/delete bursts, repeated auth failures, unusual IP/device patterns.
- Document incident triage runbook with response SLAs.

## Suggested Delivery Sequence (Multi-PR)

1. **PR-1: Discovery + policy baseline**
   - Data inventory, retention draft, storage audit, risk register skeleton.
2. **PR-2: Per-child delete API + backend tests**
   - Endpoint, auth hardening, audit logs, integration coverage.
3. **PR-3: Parent UI for per-child delete + cache invalidation**
   - Dedicated flow and error handling.
4. **PR-4: Reset form UX replacement + backend lockout semantics**
   - Remove browser prompt dependency.
5. **PR-5: Consent manager + storage gating**
   - Region-aware consent and optional-storage enforcement.
6. **PR-6: Retention automation + erasure workflow + docs alignment**
   - TTL jobs, SOP, notices, ADR updates.

## Definition Of Done For Priority 4

Priority 4 is considered complete only when all conditions are met:

- Single-child deletion is available and audited end-to-end.
- Retention rules are documented, technically enforced, and user-visible.
- Explorer identity model decision is recorded with rationale and migration stance.
- Parent reset uses a dedicated UI flow with clear confirmation/error handling.
- Cookie/storage consent controls are compliant for GDPR/ePrivacy contexts.
- Parent-facing privacy copy is updated and reviewed.
- Security + privacy tests are part of CI and passing.

## Open Decisions To Resolve Early

- Legal age-threshold handling by region (single global default vs geolocated policy bundle).
- Whether any analytics is allowed in child sessions, and under what consent model.
- Whether parent accounts are in scope now or deferred to later milestone.
- Final retention windows after legal/security review.

## Immediate Next Actions (1-2 Sprint Planning Input)

- Assign directly responsible individuals for each workstream (Product, Backend, Frontend, Security, Legal).
- Create ticket epics mirroring Workstreams A-G and move the four backlog bullets under those epics.
- Add acceptance criteria templates to ensure each implementation ticket includes:
  - privacy impact note,
  - telemetry/audit requirement,
  - retention/deletion behavior,
  - UX copy requirement,
  - test coverage requirement.
