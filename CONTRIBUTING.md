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

### Coordination Point: `spec/next-implementation-todo.md`

Before starting any task, **read `spec/next-implementation-todo.md`** to see what is in progress or already done. Before pushing your branch, **update the todo file** to reflect completed checkboxes and any new findings. This file is the single source of truth for what each agent is working on.

### PR Review Ownership

| Who opens the PR | Who reviews it |
|---|---|
| Codex | Claude |
| Claude | Codex (or human owner) |

The reviewing agent must:
- Confirm all CI checks pass before approving.
- Leave a short summary comment on what was verified.
- Never approve a PR that touches the same files as another open PR without explicit human sign-off.

Human owner has final merge authority on any PR that touches security-sensitive paths (`middleware/`, `validators/`, `supabase/`, schema SQL files).

### Files That Must Not Be Touched Simultaneously

If one agent has an open PR touching any of the files below, the other agent should not modify those files until the PR is merged:

- `backend/src/services/attempt.service.ts`
- `backend/src/services/attempt.service.test.ts`
- `backend/src/lib/question-bank.ts`
- `backend/src/lib/question-bank.data.json`
- `backend/src/middleware/admin-auth.ts`
- Any `backend/supabase/*.sql` file
- `spec/next-implementation-todo.md` (coordinate via short-lived edits only)

---

## Branch Naming

| Prefix | Used by | Example |
|---|---|---|
| `claude/` | Claude Code agent | `claude/api-spec-update` |
| `codex/` | Codex agent | `codex/security-hardening` |
| `feature/` | Human-driven work | `feature/story-pack-selector` |
| `fix/` | Bug fixes (any source) | `fix/timer-drift` |
| `chore/` | Deps, config, CI tweaks | `chore/dependabot-setup` |

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
3. Get an approval (from the other agent or the human owner).
4. Use the GitHub merge button — no direct pushes.

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

`.github/workflows/ci.yml` runs on every push and PR targeting `master`:

| Step | Command | Failure behavior |
|---|---|---|
| Install | `npm ci` | Hard failure |
| Type check | `npm run check` | Hard failure |
| Test | `npm test` | Hard failure |
| Build | `npm run build` | Hard failure |
| Audit | `npm audit --audit-level=high` | `continue-on-error: true` (visible but non-blocking) |

Concurrency: only one CI run per branch at a time; new pushes cancel in-flight runs.

---

## Dependabot

`.github/dependabot.yml` opens weekly PRs for backend npm updates every Monday:

- `@types/*` packages are grouped into a single PR.
- Major-version bumps for `express` and `zod` are ignored (require manual review).
- PR limit: 5 open Dependabot PRs at a time.

Review and merge Dependabot PRs promptly — the CI will validate them before they can be merged.

---

## Test Expectations

- All new backend service code must have corresponding unit tests in `*.test.ts` alongside the source file.
- Tests use **Vitest** with manual mocks for Supabase and Firebase clients.
- A test file must not import the real Supabase or Firebase clients — mock them at the top of the file.
- Tests must pass with `npm test` before any PR is opened.
- The test count (currently `149`) is not a hard ceiling — add as many tests as the code needs.
