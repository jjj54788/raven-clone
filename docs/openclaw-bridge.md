# OpenClaw Bridge (WeChat -> Gewu)

This bridge exposes minimal HTTP endpoints for OpenClaw to write into Gewu:
- Knowledge notes
- Todo tasks

## Env vars (backend/.env)

- OPENCLAW_BRIDGE_KEY=<random secret>
- OPENCLAW_BRIDGE_USER_EMAIL=admin@gewu.local
  - or OPENCLAW_BRIDGE_USER_ID=<user uuid>

## Health check

```
GET /api/v1/openclaw/health
```

Header:
- x-openclaw-key: <OPENCLAW_BRIDGE_KEY>

## Create a knowledge note

```
POST /api/v1/openclaw/notes
```

Body:
```json
{
  "title": "Example summary",
  "content": "Key points...",
  "source": "wechat",
  "sourceUrl": "https://example.com",
  "tags": ["wechat", "summary"],
  "metadata": {
    "from": "openclaw"
  }
}
```

## Create a todo task

```
POST /api/v1/openclaw/todos
```

Body:
```json
{
  "title": "Buy coffee",
  "description": "Americano",
  "listName": "Inbox",
  "dueAt": "2026-02-18T09:00:00Z",
  "priority": 1
}
```

Notes:
- listName is optional. If omitted, the task goes to Inbox.
- listId takes precedence over listName.

## OpenClaw side

Register HTTP tools in OpenClaw to call these endpoints, using the same key in the request header.
See `docs/openclaw-tools-template.md` for ready-to-copy payload templates.
