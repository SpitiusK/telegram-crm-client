---
paths:
  - electron/**
  - src/lib/telegram.ts
  - src/lib/crm-api.ts
  - src/types/ipc.ts
---

# Electron IPC Rules

## Process Boundary

```
Main Process (Node.js)          Renderer (Chromium)
  GramJS TelegramClient          React + Zustand
  better-sqlite3                  UI components
  Bitrix24 fetch                  Tailwind styling
  Anthropic SDK
         |                              |
         +--- contextBridge (IPC) ------+
```

GramJS, SQLite, and all API clients run in **main process only**. Renderer accesses them exclusively through `window.electronAPI.*`.

## IPC Contract Workflow

1. Define channel types in `src/types/ipc.ts`
2. Register handler in `electron/ipc/*.ts` via `ipcMain.handle(channel, handler)`
3. Expose in `electron/preload.ts` via `contextBridge.exposeInMainWorld`
4. Wrap in `src/lib/telegram.ts` or `src/lib/crm-api.ts` for store consumption

All 4 layers must stay in sync. If you add/change a channel, update all 4 files.

## Multi-Account Architecture

Every Telegram IPC handler takes `accountId` as first param (or uses active account as fallback).
Main process stores clients in `Map<string, { client, sessionString }>`.
Use `getClientForAccount(accountId)` to retrieve the correct client.
Never assume a single global client -- always route by account ID.

## Error Handling

- Wrap IPC handlers in try/catch, return `{ success: false, error: message }` on failure
- Renderer-side wrappers in `src/lib/` should throw typed errors for store consumption
- Never expose raw Error objects across IPC -- serialize to string
