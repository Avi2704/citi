# WasteFlow AI (MVP)

WasteFlow AI is a civic waste-management platform where citizens submit geo-tagged waste reports, the backend performs AI-assisted analysis, and operations teams verify, assign, route, collect, and resolve issues.

## Features

- Supabase auth + profile roles (`citizen`, `admin`, `collection_staff`)
- Citizen waste report submission with image upload (JPG/PNG/WebP, max 10MB)
- Backend-only AI image analysis via OpenAI Responses API + strict Zod output validation
- Deterministic backend priority engine (`calculatePriority`)
- Duplicate detection by geo radius + lookback window
- Route optimization endpoint with OSRM distance + Haversine fallback
- Vehicle capacity validation before route creation
- Status history (`report_status_history`) and internal notifications
- Role-protected frontend routing for citizen/admin/staff pages
- Supabase schema migration + development demo seed SQL

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind + React Router
- **Backend**: Node.js + Express + TypeScript
- **Data/Auth/Storage**: Supabase Postgres, Auth, Storage bucket `waste-images`
- **AI**: OpenAI API (model from `OPENAI_MODEL`)
- **Routing**: OSRM primary, Haversine fallback

## Repository structure

```
frontend/
backend/
supabase/
  migrations/
  seed.sql
.env.example
```

## Database schema

Migration creates all core tables described in the issue, including:

- `profiles`
- `waste_reports`
- `ai_analysis`
- `waste_images`
- `duplicate_groups`
- `collection_teams`
- `vehicles`
- `assignments`
- `routes`
- `route_stops`
- `resolution_proofs`
- `report_status_history`
- `notifications`

RLS policies are included for citizen/admin/staff access boundaries.

## Environment variables

Copy `.env.example` values into:

- `backend/.env`
- `frontend/.env`

Important vars:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OSRM_BASE_URL`
- `DUPLICATE_RADIUS_METERS`
- `DUPLICATE_LOOKBACK_HOURS`

## Local setup

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Supabase setup

1. Create a Supabase project
2. Create storage bucket `waste-images`
3. Run SQL migration in `supabase/migrations/20261002183000_init_wasteflow.sql`
4. Optionally run `supabase/seed.sql` for DEMO DATA

### 3) Run backend

```bash
cd backend
npm run dev
```

### 4) Run frontend

```bash
cd frontend
npm run dev
```

## API overview

Implemented endpoints include:

- `POST /api/auth/profile`
- `POST /api/reports`
- `GET /api/reports`
- `GET /api/reports/:id`
- `POST /api/reports/:id/verify`
- `POST /api/reports/:id/reject`
- `POST /api/reports/:id/assign`
- `POST /api/reports/:id/resolve`
- `POST /api/reports/:id/resolution-proof`
- `POST /api/routes/optimize`
- `GET /api/routes`
- `GET /api/routes/:id`
- `POST /api/routes/:id/stops/:stopId/start`
- `POST /api/routes/:id/stops/:stopId/complete`
- `GET /api/teams`
- `POST /api/teams`
- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/analytics/overview`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

## Testing

Backend unit tests cover:

- Priority calculation
- Duplicate distance math
- AI schema validation
- Image validation
- Route capacity and optimization logic
- Role authorization guard

Run tests:

```bash
cd backend
npm test
```

## Deployment

- Frontend: Vercel/Netlify (set `VITE_*` env vars)
- Backend: Render/Railway (set backend env vars)
- Database/Auth/Storage: Supabase

## Known limitations

- Frontend admin/staff pages are scaffolded and should be expanded with richer map/operations UX.
- End-to-end runtime verification against a live Supabase/OpenAI project is required in deployment environment.
- Email notifications are not wired; internal notifications table is implemented.

## Future improvements

- Richer admin map controls and filtering
- Enhanced duplicate description similarity scoring
- Realtime subscriptions for status transitions
- Additional integration tests with seeded auth users
