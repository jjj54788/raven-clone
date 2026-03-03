# OpenClaw Tool Templates (Gewu Bridge)

These templates map OpenClaw tool calls to your Gewu backend bridge endpoints.
Adjust the exact format to match your OpenClaw tool configuration system.

## Tool 1: Save Knowledge Note

- Method: `POST`
- URL: `http://<gewu-host>:3001/api/v1/openclaw/notes`
- Header: `x-openclaw-key: <OPENCLAW_BRIDGE_KEY>`

Body (JSON):
```json
{
  "title": "<note title>",
  "content": "<summary or note>",
  "source": "wechat",
  "sourceUrl": "https://example.com",
  "tags": ["wechat", "summary"],
  "metadata": {
    "from": "openclaw",
    "chatId": "...",
    "messageId": "..."
  }
}
```

## Tool 2: Create Todo Task

- Method: `POST`
- URL: `http://<gewu-host>:3001/api/v1/openclaw/todos`
- Header: `x-openclaw-key: <OPENCLAW_BRIDGE_KEY>`

Body (JSON):
```json
{
  "title": "<task title>",
  "description": "<optional details>",
  "listName": "Inbox",
  "dueAt": "2026-02-18T09:00:00Z",
  "priority": 1
}
```

## Quick curl test

```bash
curl -X POST "http://localhost:3001/api/v1/openclaw/notes" \
  -H "Content-Type: application/json" \
  -H "x-openclaw-key: <OPENCLAW_BRIDGE_KEY>" \
  -d '{"title":"Test","content":"Hello","source":"wechat"}'
```

```bash
curl -X POST "http://localhost:3001/api/v1/openclaw/todos" \
  -H "Content-Type: application/json" \
  -H "x-openclaw-key: <OPENCLAW_BRIDGE_KEY>" \
  -d '{"title":"Buy coffee","priority":1}'
```
