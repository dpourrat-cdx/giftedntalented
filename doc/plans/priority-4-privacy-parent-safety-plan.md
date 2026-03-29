# Priority 4 Plan: Privacy And Parent Safety

_Last updated: March 28, 2026._

## 1) Why this plan exists

Priority 4 backlog work needs a concrete implementation path that keeps the app usable for families while accounting for strict child privacy expectations in multiple regions.

This plan translates the four Priority 4 backlog tickets into an execution roadmap with:

- product and UX decisions,
- backend/frontend implementation work,
- legal and compliance checkpoints,
- testing and rollout controls.

## 2) Constraints and assumptions

Current architecture and behavior assumptions are based on the existing docs and codebase:

- The app is parent-mediated but children can interact directly with the gameplay UI.
- The system stores learner-facing identifiers (explorer names) and score history.
- A parent reset flow currently uses a browser prompt.
- Some local fallback cache/state exists in browser storage.

Because users may be children worldwide, the plan assumes compliance design must support:

- GDPR / UK GDPR (including ePrivacy cookie-consent requirements where relevant),
- COPPA (US child-directed context),
- country-level child consent age differences,
- data minimization and privacy-by-default as baseline principles.

> **Important:** legal counsel review is required before shipping policy text and final consent mechanics. Engineering should implement to a defensible privacy-by-design standard now so legal review is mostly validation, not rework.

## 3) Priority 4 tickets mapped to workstreams

## Ticket A — Delete one child record without clearing all records

### Goal
Allow parent/admin flow to remove one learner record (or one child profile) while preserving siblings/other records.

### Functional design

- Add per-record delete affordance in parent-facing score/history UI.
- Require explicit confirmation with non-ambiguous language:
  - identify target record by display name + created date,
  - explain impact (history removed, cannot be undone).
- Keep global reset separate to avoid accidental broad deletion.

### Data model + API work

- Define canonical key for a child record (avoid deletion by mutable plain-text name only).
- Add endpoint for scoped deletion (e.g., `DELETE /admin/children/:childId` or equivalent existing admin path extension).
- Ensure deletion removes:
  - remote score/history rows for that child,
  - linked reset artifacts tied only to that child,
  - any child-specific local cache entries after API success.
- Emit audit event for parent safety traceability (who/when/what scope).

### Security and abuse controls

- Reuse/admin-auth guard and anti-brute-force rate limits.
- Require high-confidence parent action (session/admin pin/re-auth as currently supported).
- Add idempotency behavior for repeated delete attempts.

### Acceptance criteria

- Parent can delete exactly one child profile/record from UI.
- Other children’s records remain unchanged.
- API, UI, and local cache states converge correctly after refresh/reload.
- Audit trail confirms a scoped deletion event.

---

## Ticket B — Clarify retention expectations (online score history, reset logs, local fallback cache)

### Goal
Define and enforce retention windows per data category; communicate those windows clearly to parents.

### Data inventory and retention matrix

Create a source-controlled retention matrix with at least these fields:

- data category,
- purpose,
- lawful basis / compliance rationale,
- storage location,
- retention duration,
- deletion trigger,
- user visibility,
- operator access scope.

Initial categories:

1. online score history,
2. reset logs / admin action logs,
3. local browser fallback cache,
4. telemetry/analytics (if any now or later),
5. security logs.

### Engineering enforcement

- Backend:
  - add scheduled purging or TTL logic for records past retention,
  - document manual emergency purge workflow,
  - ensure backups follow compatible retention policy.
- Frontend:
  - local cache expiry timestamps,
  - opportunistic cleanup on load and on parent actions,
  - clear data controls from parent settings.

### Communication deliverables

- Parent-facing “Data & Privacy” section in-app:
  - what data is stored,
  - how long data is retained,
  - how to request deletion/export.
- Repository docs:
  - architecture and API docs updated to match retention behavior.

### Acceptance criteria

- Retention windows are documented and implemented.
- Automated checks prove stale records are deleted/purged.
- Parent-facing copy matches actual backend/frontend behavior.

---

## Ticket C — Decide plain-text explorer names vs parent-managed profile model

### Goal
Choose a profile identity model that minimizes child risk and supports deletion/retention requirements.

### Option analysis to complete

#### Option 1: Keep plain-text names (hardened)

- Add strict character/length validation and profanity/sensitive text filtering.
- Store separately from immutable child ID.
- Treat name as editable label only.

Pros: low migration effort.  
Cons: higher risk of entering real names or personal data.

#### Option 2: Parent-managed profiles (recommended target)

- Parent creates/selects child profile cards.
- Child uses avatar + nickname or randomized codename, not free-text by default.
- Parent can edit/delete profile with explicit controls.

Pros: better minimization and safety posture, cleaner per-child deletion semantics.  
Cons: larger UX and migration scope.

### Decision framework

Score options across:

- child privacy risk,
- implementation complexity,
- migration impact,
- support burden,
- legal defensibility.

### Migration planning (if Option 2 chosen)

- Create stable `childId` records and map legacy name-only records.
- Add migration script for existing records.
- Add fallback mapping for duplicate names and conflict resolution UX.

### Acceptance criteria

- Architecture Decision Record (ADR) created and approved.
- Chosen model reflected in schema/API/frontend contracts.
- No data loss during migration path.

---

## Ticket D — Replace browser prompt reset flow with dedicated form

### Goal
Improve parent safety and reliability by replacing prompt-based reset with explicit, validated UI.

### UX requirements

- Dedicated parent reset page/modal with:
  - clear target scope (one child vs all children),
  - typed confirmation phrase or equivalent strong confirmation,
  - clear error and retry messaging,
  - accessible focus management and keyboard support.
- Distinguish “soft reset” vs “hard delete” semantics.

### Technical requirements

- Replace `window.prompt`/ad-hoc flow with controlled form state.
- Add client and server validation for reset payload.
- Add structured backend error codes surfaced in UI.
- Emit reset action audit logs.

### Acceptance criteria

- No browser prompt remains in reset path.
- Parent can complete reset with clear confirmation and recoverable errors.
- End-to-end tests cover success, cancellation, authorization failure, and network failure.

## 4) GDPR/ePrivacy + child privacy requirements checklist

This checklist should be implemented as concrete backlog subtasks and reviewed with counsel.

## 4.1 Data minimization and purpose limitation

- Collect only data needed for gameplay progress and parent safety.
- Avoid direct identifiers for children by default (real full names, emails, phone numbers).
- Separate operational logs from learner content.

## 4.2 Cookie and local storage governance

- Classify every cookie/storage key as:
  - strictly necessary,
  - preference,
  - analytics,
  - marketing.
- For GDPR/UK/EEA flows:
  - block non-essential cookies/storage until consent,
  - support granular opt-in and later withdrawal,
  - record consent version/time/region signal.
- Ensure gameplay-critical storage is documented as strictly necessary where applicable.
- Add “Reject all” parity with “Accept all” for non-essential categories.

## 4.3 Children’s data and verifiable parent involvement

- Ensure child-facing flows that alter stored data are parent-gated for sensitive operations.
- Add/confirm age-screening and parental mediation strategy if app usage context is mixed-age.
- For COPPA-like contexts, document how verifiable parental consent is handled or why data model avoids requiring it.

## 4.4 Data subject rights operations

- Build workflows for:
  - access/export request,
  - correction,
  - deletion (single child and all household data),
  - objection/restriction where required.
- Define SLA targets and operator runbooks.

## 4.5 International readiness

- Region-aware policy text and consent behavior toggles.
- Versioned privacy notice with changelog.
- Default to stricter behavior where geolocation confidence is low.

## 4.6 Security and accountability

- Record processing activities and system owners.
- Ensure audit logs for high-risk parent/admin actions.
- Validate least-privilege access for backend operators.

## 5) Detailed delivery plan (phased)

## Phase 0 — Discovery + legal alignment (1 sprint)

- Confirm data inventory and storage map (frontend + backend + third-party services).
- Draft retention matrix and cookie/storage classification.
- Hold legal review checkpoint (GDPR/ePrivacy/COPPA posture).
- Produce ADR template for Ticket C decision.

**Exit criteria:** approved privacy baseline and open legal questions list.

## Phase 1 — Safety foundations (1 sprint)

- Implement dedicated reset form skeleton + backend error contract.
- Add scoped single-child delete API and backend service path.
- Add audit log schema/events for delete/reset.
- Add frontend parent controls (feature-flagged).

**Exit criteria:** internal QA can perform scoped delete/reset with audit visibility.

## Phase 2 — Retention enforcement + parent transparency (1 sprint)

- Implement retention jobs/TTL and local cache expiration.
- Add parent-facing data/retention explainer UI.
- Update docs and runbooks.
- Add automated tests for purge behavior.

**Exit criteria:** retention policy is both documented and technically enforced.

## Phase 3 — Identity model decision execution (1–2 sprints)

- Complete option scoring and ADR approval.
- If parent-managed profiles selected:
  - implement profile model, migration path, and UX,
  - deprecate plain-text direct entry in child flow.
- If plain-text retained:
  - add strict validation/filtering and warning UX.

**Exit criteria:** chosen identity model is live with backward compatibility validated.

## Phase 4 — Consent and regional controls hardening (1 sprint, may overlap)

- Ship consent manager behavior for non-essential cookies/storage.
- Add consent preference center and withdrawal path.
- Add region-conditional behavior and policy version tracking.

**Exit criteria:** GDPR/ePrivacy consent mechanics verifiably enforced for applicable regions.

## 6) Test strategy

- Unit tests:
  - delete/reset validators, services, and error codes,
  - retention purge logic,
  - consent classification and gating helpers.
- Integration tests:
  - scoped delete vs global reset behavior,
  - audit log write + retention lifecycle,
  - migration behavior for identity model changes.
- Frontend behavior tests:
  - dedicated reset form flows,
  - parent-facing deletion controls,
  - consent banner behavior and persistence.
- Manual QA matrix:
  - mobile + desktop,
  - low-connectivity fallback paths,
  - locale/region variants.

## 7) Operational readiness

- Add dashboards/alerts for:
  - delete/reset error spikes,
  - purge job failures,
  - unusual admin action volume.
- Publish support playbook for parent requests and incident handling.
- Add rollback plan for each major privacy workflow release.

## 8) Risks and mitigations

- **Risk:** ambiguous legal posture across regions.  
  **Mitigation:** strict-default consent behavior + counsel sign-off before release.
- **Risk:** profile migration data mismatch.  
  **Mitigation:** dry-run migration + reconciliation script + staged rollout.
- **Risk:** parents misunderstand reset vs delete scope.  
  **Mitigation:** explicit UX language, confirmation, and post-action summaries.
- **Risk:** retention docs diverge from implementation.  
  **Mitigation:** PR checklist requires docs and tests with every retention change.

## 9) Definition of done for Priority 4

Priority 4 is complete when:

1. Parents can delete one child without wiping all records.
2. Reset flow uses a dedicated robust form (no browser prompt).
3. Retention policy is documented, parent-visible, and technically enforced.
4. Explorer identity model decision is recorded (ADR) and implemented.
5. Consent/cookie behavior is compliant by region for child-appropriate privacy defaults.
6. Automated tests and runbooks cover the new behavior.
