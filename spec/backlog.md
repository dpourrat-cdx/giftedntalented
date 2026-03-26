# Next Implementation Todo

## Goal

This backlog captures the next high-value work for the Captain Nova app after the March 26, 2026 rollout of backend-owned, randomized web score attempts and the related live verification.

## Current State Snapshot

- [x] Frontend score submission now goes through backend-owned score attempts instead of posting raw score payloads directly.
- [x] The legacy `POST /players/:playerName/record` endpoint is live but intentionally disabled with `410 LEGACY_SCORE_ENDPOINT_DISABLED`.
- [x] The backend now uses a backend-owned question snapshot (`question-bank.data.json`) instead of executing the frontend question bundle at runtime.
- [x] For web quiz attempts, the backend now owns question selection and answer-order randomization for each new attempt.
- [x] The web app now waits for the backend-issued attempt payload before a quiz becomes interactive, avoiding local/backend answer drift.
- [x] Replay-safe finalize behavior and structured score-save audit metadata are live.
- [x] Public player-record lookup hardening is live.
- [x] The live smoke script now cleans up its own test records after each run.
- [x] Parent device-cache controls were intentionally reverted and are not part of the current product surface.
- [x] A one-command live backend smoke runner and deploy checklist exist in `backend/` and `spec/`.
- [x] Backend tests and TypeScript checks are currently passing locally (`149` tests plus `npm run check` as of March 26, 2026).
- [x] CI pipeline is live: `.github/workflows/ci.yml` runs check -> test -> build -> audit on every push and PR targeting `master`.
- [x] Dependabot is configured (`.github/dependabot.yml`) for weekly npm updates with `@types/*` grouping and major-version pins for `express`/`zod`.
- [x] Branch protection is enabled on `master`: passing `Backend` CI check required, branches must be up-to-date, admins included, force-push and deletion blocked.

## Priority 0: Release Safety And Delivery Guardrails - COMPLETE

- [x] Add `.github/workflows/ci.yml` that runs `npm run check`, `npm test`, and `npm run build` for `backend/` on every push and pull request.
- [x] Add `.github/dependabot.yml` so backend dependency updates are surfaced continuously instead of manually.
- [x] Add `npm audit --audit-level=high` to CI (runs with `continue-on-error: true` so audit findings are visible without blocking merges).
- [x] Enable and verify branch protection on `master` so merges require passing checks and review.
- [ ] Add a lightweight post-deploy automation or checklist step that runs `npm run smoke:live` after backend releases.

## Priority 1: Security Hardening

- [x] Replace direct admin-secret string comparison in `backend/src/middleware/admin-auth.ts` with `crypto.timingSafeEqual()`.
- [ ] Require admin auth middleware on `POST /api/v1/admin/scores/reset` in addition to the reset PIN flow.
- [ ] Review Supabase table security and explicitly enable or verify Row-Level Security plus policies for `test_scores`, `app_admin_settings`, `notification_devices`, `score_attempts`, and `score_attempt_events`.
- [ ] Add explicit `REVOKE EXECUTE FROM PUBLIC` and `GRANT EXECUTE TO service_role` statements for `SECURITY DEFINER` functions in `backend/supabase/backend_schema.sql`.
- [x] Add a baseline Content Security Policy to the GitHub Pages frontend.
  Landed (PR #11): `default-src 'self'`, scripts locked to same-origin, Google Fonts and Render API origins explicitly allowed. `'unsafe-inline'` retained temporarily for styles.
- [ ] Remove `'unsafe-inline'` from `style-src` once all inline style generation is eliminated from frontend JS.
  Prerequisite: audit and rewrite any remaining `element.style.*` or inline `style=` assignments in `app.js`, `scoreboard.js`, and `gamification.js` that cannot yet be replaced with CSS classes.
- [ ] Add clickjacking protection for the GitHub Pages frontend.
  `frame-ancestors 'none'` in a `<meta>` CSP tag is a no-op (spec-excluded from meta delivery). GitHub Pages does not support custom response headers, so a platform-level solution is needed. Options: migrate to Netlify (supports `_headers`), or document the residual risk and accept it explicitly.
- [ ] Add a CSP `report-to` endpoint to surface policy violations in production.
  Implement after `'unsafe-inline'` is removed so reports reflect the tightened policy. A small edge function or logging endpoint is sufficient.
- [ ] Review remaining `innerHTML` render paths across the frontend and replace them with safer DOM construction where practical.
  First slice landed: story-panel artwork and mission footer content no longer flow through raw HTML pass-throughs.

## Priority 2: Documentation And Repo Hygiene

- [ ] Rewrite `spec/backend-api-spec.md` so it fully documents the attempt-based flow:
  - `POST /attempts`
  - `POST /attempts/:attemptId/answers`
  - `POST /attempts/:attemptId/finalize`
  - legacy `POST /players/:playerName/record` disabled behavior
- [x] Architecture note (`spec/architecture.md`) covers GitHub Pages, Render, Supabase, CI, release flow, and smoke checks.
- [x] Add `CONTRIBUTING.md` with branch naming, test expectations, merge flow, and multi-agent working conventions.
- [ ] Update `backend/README.md` to reflect the smoke runner, current scripts, and backend-owned question-bank flow.

## Priority 3: Code Quality And Maintainability

- [ ] Split `backend/src/services/attempt.service.ts` into smaller units such as question selection, attempt state, and score persistence helpers.
- [ ] Deduplicate shared score-row mapping logic between `attempt.service.ts` and `score.service.ts`.
- [ ] Review whether schema-cache fallback handling can be simplified or centralized now that the live schema is aligned.
- [ ] Remove dead score-write code paths that are no longer reachable after the `410` legacy endpoint change.
- [ ] Move `@types/cors`, `@types/express`, and `@types/node` from production `dependencies` to `devDependencies`.
- [ ] Review the double "old best" lookup path in score persistence and simplify it if the RPC already owns that comparison.

## Priority 4: Privacy And Parent Safety

- [ ] Add a way to delete one child's record without clearing all saved records.
- [ ] Clarify retention expectations for online score history, reset logs, and local fallback cache data.
- [ ] Decide whether explorer names should stay as plain-text identifiers or move to a parent-managed profile model later.
- [ ] Decide whether the parent reset flow should move from a browser prompt to a small dedicated form with clearer confirmation and error handling.

## Priority 5: Testing And Operations

- [ ] Add broader frontend smoke coverage for page load, record lookup, story mode progression, and reset behavior.
- [ ] Add browser-level verification for desktop and mobile layout/interaction paths.
- [x] Add automatic cleanup to `backend/scripts/smoke-live-backend.ts` so test records do not accumulate after each run.
- [ ] Keep `backend/scripts/smoke-live-backend.ts` aligned with production behavior whenever schema or score flow changes.
- [ ] Add alerting or monitoring for unusual public write bursts, repeated reset failures, and backend error spikes.
- [ ] Review Render cold-start behavior and decide whether uptime mitigation is worth the cost.

## Priority 6: Product And Content Improvements

- [ ] Add a parent-friendly storyline selector so future story packs can be chosen without editing code.
- [ ] Move storyline packs out of the main JS bundle into dedicated content files or JSON.
- [ ] Add a story-content validation helper for mission text, endings, and artwork references.
- [ ] Give Story Only mode its own finale/report path instead of reusing the score-banded result screen.
- [ ] Add a parent export or printable summary for mission results and missed-question review.
- [ ] Add the remaining mission-complete artworks and gallery improvements.

## Next Recommended Delivery Slice

1. Fix locale-dependent `.sort()` in `attempt.service.ts` (SonarCloud critical bug — score integrity risk).
2. Review `Math.random()` in `attempt.service.ts:262` (SonarCloud hotspot H1 — confirm safe or replace with `crypto.randomInt()`).
3. Decide whether `POST /api/v1/admin/scores/reset` should stay public-parent reachable or become owner-only with `X-Admin-Key`.
4. Rewrite `spec/backend-api-spec.md` for the attempt-based contract.
5. Add explicit Supabase function grants/revokes, then follow with RLS and policies in a separate PR.
6. Continue the frontend render-sink cleanup beyond story mode, starting with review/results surfaces.
7. Remove `'unsafe-inline'` from `style-src` once inline style generation is eliminated from frontend JS.

---

## SonarCloud High-Priority Issues – 2026-03-26

**Snapshot summary** (full project, not new-code only):
- Reliability rating: **D** — 2 critical bugs
- Security rating: A — 0 vulnerabilities
- Maintainability rating: A — 174 code smells (of which 17 critical, 57 major)
- Security hotspots unreviewed: **4** (3 medium, 1 low)
- Coverage: **40.4%** (quality gate threshold: 80%)
- Duplication: 1.5% (within acceptable range)

---

### 🔴 Critical — Bug

#### 1. Locale-dependent array sort in answer fingerprinting
- **File**: `backend/src/services/attempt.service.ts` lines 155–156
- **Rule**: `typescript:S2871`
- **What it is**: `.sort()` called on string arrays without a comparator. JavaScript's default sort converts elements to strings and compares them using each character's UTF-16 code unit value, which is locale-dependent and engine-dependent.
- **Why it matters**: These two sort calls are almost certainly part of the answer-option fingerprinting logic that determines whether a submitted answer set matches the issued attempt. If sort order diverges between environments or Node.js versions, a valid answer set could hash differently and be rejected, or a tampered one could be accepted. This is a correctness bug that affects score integrity.
- **Suggested fix approach**: Replace `.sort()` with `.sort((a, b) => a.localeCompare(b))` for text arrays, or `.sort((a, b) => a - b)` for numeric arrays. Verify which comparator matches the intended semantic (alphabetical, positional, etc.) before changing.
- **Effort**: S

---

### 🟠 Critical — Code Smell

#### 2. Excessive cognitive complexity in `renderQuestion` / main render loop (`app.js:1243`)
- **File**: `app.js` line 1243
- **Rule**: `javascript:S3776`
- **What it is**: A single function with a measured Cognitive Complexity of **56** (threshold: 15). This is the worst violation in the project.
- **Why it matters**: Functions with this level of complexity are statistically the most likely to contain latent bugs, are difficult to reason about during code review, and are very hard to test exhaustively. Any change to the quiz rendering or state-machine logic carries a high regression risk.
- **Suggested fix approach**: Identify the distinct responsibilities inside the function (state transitions, DOM updates, answer validation, branching on quiz type) and extract each into a named helper. Target ≤ 3–4 responsibilities per function.
- **Effort**: L

#### 3. High cognitive complexity in score-banding / result renderer (`app.js:196`)
- **File**: `app.js` line 196
- **Rule**: `javascript:S3776`
- **What it is**: Cognitive Complexity of **39** — the second worst in the frontend.
- **Why it matters**: Same risk as above. Early in the file, likely a core rendering or state-initialisation function that downstream logic depends on.
- **Suggested fix approach**: Extract branching paths into smaller named functions, particularly around score-band thresholds and render-path selection.
- **Effort**: L

#### 4. High cognitive complexity across `question-bank.js` (4 functions)
- **File**: `question-bank.js` lines 2202 (CC=39), 1425 (CC=28), 544 (CC=23), 723 (CC=23)
- **Rule**: `javascript:S3776`
- **What it is**: Four functions with complexity 23–39, all over the allowed threshold of 15.
- **Why it matters**: `question-bank.js` is the largest frontend file and handles question selection, scoring, and answer matching. High complexity here makes it risky to extend the question bank or add new question types.
- **Suggested fix approach**: Per-function audit: identify repeated branching patterns (likely question-type dispatch), extract them into a strategy or lookup table. The function at line 2202 (CC=39) is the highest-priority target.
- **Effort**: L (for all four; each is M individually)

#### 5. High cognitive complexity in `attempt.service.ts` (backend)
- **File**: `backend/src/services/attempt.service.ts` line 551
- **Rule**: `typescript:S3776`
- **What it is**: Cognitive Complexity of **25** in a backend service function.
- **Why it matters**: Unlike the frontend functions, this is tested TypeScript. Complexity here makes the test surface harder to cover fully and future changes risky. Already flagged in the backlog as a refactor candidate (split `attempt.service.ts`).
- **Suggested fix approach**: Consistent with existing backlog item — split into question-selection, attempt-state, and score-persistence helpers.
- **Effort**: M

#### 6. High cognitive complexity in `scoreboard.js` reconciliation function
- **File**: `scoreboard.js` line 620
- **Rule**: `javascript:S3776`
- **What it is**: Cognitive Complexity of **22**.
- **Why it matters**: The scoreboard reconciles local cache with backend data. Bugs here mean players see stale or incorrect scores. Complex logic in this path is hard to spot-check during review.
- **Suggested fix approach**: Extract the cache-vs-backend comparison logic and the display-state selection into separate, testable functions.
- **Effort**: M

#### 7. Async operation inside class constructor (`scoreboard.js:267`)
- **File**: `scoreboard.js` line 267
- **Rule**: `javascript:S7059`
- **What it is**: An `async` operation (likely a fetch or Supabase call) is initiated inside a class constructor.
- **Why it matters**: Constructors are synchronous by nature in JavaScript. Starting async work inside one means the object is partially initialised when the constructor returns, making it easy for calling code to access the object before it is ready. This is a class of race condition that can cause intermittent display bugs or stale data on first render.
- **Suggested fix approach**: Move the async initialisation out of the constructor into a separate `init()` or `load()` method that the caller must `await`, or use a static factory method pattern.
- **Effort**: S

#### 8. `void` operator used to silence unhandled promises (3 instances, `app.js`)
- **File**: `app.js` lines 1601, 1666, 1784
- **Rule**: `javascript:S3735`
- **What it is**: `void someAsyncFn()` is used to discard a Promise return value and suppress linter warnings about unhandled promises.
- **Why it matters**: Silencing the Promise means any rejection from that call is swallowed silently. If a backend call or state-update fails at one of these points, the app continues without any indication of the error, potentially leaving the UI in an inconsistent state.
- **Suggested fix approach**: Replace with an explicit `.catch(err => { /* log or handle */ })` call. Identify whether each call-site genuinely needs fire-and-forget semantics or should block on the result.
- **Effort**: S

#### 9. Duplicate string literal in SQL schema (`backend/supabase/backend_schema.sql:26`)
- **File**: `backend/supabase/backend_schema.sql` line 26
- **Rule**: `plsql:S1192`
- **What it is**: A string literal repeated 4 times without extraction to a named constant or reusable SQL variable.
- **Why it matters**: In SQL, this is typically a role name or schema qualifier. If it ever needs to change, all four occurrences must be updated consistently. A mismatch (partial update) would silently grant or revoke permissions incorrectly.
- **Suggested fix approach**: Identify the repeated literal (likely a role name). If the SQL dialect supports it, define it once as a variable or comment-document it clearly so updates are intentional and grep-able.
- **Effort**: S

---

### 🟡 Major — Code Smell (Grouped by Pattern)

#### 10. Nested ternary operations — 30+ instances across 4 files
- **Files**: `app.js` (17 instances), `question-bank.js` (14 instances), `scoreboard.js` (1 instance)
- **Rule**: `javascript:S3358`
- **What it is**: Ternary expressions nested inside other ternary expressions (e.g. `a ? b ? c : d : e`).
- **Why it matters**: Nested ternaries are a leading cause of misread logic. They look like they express one thing but the operator precedence makes them express another. Particularly dangerous in score-banding and answer-checking paths where off-by-one logic errors are high-stakes.
- **Suggested fix approach**: Replace with explicit `if/else if/else` blocks or extract to a named helper function. This is a mechanical refactor — no behaviour change required.
- **Effort**: M (as a group; each individual instance is S)

#### 11. Missing optional chaining — 9 instances
- **Files**: `app.js` (7 instances), `scoreboard.js` (1), `gamification.js` (1)
- **Rule**: `javascript:S6582`
- **What it is**: Verbose null/undefined guards like `x && x.y` where `x?.y` is available.
- **Why it matters**: While functionally equivalent in most cases, verbose guards are more likely to be written incorrectly (e.g. `x && x.y.z` misses the second level), and clutter the code making it harder to spot real null-safety issues.
- **Suggested fix approach**: Mechanical find-and-replace with optional chaining. Low risk.
- **Effort**: S

#### 12. Nested template literals — 3 instances
- **Files**: `app.js` line 1177; `scoreboard.js` lines 606, 607
- **Rule**: `javascript:S4624`
- **What it is**: Template literals containing other template literals, creating deeply interpolated strings.
- **Why it matters**: Nested template literals are hard to read and escape correctly. In the context of `app.js:1177` (which also has a nested ternary on the same line), this increases the risk of injecting unescaped content into a render path. Cross-cutting concern with the ongoing innerHTML cleanup work.
- **Suggested fix approach**: Extract the inner template into a named variable before using it in the outer template.
- **Effort**: S

#### 13. Duplicate function implementations in `gamification.js`
- **File**: `gamification.js` lines 619 and 632
- **Rule**: `javascript:S4144`
- **What it is**: Two functions with identical implementations — Sonar detected the bodies are the same.
- **Why it matters**: If one copy is updated and the other is not, they silently diverge. This is a maintenance trap.
- **Suggested fix approach**: Identify the two functions, determine whether they truly have the same intent, and either merge them into one or document explicitly why they differ.
- **Effort**: S

#### 14. Non-Error object thrown in `scoreboard.js`
- **File**: `scoreboard.js` line 181
- **Rule**: `javascript:S3696`
- **What it is**: Something other than an `Error` instance (likely a string or plain object) is thrown.
- **Why it matters**: Non-Error throws do not have a `.stack` property, making debugging and logging much harder. Any `catch` block that expects an `Error` instance will behave incorrectly (e.g., `err.message` is undefined).
- **Suggested fix approach**: Replace `throw "some string"` or `throw { msg: "..." }` with `throw new Error("...")`. Check whether the catch site also needs updating.
- **Effort**: S

#### 15. Contrast ratio violations — 6 instances (accessibility)
- **Files**: `styles.css` lines 896, 901, 1047; `gamification.css` lines 373, 494, 654
- **Rule**: `css:S7924`
- **What it is**: Text colour and background colour combinations that do not meet the WCAG AA minimum contrast ratio of 4.5:1 for normal text.
- **Why it matters**: The app is used by children, including potentially those with visual impairments. Low-contrast text is inaccessible and may violate legal requirements in some jurisdictions.
- **Suggested fix approach**: For each flagged selector, use a contrast checker tool to identify a compliant colour pairing. Adjusting lightness/darkness of either the text or background is usually sufficient.
- **Effort**: S (per instance)

#### 16. Accessibility issues in `index.html`
- **File**: `index.html` line 164 (`Web:S6850`), line 166 (`Web:S6819`)
- **Rules**: `Web:S6850` (empty heading), `Web:S6819` (use semantic list element instead of `role="list"`)
- **What it is**: A heading element (`<h1>`–`<h6>`) with no visible content, and a `<div role="list">` where a native `<ul>` or `<ol>` would be semantically correct.
- **Why it matters**: Screen readers announce headings and list roles; empty headings are confusing and duplicate `role="list"` on a div is less reliable than a native element across assistive technologies.
- **Suggested fix approach**: Add meaningful text content to the empty heading (or remove it if not needed). Replace the `<div role="list">` with a `<ul>` or `<ol>` element.
- **Effort**: S

---

### 🔵 Security Hotspots (Unreviewed — Require Human Decision)

#### H1. `Math.random()` in backend answer randomisation (MEDIUM)
- **File**: `backend/src/services/attempt.service.ts` line 262
- **Rule**: `typescript:S2245`
- **What it is**: `Math.random()` used on the backend, likely to shuffle answer-option order for each attempt.
- **Why it matters**: `Math.random()` is a pseudorandom number generator not suitable for security-sensitive randomisation. If the shuffled answer order is used to construct a fingerprint that is compared during answer validation, a predictable PRNG could allow an attacker to pre-compute the expected order. For pure cosmetic shuffling with no security implication, it is acceptable.
- **Decision needed**: Confirm whether the shuffle at line 262 affects answer validation or scoring logic. If yes, replace with `crypto.randomInt()` or Fisher-Yates with a cryptographic source. If it is cosmetic only, mark as Safe in SonarCloud.
- **Effort**: S (if safe to mark) / M (if crypto replacement needed)

#### H2. `Math.random()` in frontend question/answer shuffling (MEDIUM, ×2)
- **Files**: `question-bank.js` line 107; `gamification.js` line 330
- **Rule**: `javascript:S2245`
- **What it is**: Same rule as H1, but in frontend JavaScript.
- **Why it matters**: Frontend randomisation is cosmetic — answer validation now lives on the backend. `Math.random()` is acceptable for display purposes. These can almost certainly be marked as Safe.
- **Decision needed**: Confirm neither call influences a value that is sent to the backend for validation. Then mark both as Safe in SonarCloud.
- **Effort**: S (review only)

#### H3. External stylesheet loaded without Subresource Integrity (LOW)
- **File**: `index.html` lines 28–31
- **Rule**: `Web:S5725`
- **What it is**: A `<link>` to Google Fonts (or similar external CDN) does not carry an `integrity` attribute with a cryptographic hash.
- **Why it matters**: Without SRI, if the CDN is compromised, a malicious stylesheet could be injected. For Google Fonts specifically, SRI is impractical because Google varies the response by user-agent and the hash changes. The accepted mitigation is to self-host fonts or accept the CDN trust model.
- **Decision needed**: Decide whether to self-host Google Fonts (eliminates the risk and the SRI gap) or explicitly accept the Google CDN trust model and mark as Acknowledged in SonarCloud. The current CSP already restricts `font-src` to `fonts.gstatic.com`, which limits the blast radius.
- **Effort**: M (self-hosting) / S (acknowledge)

---

### Coverage Gap

- **Current coverage**: 40.4% overall (backend TypeScript ~92%, frontend JS 0%)
- **Quality gate threshold**: 80% on new code
- **Root cause**: The frontend JS files (`app.js`, `scoreboard.js`, `gamification.js`, `question-bank.js`, `content.js`) have no test suite. They pull the overall project coverage to 40.4% even though the backend is well covered.
- **Why it matters**: The frontend contains the most complex logic (cognitive complexity violations above, answer rendering, score display). Zero coverage means regressions in those paths are invisible to CI.
- **Suggested approach**: Even a lightweight Vitest + jsdom or Playwright component test suite for the three highest-complexity frontend functions would meaningfully move the needle. Full frontend coverage is a long-term goal; targeting the functions flagged in issues 2–6 above is the highest-leverage starting point.

---

### Prioritised Roadmap

| Priority | Item | Why first | Effort |
|---|---|---|---|
| 1 | Fix locale-dependent `.sort()` in `attempt.service.ts` (issue 1) | Correctness bug affecting score integrity in production | S |
| 2 | Review and resolve `Math.random()` in backend (H1) | Security hotspot in validated code path — must confirm safe before next audit | S–M |
| 3 | Fix `void`-suppressed unhandled promises in `app.js` (issue 8) | Silent failures in live error paths; cheap to fix | S |
| 4 | Fix non-Error throw in `scoreboard.js` (issue 14) | Breaks error handling and logging chain; cheap fix | S |
| 5 | Resolve frontend `Math.random()` hotspots (H2) | Quick review + mark Safe — clears two hotspots from the gate | S |
| 6 | Resolve Google Fonts SRI hotspot (H3) | Decide: self-host or acknowledge — unblocks clean quality gate | S–M |
| 7 | Fix async-in-constructor in `scoreboard.js` (issue 7) | Race condition risk in score display; localised refactor | S |
| 8 | Fix duplicate string literal in SQL schema (issue 9) | Permission correctness; trivial change | S |
| 9 | Refactor `app.js:1243` (CC=56) and `app.js:196` (CC=39) (issues 2–3) | Highest-complexity functions in the codebase; prerequisite for safe feature work | L |
| 10 | Refactor `question-bank.js` functions (issue 4) | Second-highest complexity cluster; blocks safe question-bank changes | L |
| 11 | Fix duplicate function in `gamification.js` (issue 13) | Maintenance trap; quick fix | S |
| 12 | Resolve nested ternaries as a sweep (issue 10) | 30+ instances; mechanical refactor, best done file-by-file | M |
| 13 | Fix contrast ratio violations (issue 15) | Accessibility; affects all users | S per instance |
| 14 | Fix accessibility issues in `index.html` (issue 16) | Semantic HTML; affects screen reader users | S |
| 15 | Add frontend test coverage (coverage gap) | Moves overall coverage toward 80%; requires sustained effort | L |

---

### Cross-Cutting Themes

1. **Monolithic frontend functions** — `app.js` and `question-bank.js` contain functions with cognitive complexity 3–4× the allowed threshold. This is the dominant maintainability risk and is the root cause of multiple issues above (issues 2–4, 10, 12). A dedicated refactoring effort targeting these files would have the highest long-term leverage.

2. **Unhandled async errors** — Three `void`-suppressed promises and an async constructor indicate a pattern of fire-and-forget async calls that bypass error handling. This is a systemic approach in the frontend that should be revisited holistically, not just at the three flagged lines.

3. **`Math.random()` used pervasively for game logic** — The same weak PRNG is used in three separate files for shuffling. For the frontend this is acceptable; for the backend it needs a one-time review (H1). Worth centralising the randomisation utility so the decision is made once.

4. **Zero frontend test coverage** — All backend TypeScript has strong coverage; all frontend JavaScript has none. The two critical bugs and most high-complexity violations are in the frontend. This asymmetry is the biggest quality gap in the project.

5. **Accessibility debt** — Six contrast violations plus two structural HTML issues. The app targets children, making accessibility more important than average. These are cheap to fix individually but represent a pattern of accessibility not being treated as a first-class concern during development.

---

## Done Definition For This Backlog

- Current score flow is documented accurately and legacy paths are clearly marked.
- Automated checks run before merges instead of relying only on manual local runs.
- Live deploy verification remains scriptable and repeatable.
- Remaining security and integrity gaps are explicitly chosen, not accidental.
- Parent-facing privacy and fallback behavior is understandable.
- Frontend, backend, and database releases have a documented and repeatable process.
