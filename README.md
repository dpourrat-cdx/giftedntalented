# Captain Nova's Rocket Mission

A story-driven gifted practice app for children. The child takes on the role of an explorer helping Captain Nova rebuild a rocket across 8 mission chambers - each containing a challenge that unlocks the next rocket part.

**Live app:** `https://dpourrat-cdx.github.io/giftedntalented/`
**Backend health:** `https://giftedntalented.onrender.com/api/v1/health`

## Architecture

| Layer | Technology | Location |
|---|---|---|
| Frontend | Static HTML/CSS/JS | GitHub Pages - repo root |
| Backend | Node.js 22 + Express 5 + TypeScript | Render - `backend/` |
| Database | Supabase (Postgres) | Managed service |

The backend owns question selection, answer validation, and score persistence. The frontend is a static app that drives story and UI.

## Quick Start

### Backend

```bash
cd backend
npm ci
npm run check
npm test
npm run dev
npm run smoke:live
```

### Frontend

```bash
npx serve . -l 3000
```

The frontend points at the production Render backend by default. No URL swap is needed for UI-only changes.

## Key Docs

| Doc | Purpose |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Multi-agent workflow, branch naming, local dev, merge checklist, test expectations |
| [`doc/README.md`](doc/README.md) | Documentation index and purpose of each repo doc |
| [`doc/product-spec.md`](doc/product-spec.md) | Current shipped product behavior - mission flow, scoring, parent controls |
| [`doc/architecture.md`](doc/architecture.md) | System design, release flow, CI pipeline, smoke checks, environment variables |
| [`doc/backlog.md`](doc/backlog.md) | Live backlog of open work only |
| [`doc/backend-api-spec.md`](doc/backend-api-spec.md) | Current backend API reference |
