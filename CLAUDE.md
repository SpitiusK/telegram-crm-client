# Telegram CRM Client

Custom Telegram Desktop client with integrated CRM for бустер.рф (Bitrix24 + Claude AI).

## Quick Reference

```bash
pnpm install          # Install dependencies
pnpm dev              # Vite + Electron dev mode
pnpm build            # Production build
pnpm typecheck        # TypeScript strict check (MUST pass before commit)
pnpm lint             # ESLint
pnpm lint:fix         # ESLint autofix
pnpm format           # Prettier
pnpm test             # Vitest (unit + component)
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright E2E with UI
```

## Architecture

- **Runtime:** Electron 33+ (main + renderer processes)
- **UI:** React 18 + TypeScript 5.5+ (strict mode)
- **State:** Zustand (no Redux)
- **Styling:** Tailwind CSS + shadcn/ui
- **Telegram:** GramJS (`telegram` npm) — **MAIN PROCESS ONLY**
- **Local DB:** better-sqlite3
- **Build:** Vite + vite-plugin-electron + electron-builder

### Process Architecture

```
┌─────────────────────────┐     IPC      ┌──────────────────────┐
│   MAIN PROCESS (Node)   │◄────────────►│  RENDERER (Chromium) │
│                         │  contextBridge│                      │
│  • GramJS client        │              │  • React app          │
│  • SQLite database      │              │  • Zustand stores     │
│  • Bitrix24 API calls   │              │  • UI components      │
│  • Claude API calls     │              │  • Tailwind styling   │
│  • Activity logging     │              │                      │
└─────────────────────────┘              └──────────────────────┘
```

**IMPORTANT:** GramJS NEVER runs in renderer. All Telegram operations go through IPC.

### IPC Contract

Every IPC channel is typed in `src/types/ipc.ts` and exposed via `electron/preload.ts`.
Renderer accesses via `window.electronAPI.*` (see `src/lib/telegram.ts`, `src/lib/crm-api.ts`).

## Code Style — ENFORCED

- **TypeScript strict mode** — no `any`, ever
- **Named exports only** — no default exports
- **Functional components + hooks** — no class components
- **One component per file** — kebab-case files, PascalCase components
- **Zustand stores** — one per domain (auth, chats, crm, ui)
- **IPC typed end-to-end** — types shared between main/renderer

## Key Files

| File | Purpose |
|------|---------|
| `electron/main.ts` | Electron entry, BrowserWindow, IPC registration |
| `electron/preload.ts` | contextBridge, exposes typed API to renderer |
| `electron/ipc/telegram.ts` | GramJS wrapper: auth, dialogs, messages |
| `electron/ipc/crm.ts` | Bitrix24 REST API client |
| `electron/ipc/claude.ts` | Anthropic SDK: message generation |
| `electron/ipc/database.ts` | better-sqlite3: cache, state, activity log |
| `src/stores/*.ts` | Zustand stores |
| `src/components/` | React components by domain |
| `src/types/` | Shared TypeScript interfaces |

## Telegram Session

```
api_id: 2040 (Telegram Desktop official)
api_hash: b18441a1ff607e10a989891a5462e627
device_model: Desktop
system_version: Windows 10
app_version: 5.12.1 x64
```

**Anti-ban rules:**
- 1-3 second delay between API calls
- Max 20-30 dialogs per session
- Handle FloodWaitError — wait the specified time
- Never mass-message without rate limiting
- Store session file, never recreate unnecessarily

## Do NOT

- Use `any` type — use `unknown` and narrow
- Put GramJS in renderer process
- Use `nodeIntegration: true`
- Commit .env, .session files, or API keys
- Send messages without rate limiting
- Use default exports
- Use class components or Redux

## PRD & Agents

- Full product spec: `PRD.md`
- Agent definitions: `.claude/agents/`
- Architecture docs: `.claude/architecture/` (created by architect agent)

@PRD.md
