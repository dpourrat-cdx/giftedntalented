# Priority 4 Delivery Plan: Privacy And Parent Safety

Last updated: March 28, 2026.

## Why this plan exists

Priority 4 has four open backlog tickets that all affect children, parent controls, and personal-data handling. This plan turns those tickets into a sequenced implementation program with explicit compliance checkpoints, including GDPR/ePrivacy cookie requirements and child-focused safeguards for global use.

This is a product-engineering plan, not legal advice. The team should run legal review before launch in each target market.

## Scope and success criteria

### In scope

- Child-level deletion (without global reset)
- Data retention + deletion expectations across backend and local fallback storage
- Explorer-name data model direction (plain-text vs parent-managed profile)
- Parent reset UX evolution from browser prompt to dedicated flow
- Consent and cookie/storage controls that support GDPR/ePrivacy and child privacy baselines

### Success criteria

- Parents can delete only one child profile and related score history from both remote storage and device fallback cache.
- Retention timelines and deletion mechanisms are documented, implemented, and test-covered.
- Parent-facing privacy controls explain what data is kept, where, for how long, and how to erase it.
- Any non-essential cookies/storage writes are blocked until consent (where required).
- Child defaults are privacy-protective (minimal collection, minimal retention, no unnecessary tracking).

## Regulatory baseline to design against

Use this baseline for engineering decisions and legal review checklists:

1. **GDPR core principles**: purpose limitation, data minimization, storage limitation, integrity/confidentiality, accountability.
2. **GDPR children**: Article 8 parental-consent considerations for information-society services offered directly to children.
3. **ePrivacy cookie rule**: non-essential cookies or similar storage technologies require consent before write/read in many EEA jurisdictions.
4. **UK child-design expectations**: high privacy defaults, minimal profiling/tracking, clear parent and child notices.
5. **COPPA alignment for U.S. children under 13** (if U.S. child-directed usage applies): parental notice/consent, data minimization, deletion support.

Because this product may be used globally by children, treat the strictest practical baseline as default unless geo-specific legal counsel approves regional divergence.

## Current-state gaps (from Priority 4)

1. No parent flow to delete one child record; only broad reset behavior exists.
2. Retention policy is not yet explicit for online score history, reset logs, and device fallback cache.
3. Explorer names are plain text and not yet paired with a parent-managed identity model.
4. Parent reset UX relies on browser prompt/confirm, limiting clarity, validation UX, and audit-friendly behavior.
5. Cookie/storage consent logic is not formalized for child-related international compliance.

## Program structure

Deliver Priority 4 through six workstreams. The first four map directly to the backlog tickets; the last two are compliance enablers.

## Workstream A — Child-level delete flow

### Objective

Allow a parent to delete one child profile/record history without clearing all data.

### Implementation plan

1. **Data model and API**
   - Define child-scope deletion semantics (single player/explorer identifier).
   - Add backend endpoint for per-child deletion with parent authorization.
   - Ensure idempotent behavior (deleting an already-deleted child returns safe success).
2. **Frontend parent UX**
   - Add dedicated parent action: "Delete one child record".
   - Require explicit child selection + typed confirmation.
   - Show clear outcome states: success, not found, auth failure, network failure.
3. **Device fallback cache handling**
   - Remove only selected child entries from local fallback store.
   - Keep all unrelated child records intact.
4. **Auditability**
   - Add structured backend log events for delete attempts and results.
   - Avoid storing raw child names in logs where not necessary.

### Acceptance criteria

- Parent can remove only selected child data from backend and local fallback cache.
- Other child records remain untouched.
- Automated tests cover auth, success, not found, and partial-failure rollback/compensation behavior.

## Workstream B — Retention and deletion policy

### Objective

Define and implement transparent retention windows and deletion triggers.

### Policy decisions to finalize

1. **Online score history**
   - Decide retention horizon (example: rolling 12 months from last activity).
   - Decide whether inactive child data is auto-deleted or anonymized.
2. **Reset and admin logs**
   - Keep only security-relevant metadata and bounded retention (example: 30-90 days).
   - Exclude unnecessary payload details and child identifiers.
3. **Local fallback cache**
   - Add TTL/expiration metadata for device-stored score records.
   - Clear stale records automatically at app load.

### Implementation plan

- Document retention matrix (data type, purpose, legal basis, retention period, deletion job owner).
- Add backend cleanup job or scheduled task for retention enforcement.
- Add frontend local-cache expiry logic.
- Add parent-facing retention/deletion explanation in product docs and UI help text.

### Acceptance criteria

- Every persisted data class has explicit retention + deletion owner.
- Retention jobs run successfully in non-prod and prod.
- Parent-facing docs match implementation.

## Workstream C — Explorer identity model decision

### Objective

Decide whether to keep plain-text explorer names or move to parent-managed child profiles.

### Options

1. **Option 1: Keep plain-text names (short term)**
   - Lower engineering effort, but weaker identity integrity and potential name collisions.
2. **Option 2: Parent-managed child profiles (recommended long term)**
   - Parent creates/selects child profile aliases.
   - Use internal stable IDs while displaying friendly names in UI.
   - Better deletion, retention, consent linking, and audit semantics.

### Decision framework

Score both options on:

- Child privacy risk
- Parent usability
- Migration complexity
- Backend cost/performance
- International compliance fit

### Implementation plan (if moving to profiles)

- Add profile entity + migration mapping from legacy names.
- Update score lookup/write paths to profile IDs.
- Keep display-name abstraction in frontend.
- Add migration fallback for unmatched legacy names.

### Acceptance criteria

- Documented decision record with rationale and migration plan.
- If profile model is selected, rollout plan includes dual-read migration period and cutover date.

## Workstream D — Parent reset UX redesign

### Objective

Replace browser `prompt/confirm` pattern with a dedicated parent form for reset/delete controls.

### Implementation plan

- Create parent safety panel with:
  - reset PIN field
  - selectable action type (global reset vs child delete)
  - explicit typed confirmation
  - inline validation and accessible error messaging
- Add rate-limit/backoff hints for repeated failures.
- Include resilient loading/disabled states for async actions.

### Acceptance criteria

- No browser `prompt` or bare `confirm` in parent destructive actions.
- Accessibility checks pass (focus handling, labels, errors, keyboard flow).
- Frontend behavior tests cover main success/failure branches.

## Workstream E — Consent, cookies, and local storage governance

### Objective

Ensure storage/tracking behavior aligns with GDPR/ePrivacy and child-safety defaults.

### Storage/cookie inventory

Create and maintain a table with:

- key/cookie name
- purpose
- essential vs non-essential
- write trigger
- retention duration
- vendor/third-party access

### Consent model

1. Default to **essential-only** storage before consent where ePrivacy applies.
2. Defer non-essential analytics/telemetry until explicit consent.
3. Capture parent-manageable consent choices and allow withdrawal.
4. Re-check consent if scope changes (new purpose/vendor).

### Engineering tasks

- Add consent gate service used by all writes to non-essential cookies/storage.
- Add regional configuration hooks (EEA/UK strict mode by default where needed).
- Add consent banner/preferences UI with parent-friendly copy.
- Add automated tests ensuring blocked writes before consent.

### Acceptance criteria

- No non-essential cookie/storage writes before consent in strict regions.
- Consent withdrawal disables future writes and clears relevant client artifacts where required.
- Privacy notice and cookie notice map exactly to implemented behavior.

## Workstream F — Child safety and global operations guardrails

### Objective

Operationalize child-protection controls beyond individual feature tickets.

### Tasks

- Define age-range assumptions and required parent-control surfaces.
- Add incident runbook for privacy events (data deletion failures, unexpected logging).
- Add DPIA-like risk review checklist for each privacy-affecting release.
- Add release gate requiring sign-off from engineering + product + privacy/legal reviewer.

### Acceptance criteria

- Privacy release checklist is mandatory for Priority 4 related PRs.
- Monitoring alerts exist for unusual deletion/reset patterns and elevated failure rates.

## Delivery sequencing (recommended)

1. **Sprint 1: Discovery + decisions**
   - retention matrix draft
   - identity model decision workshop
   - storage/cookie inventory
2. **Sprint 2: Backend foundations**
   - child delete API + tests
   - logging + retention job scaffolding
3. **Sprint 3: Frontend parent safety UX**
   - dedicated parent form
   - child delete UI + cache updates
4. **Sprint 4: Consent/cookie controls**
   - consent gate + preferences UI
   - strict-region behavior tests
5. **Sprint 5: Hardening and rollout**
   - migration tasks (if profile model chosen)
   - docs/training/runbooks
   - staged rollout with monitoring

## Testing strategy

### Backend tests

- per-child delete authorization and idempotency
- retention-job correctness and bounds
- log redaction behavior

### Frontend tests

- parent form validation and error states
- child delete flow state transitions
- local fallback cache scoped deletion + TTL expiration
- consent gate enforcement for cookie/storage writes

### End-to-end smoke checks

- create multiple child records, delete one, verify others remain
- withdraw consent, verify non-essential writes stop
- reset flow still works with improved UX and error handling

## Documentation deliverables

- Update `doc/product-spec.md` with parent safety UX and deletion behaviors.
- Update `doc/backend-api-spec.md` with child-delete endpoint and retention semantics.
- Update `doc/architecture.md` with retention job ownership and consent gate placement.
- Keep `doc/backlog.md` Priority 4 items aligned with implementation status.

## Risks and mitigations

1. **Legal ambiguity across regions**
   - Mitigation: strict baseline by default + jurisdiction matrix + legal sign-off checkpoints.
2. **Migration complexity (if moving to profile IDs)**
   - Mitigation: dual-read migration window and rollback plan.
3. **Parent UX complexity increase**
   - Mitigation: task-focused UI copy, progressive disclosure, and accessibility testing.
4. **Operational drift between code and notices**
   - Mitigation: docs-as-release-gate + automated checks for storage inventory changes.

## Definition of done for Priority 4

Priority 4 is done when:

- all four backlog tickets have shipped behavior and tests,
- retention and consent controls are documented and enforced,
- parent-facing privacy explanations are clear and accurate,
- rollout monitoring shows stable error rates and expected usage,
- legal/privacy review sign-off is recorded for target regions.


## External compliance references to use during implementation

- GDPR full text (Regulation (EU) 2016/679): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- ePrivacy Directive (Directive 2002/58/EC): https://eur-lex.europa.eu/eli/dir/2002/58/oj
- UK ICO children's code overview: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/
- FTC COPPA Rule hub: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
