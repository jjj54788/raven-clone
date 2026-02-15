# Ask (Sessions) Module Notes

Last updated: 2026-02-15

## Endpoints (All JWT Protected)

Controller: `backend/src/modules/ask/ask.controller.ts`

- `GET    /api/v1/ask/sessions`
- `POST   /api/v1/ask/sessions`
- `GET    /api/v1/ask/sessions/:id/messages`
- `DELETE /api/v1/ask/sessions/:id`

## Implementation Summary

Service: `backend/src/modules/ask/ask.service.ts`

- `getSessions(userId)`: lists sessions ordered by `updatedAt desc`, includes message count.
- `createSession(userId)`: creates a new session titled `New Chat`.
- `getMessages(sessionId, userId)`: verifies session exists for that user, then returns messages ordered by time.
- `deleteSession(sessionId, userId)`: verifies ownership, then deletes session (messages cascade via FK).

## Notes / Gaps

- No pagination/limits on messages list (could grow large).
- No endpoint to rename sessions; AI module currently auto-names based on first message.

