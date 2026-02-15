# Raven Clone Repo Notes

Last updated: 2026-02-15

Base commit (local): `70a9de5` (`feat: add Google Sign-In via Firebase Authentication`)

## What This Repo Is

Full-stack clone of Raven AI Engine:

- Backend: NestJS + Prisma + PostgreSQL + JWT (`backend/`)
- Frontend: Next.js (App Router) + React + Tailwind (`frontend/`)
- AI providers: OpenAI, DeepSeek (OpenAI-compatible), Google Gemini
- Optional web search via Tavily (backend-side prompt injection of results)

## How To Run (Local)

- PostgreSQL: `docker compose up -d` (`docker-compose.yml`)
- Backend (port 3001): see `README.md` and `backend/package.json`
- Frontend (port 3000): see `frontend/package.json`
- One-click scripts: `start.ps1` / `start.bat` (note: has a DB readiness username mismatch; see below)

## High-Level Data Flow

1. User logs in (local email/password or Google Sign-In), receives `accessToken`.
2. Frontend stores token in `localStorage` and sends `Authorization: Bearer <token>` to backend.
3. New chat creates a `Session` via `/api/v1/ask/sessions`.
4. Chat uses `/api/v1/ai/stream-chat` (SSE) or `/api/v1/ai/simple-chat`; backend loads history from DB, calls provider, streams/returns content, then saves messages.

## Database Model (Prisma)

Defined in `backend/prisma/schema.prisma`:

- `User`: `email` unique, `password?`, `provider`, `avatarUrl?`, `credits`
- `Session`: belongs to `User`, auto-titled (`New Chat` -> first message snippet)
- `Message`: belongs to `Session`, stores `role`, `content`, `model?`

See `backend/prisma/ANALYSIS.md` for a migration drift note.

## Top Risks / TODOs (Actionable)

1. **Prisma migration drift**
   - Migration SQL doesn't match current schema; scripts mix `migrate` vs `db push`.
   - Details: `backend/prisma/ANALYSIS.md`
2. **Weak defaults / security posture**
   - Permissive CORS; token in `localStorage`.
   - Details: `backend/ANALYSIS.md`, `frontend/src/lib/ANALYSIS.md`
3. **Dev script mismatch**
   - `start.ps1` checks DB readiness with user `raven`, but docker-compose sets `POSTGRES_USER=postgres`.

## Where To Read First (For Agents)

- Repo overview: `my-code/ANALYSIS.md`
- Target site feature inventory: `my-code/TARGET_SITE_ANALYSIS.md`
- Backend overview: `backend/ANALYSIS.md`
- Frontend overview: `frontend/ANALYSIS.md`
- Module-level notes:
  - Auth: `backend/src/modules/auth/ANALYSIS.md`
  - AI: `backend/src/modules/ai/ANALYSIS.md`
  - Sessions: `backend/src/modules/ask/ANALYSIS.md`
  - Prisma: `backend/src/modules/prisma/ANALYSIS.md`
  - Frontend API: `frontend/src/lib/ANALYSIS.md`
