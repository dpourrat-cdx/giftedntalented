# Contributing to Captain Nova's Rocket Mission

This document covers the branch workflow, test expectations, merge process, and multi-agent conventions for this repo.

---

## Multi-Agent Workflow (Claude + Codex)

This repo is actively developed by two AI agents — **Claude** (via Claude Code) and **Codex** (via OpenAI Codex CLI) — alongside the human owner. The conventions below prevent file conflicts, clarify ownership, and keep history clean.

### The Core Rule: One Agent, One Branch, One Worktree at a Time

Each agent **must work on its own git branch** and, whenever possible, its own git worktree. Neither agent should modify files in the other agent's working tree or active branch without explicit handoff.

```
master          ← protected, CI-gated, no direct pushes
  └── claude/feature-name    ← Claude's working branch
  └── codex/feature-name     ← Codex's working branch
```

### Worktrees

Claude uses git worktrees (`.claude/worktrees/<name>`) so it never touches the main working tree when Codex has work in progress there, and vice versa. If you are Codex and you need to start a task:

1. Pull latest `master`.
2. Create a branch prefixed with `codex/` (e.g., `codex/security-hardening`).
3. Work in the main working directory **or** a dedicated worktree — do not commit to an active branch owned by Claude.

If you are Claude and you need to start a task:

1. Pull latest `master`.
2. Create a branch prefixed with `claude/` (e.g., `claude/api-spec-update`).
3. Prefer using a worktree so the main working directory stays available for Codex.

### Coordination Point: `docs/backlog.md`

Before starting any task, **read `docs/backlog.md`** to see what is in progress or already done. Before pushing your branch, **update the todo file** to reflect completed checkboxes and any new findings. This file is the single source of truth for what each agent is working on.

### PR Review Ownership

| Who opens the PR | Who reviews it | Who merges it |
|---|---|---|
| Codex (`codex/*`) | Claude | Codex (after Claude's review passes) |
| Claude (`claude/*`) | Codex | Claude (after Codex's review passes) |

The reviewing agent must:
- Confirm all CI checks pass before approving.
- Leave a short summary comment on what was verified.
- In PR comments, explicitly call in the other agent by name: Codex should ask Claude to review `codex/*` PRs, and Claude should ask Codex to review `claude/*` PRs.
- Use that review to challenge assumptions, regressions, missing tests, and Sonar findings rather than just rubber-stamping the branch.
- Never approve a PR that touches the same files as another open PR without explicit human sign-off.

**Merge authority:**
- Each agent merges its own PRs — **never the other agent's**.
- Claude must **never merge a Codex PR**. Leave a review comment and stop. Codex merges its own work.
- Codex must **never merge a Claude PR**. Leave a review comment and stop. Claude merges its own work.
- Human owner has final merge authority on any PR that touches security-sensitive paths (`middleware/`, `validators/`, `supabase/`, schema SQL files).

### Comment Prefix Convention

Claude and Codex run on the same computer and post under the **same GitHub account** (`dpourrat-cdx`). To make authorship immediately clear in PR comments, issue threads, and review notes:

- **Claude** prefixes every comment addressed to Codex with **`Codex, `** (e.g. `"Codex, please review this PR."`).
- **Codex** prefixes every comment addressed to Claude with **`Claude, `** (e.g. `"Claude, please review this PR."`).

Apply this prefix to **handoff and review comments** — invitations to review, review summaries, merge approvals, and feedback threads.

### Automated Codex Bot vs. Manual Codex Reviews

The **`chatgpt-codex-connector`** GitHub app posts a lightweight automated review on every non-draft PR. This is separate from Codex's substantive manual reviews. When Codex reviews a `claude/*` PR manually, it posts a plain comment under `dpourrat-cdx` using the `Claude, ` prefix, structured as:

```
Claude, ✅ Review complete.

What I verified:
- …

One follow-up before merge:
- …

Merge recommendation: ready after …
```

When Claude reviews a `codex/*` PR manually, it posts a plain comment under `dpourrat-cdx` using the `Codex, ` prefix.

### GitHub Approval Limitation

Because both agents share the `dpourrat-cdx` account, **GitHub blocks formal PR approvals** (`addPullRequestReview --approve` returns an error). Always post reviews as `--comment` only — never attempt `--approve` or `--request-changes` via the API.

### Automated PR Review (Claude Scheduled Agent)

A local scheduled agent was designed to triage open PRs, mark drafts ready, post reviews, and merge approved Claude PRs every 10 minutes. **This automation is currently disabled** — it was not working reliably. All PR triage, draft promotion, and review posting must be done manually.

When manually triaging:

1. **Mark drafts ready** — if a `codex/*` PR is still draft and all three checks (Backend, SonarCloud, and SonarCloud Code Analysis) are green, run `gh pr ready <number>`.
2. **Review unreviewed Codex PRs** — post a full review comment (see format below) once CI is green.
3. **Merge approved Claude PRs** — once Codex has reviewed and all feedback is resolved and CI is green, Claude squash-merges and deletes the branch.

GitHub Actions–based review was intentionally **not used** to avoid additional Anthropic API charges beyond the $20 Pro plan.

### Files That Must Not Be Touched Simultaneously

If one agent has an open PR touching any of the files below, the other agent should not modify those files until the PR is merged:

- `backend/src/services/attempt.service.ts`
- `backend/src/services/attempt.service.test.ts`
- `backend/src/lib/question-bank.ts`
- `backend/src/lib/question-bank.data.json`
- `backend/src/middleware/admin-auth.ts`
- Any `backend/supabase/*.sql` file
- `docs/backlog.md` (coordinate via short-lived edits only)

---

## Branch Naming

| Prefix | Used by | Example |
|---|---|---|
| `claude/` | Claude Code agent | `claude/api-spec-update` |
| `codex/` | Codex agent | `codex/security-hardening` |
| `feature/` | Human-driven work | `feature/story-pack-selector` |
| `fix/` | Bug fixes (any source) | `fix/timer-drift` |
| `chore/` | Deps, config, CI tweaks | `chore/dependabot-setup` |

### Branch Hygiene

Remote branches accumulate quickly in an active multi-agent repo. To keep the branch list manageable:

- **Delete your branch immediately after merge** — the GitHub merge button has a "Delete branch" option; use it. If you merge via CLI (`gh pr merge --squash --delete-branch`), the flag handles it automatically.
- **Never leave a closed (unmerged) PR's branch on the remote** — if a PR is closed without merging, delete the branch manually: `git push origin --delete <branch-name>`.
- **Do not open a new branch for trivial one-commit fixes** — commit directly to an existing open branch where appropriate, or open a minimal PR.
- **Stale branches** (no open PR, no commits in 7+ days) should be reviewed manually. Either open a PR, merge, or delete the branch.
- The only long-lived branch is `master`. All other branches are short-lived and should be deleted once their PR is merged.

---

## Branch Protection Rules (master)

As of March 26, 2026, the following rules are active:

- **Required status check**: `Backend` (GitHub Actions CI job defined in `.github/workflows/ci.yml`)
- **Branches must be up-to-date** before merge
- **Administrators are included** — no bypass allowed
- **Force-push blocked**
- **Branch deletion blocked**
- **Conversation resolution not required** (kept off to reduce friction on agent-opened PRs)

To merge anything into `master` you must:
1. Open a PR from your branch.
2. Wait for the `Backend` CI job to pass.
3. Wait for the `SonarCloud` quality gate to pass (0 new hotspots, ≥80% new-code coverage).
4. Get an approval (from the other agent or the human owner).
5. Use the GitHub merge button — no direct pushes.

---

A PR must not be approved, marked ready, or merged if it introduces new Sonar issues unless:
- the issues are fixed in the same PR, or
- the remaining issues are explicitly documented in `docs/backlog.md` in that same PR as intentional follow-up work.

---

## Local Development Workflow

### First-Time Setup

Copy the example env file and fill in the Supabase credentials before running the backend:

```bash
cp backend/.env.example backend/.env
# Then set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the Supabase dashboard:
# https://supabase.com/dashboard/project/hwafspusaijqjkgweptv/settings/api
```

`backend/.env` is gitignored and must never be committed.

### Windows Note

On Windows, PowerShell execution policy blocks `npm.ps1`. Use `npm.cmd` instead of `npm` for all backend commands:

```bash
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run dev
npm.cmd run smoke:live
```

### Backend

```bash
cd backend
npm.cmd ci
npm.cmd run check      # TypeScript type check
npm.cmd test           # Vitest test suite
npm.cmd run build      # Compile to dist/
npm.cmd run dev        # Express dev server on port 10000
```

### Frontend

The frontend is static files at the repo root. Use any static file server:

```bash
npx serve . -l 3000
```

The frontend JS points at the production Render backend by default. No local backend URL swap is needed for UI testing unless you are testing API changes end-to-end.

### Smoke Test Against Live Backend

```bash
cd backend
npm.cmd run smoke:live   # hits production Render endpoint
```

---

## Merge and Deploy Checklist

Every agent must complete this sequence before considering a task done:

1. **Test locally**: `npm.cmd run check && npm.cmd test && npm.cmd run build` — all must pass.
2. **Commit and push** the branch.
3. **Open a PR** and wait for CI to go green.
4. **Get a review** (other agent or human owner).
5. **Merge** via GitHub merge button.
6. **Verify deployment**: after Render auto-deploys, run `npm.cmd run smoke:live` to confirm the live backend is healthy.
7. **Delete the branch** after merge — keep the remote clean.

---

## CI Pipeline

`.github/workflows/ci.yml` runs two jobs on every push and PR targeting `master`:
- **`Backend`**: install → check → test:coverage → build → audit. All steps except audit are hard failures. Must be green before a PR can merge.
- **`SonarCloud`**: runs after `Backend`, downloads the lcov artifact, and posts a quality gate result. 0 new hotspots and ≥80% new-code coverage required.

Full pipeline details and SonarCloud config are in [`docs/architecture.md`](docs/architecture.md).

---

## Dependabot

Weekly PRs for `backend/` npm updates open every Monday. `@types/*` packages are grouped; major bumps for `express` and `zod` require manual review. Merge Dependabot PRs promptly — CI validates them before merge.

---

## Test Expectations

- All new backend service code must have corresponding unit tests in `*.test.ts` alongside the source file.
- Every PR must add or update meaningful automated coverage for the code it changes. If a change introduces new logic, the PR should include tests that exercise that logic directly instead of relying on manual verification alone.
- Tests use **Vitest** with manual mocks for Supabase and Firebase clients.
- A test file must not import the real Supabase or Firebase clients — mock them at the top of the file.
- Tests must pass with `npm test` before any PR is opened.
- `SonarCloud` new-code coverage must stay green before merge. Temporary coverage exclusions should be rare, documented in the PR, and paired with a backlog follow-up to remove them.
- New Sonar issues on a PR should be treated as blockers by default. If a small issue is intentionally deferred, the PR must update `docs/backlog.md` and mention that deferral in the review thread before the PR can be considered ready.
- The test count is not a hard ceiling — add as many tests as the code needs.
