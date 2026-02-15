# Frontend Notes (Next.js App Router)

Last updated: 2026-02-15

## Structure / Entry Points

- App Router pages live in `frontend/src/app/`
  - Main chat: `frontend/src/app/page.tsx` (client component)
  - Login/register: `frontend/src/app/login/page.tsx` (client component)
  - Coming soon: `frontend/src/app/coming-soon/page.tsx`
  - Layout: `frontend/src/app/layout.tsx` (wraps `LanguageProvider`)
  - Global styles: `frontend/src/app/globals.css` (Tailwind v4 + CSS variables)

## API / Auth

- API wrapper: `frontend/src/lib/api.ts`
  - Uses `Authorization: Bearer <token>` header.
  - Stores `accessToken` in `localStorage` under `raven_token`.
  - Stores user object in `localStorage` under `raven_user`.
- Client-side auth gate:
  - `useAuth()` (`frontend/src/hooks/useAuth.ts`) redirects to `/login` if no token.

## Chat UI Summary

- `frontend/src/app/page.tsx` orchestrates:
  - Model list via `useModels()`
  - Sessions/messages via `useSessions()`
  - Streaming chat via `sendStreamChat()` (SSE parsing in fetch stream)
  - Auto-create session when sending the first message of a new chat
- Rendering:
  - `ChatHistory`, `ChatArea`, `ChatInput`, `ChatMessage`, `Sidebar`, etc. in `frontend/src/components/`
- i18n:
  - `LanguageContext` with `en.json`/`zh.json`, persisted in `localStorage` (`raven_lang`)

## Known Issues / Risks

- API base is hard-coded to `http://localhost:3001/api/v1` (`frontend/src/lib/api.ts`), so deployments need code changes unless refactored to env-driven base URL.
- Token stored in `localStorage` (XSS blast radius). If switching to cookies, add CSRF protections.
- Auth is purely client-side routing (no SSR protection/middleware).

