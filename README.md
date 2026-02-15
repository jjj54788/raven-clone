# Raven AI Engine Clone

A full-stack clone of [Raven AI Engine](https://raven-ai-engine.up.railway.app/ai-ask), built with NestJS + Next.js.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS, Prisma ORM, PostgreSQL, JWT |
| **Frontend** | Next.js 15, React 19, TailwindCSS v4 |
| **AI** | DeepSeek, OpenAI, Google Gemini (multi-provider) |
| **Database** | PostgreSQL 17 (Docker) |

## Project Structure

```
raven-clone/
├── backend/
│   ├── prisma/              # Database schema & migrations
│   ├── src/
│   │   ├── common/          # Guards, decorators, filters
│   │   │   ├── guards/      # JwtAuthGuard
│   │   │   ├── decorators/  # @CurrentUser
│   │   │   └── filters/     # GlobalExceptionFilter
│   │   ├── modules/
│   │   │   ├── prisma/      # Database service (global)
│   │   │   ├── auth/        # Authentication (register/login/JWT)
│   │   │   ├── ai/          # AI models & chat
│   │   │   └── ask/         # Session management
│   │   ├── app.module.ts    # Root module
│   │   └── main.ts          # Entry point
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # API client
│   └── package.json
├── docker-compose.yml       # PostgreSQL one-click setup
└── .prettierrc              # Code formatting
```

## Quick Start (4 Steps)

### Step 1: Start PostgreSQL

```powershell
docker compose up -d
```

### Step 2: Start Backend

```powershell
cd backend

# Create .env from example (then fill in your API keys)
copy .env.example .env

pnpm install
npx prisma generate
npx prisma migrate dev --name init
pnpm prisma:seed
pnpm start:dev
```

### Step 3: Start Frontend (new terminal)

```powershell
cd frontend
pnpm install
pnpm dev
```

### Step 4: Open Browser

Visit http://localhost:3000

Default account: `admin@raven.local` / `admin123`

## Features

- Multi-model AI chat (DeepSeek V3, DeepSeek R1, GPT, Gemini)
- User registration & login (JWT)
- Optional invite-only sign-ups (allowlist)
- Basic AI usage limits (rate limit, stream concurrency, credits)
- Chat session management (create, switch, delete)
- Message persistence (survives page refresh)
- Auto-naming sessions based on first message
- Responsive UI matching original Raven design

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register new user (invite-only in production by default) |
| POST | `/api/v1/auth/login` | No | Login |
| GET | `/api/v1/auth/me` | Yes | Get current user |
| GET | `/api/v1/ai/models` | No | List available AI models |
| POST | `/api/v1/ai/simple-chat` | Yes | Send chat message |
| POST | `/api/v1/ai/stream-chat` | Yes | Stream chat message (SSE) |
| GET | `/api/v1/ask/sessions` | Yes | List user sessions |
| POST | `/api/v1/ask/sessions` | Yes | Create new session |
| GET | `/api/v1/ask/sessions/:id/messages` | Yes | Get session messages |
| DELETE | `/api/v1/ask/sessions/:id` | Yes | Delete session |

## Docs Automation (ANALYSIS.md)

This repo keeps per-module notes in `ANALYSIS.md`. Enable git hooks so these snapshots stay up to date on every commit/push:

- Windows: `./scripts/setup-githooks.ps1`
- macOS/Linux: `./scripts/setup-githooks.sh`

Hooks run `node scripts/gen-analysis-md.mjs` and will stage updated `**/ANALYSIS.md` automatically.
