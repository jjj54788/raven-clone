# Frontend App Router Notes

Last updated: 2026-02-15

## Layout / Global Styles

- `frontend/src/app/layout.tsx`
  - Sets basic metadata and wraps the app with `LanguageProvider`.
- `frontend/src/app/globals.css`
  - Tailwind v4 import and a small set of CSS variables for theme colors.

## Pages

- Main chat: `frontend/src/app/page.tsx`
  - Ensures a session exists before sending (creates via `/ask/sessions` when needed).
  - Uses a ref (`currentSessionIdRef`) to avoid stale session id during streaming.
  - Streams assistant response via `sendStreamChat()` and updates UI incrementally.
  - After stream completion, refreshes sessions list.
- Login/register: `frontend/src/app/login/page.tsx`
  - Local login/register via backend auth endpoints.
  - Google Sign-In uses Firebase client popup to obtain `idToken`, then calls backend `/auth/google`.
- Placeholder routes:
  - `frontend/src/app/coming-soon/page.tsx`
  - `frontend/src/app/not-found.tsx`
- Notifications: `frontend/src/app/notifications/page.tsx`
  - Local notification center with All/Unread filtering and read state stored in `localStorage`.
- What’s New: `frontend/src/app/whats-new/page.tsx`
  - Changelog UI backed by `frontend/src/lib/changelog.ts`.
