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

### Coordination Point: `doc/backlog.md`

Before starting any task, **read `doc/backlog.md`** to see what is in progress or already done. Before pushing your branch, **update the todo file** to reflect completed checkboxes and any new findings. This file is the single source of truth for what each agent is working on.

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

Apply this prefix to all review comments, approval notes, merge requests, and any other GitHub communication between agents.

### Automated PR Review (Claude Scheduled Agent)

Claude runs a local scheduled agent every 10 minutes that performs the following automatically:

1. **Triage open PRs** — for each open PR, checks branch prefix (ownership), draft status, CI results, and whether a handoff comment is present.
2. **Mark drafts ready** — if a `codex/*` PR is still draft and both Backend and SonarCloud are green, marks it ready for review.
3. **Review unreviewed Codex PRs** — if a `codex/*` PR is ready, CI is green, and no Claude review comment exists yet, posts a full review using the checklist in this document.
4. **Merge approved Claude PRs** — if a `claude/*` PR has been reviewed and approved by Codex with all feedback resolved and CI green, Claude squash-merges it and deletes the branch.
5. **Flag stale branches** — reports remote branches with no open PR that have been inactive for more than 7 days.
6. **Post inbox summary** — opens or updates a "Claude Triage Inbox" GitHub issue whenever there is an actionable change to report.

This automation runs locally using the Claude Code subscription (no extra API cost). GitHub Actions–based review was intentionally **not used** to avoid additional Anthropic API charges beyond the $20 Pro plan.

### Files That Must Not Be Touched Simultaneously

If one agent has an open PR touching any of the files below, the other agent should not modify those files until the PR is merged:

- `backend/src/services/attempt.service.ts`
- `backend/src/services/attempt.service.test.ts`
- `backend/src/lib/question-bank.ts`
- `backend/src/lib/question-bank.data.json`
- `backend/src/middleware/admin-auth.ts`
- Any `backend/supabase/*.sql` file
- `doc/backlog.md` (coordinate via short-lived edits only)

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
- **Stale branches** (no open PR, no commits in 7+ days) will be flagged by Claude's scheduled agent. Address the flag promptly: either open a PR, merge, or delete the branch.
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
- the remaining issues are explicitly documented in `doc/backlog.md` in that same PR as intentional follow-up work.

---

## Local Development Workflow

### Backend

```bash
cd backend
npm ci
npm run check      # TypeScript type check
npm test           # Vitest test suite (149 tests as of March 26, 2026)
npm run build      # Compile to dist/
npm run dev        # Express dev server on port 10000
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
npm run smoke:live   # hits production Render endpoint
```

---

## Merge and Deploy Checklist

Every agent must complete this sequence before considering a task done:

1. **Test locally**: `npm run check && npm test && npm run build` — all must pass.
2. **Commit and push** the branch.
3. **Open a PR** and wait for CI to go green.
4. **Get a review** (other agent or human owner).
5. **Merge** via GitHub merge button.
6. **Verify deployment**: after Render auto-deploys, run `npm run smoke:live` to confirm the live backend is healthy.
7. **Delete the branch** after merge — keep the remote clean.

---

## CI Pipeline

`.github/workflows/ci.yml` runs two jobs on every push and PR targeting `master`:
- **`Backend`**: install → check → test:coverage → build → audit. All steps except audit are hard failures. Must be green before a PR can merge.
- **`SonarCloud`**: runs after `Backend`, downloads the lcov artifact, and posts a quality gate result. 0 new hotspots and ≥80% new-code coverage required.

Full pipeline details and SonarCloud config are in [`doc/architecture.md`](doc/architecture.md).

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
- New Sonar issues on a PR should be treated as blockers by default. If a small issue is intentionally deferred, the PR must update `doc/backlog.md` and mention that deferral in the review thread before the PR can be considered ready.
- The test count (currently `149`) is not a hard ceiling — add as many tests as the code needs.
