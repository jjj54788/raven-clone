# Auth Module Notes

Last updated: 2026-02-15

## Endpoints

Controller: `backend/src/modules/auth/auth.controller.ts`

- `POST /api/v1/auth/register` `{ email, name, password }`
- `POST /api/v1/auth/login` `{ email, password }`
- `POST /api/v1/auth/google` `{ idToken }` (Firebase ID token)
- `GET  /api/v1/auth/me` (JWT)

## Implementation Summary

Service: `backend/src/modules/auth/auth.service.ts`

- Password auth:
  - `register`: ensures email unique; stores `bcrypt` hash.
  - `login`: compares password; blocks if the account has no password (Google-only account).
- JWT:
  - Access token: `expiresIn: 7d`
  - Refresh token: `expiresIn: 30d`
  - Tokens include `{ sub: userId, type }` (`type=access|refresh`).
  - `getUserIdFromRequest` reads `Authorization` header and returns `sub` for **access tokens only**.
- Google Sign-In:
  - `googleLogin` calls `verifyFirebaseToken` (`backend/src/utils/firebase-admin.ts`).
  - Creates user if missing; if user exists with `provider=local`, it flips provider to `google` and sets `avatarUrl`.

## Gaps / Risks

- Refresh token is issued but there is no refresh endpoint, and the frontend stores only `accessToken`.
- No rate limiting / lockout on login attempts.
- No normalization of emails (case/whitespace) and no password policy checks.

## Suggested Improvements

- Add refresh token rotation + endpoint, or remove refresh token entirely to avoid false expectations.
- Add basic rate limiting / lockout on login attempts.
