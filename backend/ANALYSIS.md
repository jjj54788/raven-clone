# Backend Notes (NestJS + Prisma)

Last updated: 2026-02-15

## Structure / Entry Points

- App entry: `backend/src/main.ts`
  - Enables CORS with defaults (`app.enableCors()`).
  - Registers `GlobalExceptionFilter`.
- Root module: `backend/src/app.module.ts`
  - Imports: `PrismaModule`, `AuthModule`, `AiModule`, `AskModule`.

## Modules

- Prisma:
  - `backend/src/modules/prisma/prisma.module.ts` (global)
  - `backend/src/modules/prisma/prisma.service.ts` (connect retry loop)
- Auth:
  - `backend/src/modules/auth/*` (register/login/google/me)
  - JWT helper methods live in `AuthService`
- AI:
  - `backend/src/modules/ai/*` (models list, chat, streaming chat, Tavily web search)
- Ask:
  - `backend/src/modules/ask/*` (sessions CRUD and messages list; JWT protected)

## Environment Variables

From `backend/.env.example`:

- `PORT` (default 3001)
- `DATABASE_URL`
- `JWT_SECRET`
- Provider keys (optional): `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_AI_API_KEY`
- Web search (optional): `TAVILY_API_KEY`
- Google Sign-In (optional): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

## API Surface (v1)

- Auth:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/google`
  - `GET  /api/v1/auth/me` (JWT)
- AI:
  - `GET  /api/v1/ai/models`
  - `POST /api/v1/ai/simple-chat`
  - `POST /api/v1/ai/stream-chat` (SSE)
- Sessions:
  - `GET    /api/v1/ask/sessions` (JWT)
  - `POST   /api/v1/ask/sessions` (JWT)
  - `GET    /api/v1/ask/sessions/:id/messages` (JWT)
  - `DELETE /api/v1/ask/sessions/:id` (JWT)

## Known Issues / Risks

- **Permissive CORS** via `enableCors()` without allowlist.
- **Prisma migration drift** between `schema.prisma` and migration SQL (see `backend/prisma/ANALYSIS.md`).
