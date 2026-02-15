# Frontend Components Notes

Last updated: 2026-02-15

## Components (Reviewed)

- `frontend/src/components/ChatArea.tsx`
  - Scroll-to-bottom behavior on new messages.
- `frontend/src/components/ChatInput.tsx`
  - Textarea send on Enter, newline on Shift+Enter.
  - Model dropdown (uses models from backend).
  - Web search toggle (passed to backend stream endpoint).
  - Quote insertion: prepends markdown blockquote (`> ...`) to input.
- `frontend/src/components/ChatMessage.tsx`
  - User bubble vs assistant bubble.
  - Renders assistant markdown via `react-markdown`.
  - Copy-to-clipboard and Quote actions when not streaming.
- `frontend/src/components/Sidebar.tsx`
  - Navigation shell and sidebar collapse behavior.
  - Logout clears token and redirects to `/login`.
  - Language toggle.
- `frontend/src/components/QuoteFooter.tsx`
  - Rotates bilingual quotes with animated fade and theme backgrounds.
  - Pause/resume control + hover pause; persists manual pause in `localStorage` (`raven_quote_paused`).
  - Respects `prefers-reduced-motion` (disables rotation/animation).

## Components (Present But Not Deep-Reviewed Yet)

- `frontend/src/components/ChatHistory.tsx`
- `frontend/src/components/WelcomeScreen.tsx`

If issues are suspected in history rendering/UX, inspect these next.
