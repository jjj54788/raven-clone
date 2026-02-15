# Prisma Schema / Migrations Notes

Last updated: 2026-02-15

## Current Schema

File: `backend/prisma/schema.prisma`

- `User`
  - `email` unique
  - `password` is optional (`String?`)
  - `provider` defaults to `"local"`
  - `avatarUrl` optional
  - `credits` default 100
- `Session`
  - belongs to `User`, cascades on delete
  - has `title`, `updatedAt` for ordering
- `Message`
  - belongs to `Session`, cascades on delete
  - stores `role`, `content`, `model?`

## Migration Drift Warning

The checked-in migration SQL (`backend/prisma/migrations/20260214093058_init/migration.sql`) creates:

- `User.password` as `NOT NULL`
- No `provider` / `avatarUrl` columns

This does not match the current schema (which expects `password` nullable for Google accounts, and includes `provider/avatarUrl`).

Probable cause:

- Some environments use `prisma db push` (schema sync without generating migrations), while others use migrations.
  - `start.ps1` uses `pnpm prisma db push`
  - `README.md` suggests `prisma migrate dev` + seed

## Recommendation (Choose One Path)

1. Migrations-first:
   - Update migrations so DB matches `schema.prisma`.
   - Use `prisma migrate dev` locally and `prisma migrate deploy` in production.
2. Push-first (dev only):
   - Use `db push` for local prototypes, but don’t ship it as the canonical workflow.

## Seed

File: `backend/prisma/seed.ts`

- Upserts a default admin user:
  - `admin@raven.local` / `admin123`

