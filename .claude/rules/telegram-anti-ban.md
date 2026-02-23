---
paths:
  - electron/ipc/telegram.ts
---

# Telegram Anti-Ban Rules

## Rate Limiting

- **1-3 second delay** between consecutive API calls (use `await sleep(1000 + Math.random() * 2000)`)
- **Max 20-30 dialogs** fetched per `getDialogs` call
- Never mass-message without rate limiting
- Never send bulk requests in tight loops

## FloodWait Handling

When GramJS throws `FloodWaitError`, **wait the exact time** specified in `error.seconds`:
```ts
if (error instanceof Api.RpcError && error.errorMessage.startsWith('FLOOD_WAIT_')) {
  const seconds = Number(error.errorMessage.split('_')[2])
  await sleep(seconds * 1000)
  // retry once
}
```

## Session Management

- Store session via `StringSession.save()` -> `better-sqlite3`
- Save periodically (every 5 min) and on graceful shutdown
- **Never recreate sessions unnecessarily** -- reuse stored session string
- Session file contains auth keys -- never commit to git

## Client Fingerprint

Must match Telegram Desktop to avoid detection:
```
api_id: 2040, api_hash: b18441a1ff607e10a989891a5462e627
deviceModel: Desktop, systemVersion: Windows 10, appVersion: 5.12.1 x64
```

Do not change these values. They are defined in `CLIENT_OPTIONS` at the top of `electron/ipc/telegram.ts`.
