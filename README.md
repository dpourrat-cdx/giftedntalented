# Captain Nova's Rocket Mission

A story-driven gifted practice app for children. The child takes on the role of an explorer helping Captain Nova rebuild a rocket across 8 mission chambers — each containing a challenge that unlocks the next rocket part.

**Live app:** `https://dpourrat-cdx.github.io/giftedntalented/`
**Backend health:** `https://giftedntalented.onrender.com/api/v1/health`

## Architecture

| Layer | Technology | Location |
|---|---|---|
| Frontend | Static HTML/CSS/JS | GitHub Pages — repo root |
| Backend | Node.js 22 + Express 5 + TypeScript | Render — `backend/` |
| Database | Supabase (Postgres) | Managed service |

The backend owns question selection, answer validation, and score persistence. The frontend is a static app that drives story and UI.

## Quick Start

### Backend

```bash
cd backend
npm ci
npm run check    # TypeScript type check
npm test         # Vitest suite
npm run dev      # Dev server on port 10000
npm run smoke:live  # Smoke test against live Render backend
```

### Frontend

```bash
npx serve . -l 3000   # Serve static files at localhost:3000
```

The frontend points at the production Render backend by default. No URL swap is needed for UI-only changes.

## Key Docs

| Doc | Purpose |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Multi-agent workflow (Claude + Codex), branch naming, local dev, merge checklist, test expectations |
| [`spec/product-spec.md`](spec/product-spec.md) | Current shipped product behavior — mission flow, scoring, parent controls |
| [`spec/architecture.md`](spec/architecture.md) | System design, release flow, CI pipeline, smoke checks, environment variables |
| [`spec/backlog.md`](spec/backlog.md) | Prioritized backlog of next work |
| [`spec/backend-api-spec.md`](spec/backend-api-spec.md) | API reference *(predates the attempt-based flow — rewrite tracked in backlog Priority 2)* |
