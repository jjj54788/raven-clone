# Prisma Module Notes

Last updated: 2026-02-15

## Files

- `backend/src/modules/prisma/prisma.module.ts` (global module)
- `backend/src/modules/prisma/prisma.service.ts` (PrismaClient + lifecycle)

## Behavior

- On module init, attempts to connect to Postgres with retries:
  - `maxRetries = 10`
  - `retryDelay = 3000ms`
- On module destroy, disconnects.

## Notes

- This is intentionally simple and works well for local Docker startup where Postgres may not be ready immediately.
- If connection errors need to be classified or metrics added, this is the place.

