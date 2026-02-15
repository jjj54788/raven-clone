# AI Module Notes

Last updated: 2026-02-15

## Endpoints

Controller: `backend/src/modules/ai/ai.controller.ts`

- `GET  /api/v1/ai/models` (public)
- `POST /api/v1/ai/simple-chat` (public; optionally uses session history if token present)
- `POST /api/v1/ai/stream-chat` (public; SSE; optionally uses session history if token present)

Request body fields used:

- `message` (required)
- `model` (optional model id)
- `sessionId` (optional)
- `webSearch` (optional boolean)
- `messages` (optional manual history for `simple-chat`)

## Provider Abstraction

Service: `backend/src/modules/ai/ai.service.ts`

- Models are registered on module init, based on env vars:
  - OpenAI: `OPENAI_API_KEY` via OpenAI SDK (`openai` package)
  - DeepSeek: `DEEPSEEK_API_KEY` via OpenAI SDK with `baseURL=https://api.deepseek.com/v1`
  - Gemini: `GOOGLE_AI_API_KEY` via `fetch` to Generative Language API
- `getDefaultModel()` returns the first registered model.

## Message Flow

- System prompt:
  - Default: includes today's date and instructs replying in the user language.
  - If `webSearch=true`: runs Tavily and injects results into a special system prompt (instructs citation format).
- History:
  - If `sessionId` is present AND a bearer token is present, it loads the last 50 messages from DB and appends them.
  - Otherwise, `simple-chat` can accept `messages[]` in the request body.
- Persistence:
  - If `sessionId` is present AND token is present, it saves the user+assistant messages.
  - Also updates `Session.updatedAt` and auto-names the session based on the first user message.

## Session Ownership (Fixed)

- `loadSessionHistory(sessionId, userId)` and `saveMessages(sessionId, userId, ...)` verify ownership via `prisma.session.findFirst({ where: { id: sessionId, userId } })`.
- Uses "Session not found" for both missing and non-owned sessions (prevents enumeration).

## Other Notes / Risks

- Debug logging is gated behind `AI_DEBUG=1` and does not print API key prefixes.
- Basic request validation is enforced via DTOs + `ValidationPipe` (message length, UUID sessionId, etc.).
- CORS is globally enabled without restrictions (set in `main.ts`).

