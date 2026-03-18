# Captain Nova Backend

## Purpose

This is a standalone Node.js + Express backend for the Captain Nova app.

It supports:

- player best-score storage in Supabase
- secure reset handling with the PIN verified server-side
- Android-ready FCM device registration
- admin-triggered push notifications
- Render deployment

## Quick Start

1. Copy `.env.example` to `.env`
2. Fill in the Supabase and admin values
3. Run the SQL in `backend/supabase/backend_schema.sql`
4. Install dependencies:

```bash
npm install
```

5. Start development:

```bash
npm run dev
```

6. Build for production:

```bash
npm run build
```

7. Start production build:

```bash
npm run start
```

## Render

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health path: `/api/v1/health`

## Main Routes

- `GET /api/v1/health`
- `GET /api/v1/players/:playerName/record`
- `POST /api/v1/players/:playerName/record`
- `POST /api/v1/devices/register`
- `POST /api/v1/devices/unregister`
- `POST /api/v1/admin/scores/reset`
- `POST /api/v1/admin/push/send`

## Notes

- Browser CORS is restricted to the configured allowlist.
- Mobile/native clients can call the API without a browser `Origin` header.
- FCM send endpoints stay disabled until the Firebase service account values are configured.
