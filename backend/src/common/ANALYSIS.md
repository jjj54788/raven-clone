# Backend Common Layer Notes

Last updated: 2026-02-15

## Files

- Guard: `backend/src/common/guards/jwt-auth.guard.ts`
- Decorator: `backend/src/common/decorators/current-user.decorator.ts`
- Global filter: `backend/src/common/filters/http-exception.filter.ts`

## Behavior

- `JwtAuthGuard`
  - Extracts `Authorization: Bearer <token>` via `AuthService.getUserIdFromRequest`.
  - If valid, sets `request.userId` and allows the request.
  - Rejects refresh tokens and does **not** check user existence.
- `@CurrentUser()`
  - Returns `request.userId` (string).
- `GlobalExceptionFilter`
  - Converts thrown exceptions to `{ statusCode, message, timestamp }`.

## Notes / Risks

- Guard is custom and minimal; if endpoints need stronger auth semantics (user active flag, rotation, etc.), migrate to a structured approach (e.g. passport-jwt) or extend current guard/service.
- Global filter returns only `message`; it may drop structured validation errors if added later unless handled explicitly.
