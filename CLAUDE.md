# Telegram CRM Client

Custom Telegram Desktop client with integrated CRM for бустер.рф (Bitrix24 + Claude AI).

## Quick Reference

```bash
npx pnpm install      # Install dependencies
npx pnpm dev          # Vite + Electron dev mode
npx pnpm build        # Production build
npx pnpm typecheck    # TypeScript strict check (MUST pass before commit)
npx pnpm lint         # ESLint
npx pnpm lint:fix     # ESLint autofix
npx pnpm format       # Prettier
npx pnpm test         # Vitest (unit + component)
npx pnpm test:e2e     # Playwright E2E tests
npx pnpm test:e2e:ui  # Playwright E2E with UI
```

## Architecture

- **Runtime:** Electron 33+ (main + renderer processes)
- **UI:** React 18 + TypeScript 5.5+ (strict mode)
- **State:** Zustand (no Redux)
- **Styling:** Tailwind CSS + shadcn/ui (New York style)
- **Design tokens:** CSS variables in `src/styles/globals.css`, mapped to Telegram palette
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

## Design System — ENFORCED

### Colors
- Use **semantic CSS variable classes** for all new/modified components: `bg-primary`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, etc.
- Use **Telegram theme tokens** where semantic variables don't fit: `bg-telegram-sidebar`, `text-telegram-text-secondary`, `bg-telegram-message-out`
- **NEVER hardcode hex colors** (`#3b82f6`, `rgb(...)`) in components. Add to Tailwind config if a new color is needed.
- **NEVER use default Tailwind color palette** (`bg-red-500`, `bg-blue-500`) — use semantic tokens or CRM tokens (`bg-crm-new`, `bg-crm-contacted`).

### Components
- Use **shadcn/ui base components** from `src/components/ui/` — `Button`, `Input`, `Card`, `Badge`, `Spinner`, `Separator`, `Tooltip`
- Use `cn()` from `@/lib/utils` for conditional class merging — never concatenate className strings manually
- Use `cva` (class-variance-authority) for component variants
- **Component size limit: 200 lines**. Split large components into sub-components.

### CSS Variables (Telegram Theme Mapping)

| Variable | Maps to | Hex |
|----------|---------|-----|
| `--background` | telegram-bg | `#17212b` |
| `--foreground` | telegram-text | `#f5f5f5` |
| `--card` | telegram-message | `#182533` |
| `--primary` | telegram-accent | `#6ab2f2` |
| `--muted` | telegram-input | `#242f3d` |
| `--muted-foreground` | telegram-text-secondary | `#708499` |
| `--border` | telegram-border | `#1f2f3f` |
| `--accent` | telegram-hover | `#1e2c3a` |
| `--popover` | telegram-sidebar | `#0e1621` |

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
| `src/components/ui/` | shadcn/ui base components (Button, Input, Card, etc.) |
| `src/components/` | React components by domain |
| `src/lib/utils.ts` | `cn()` utility for class merging |
| `src/styles/globals.css` | CSS variables (Telegram theme tokens) |
| `src/types/` | Shared TypeScript interfaces |
| `components.json` | shadcn/ui CLI config |

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

## Skill & Agent Usage

- **Before any UI work** — invoke `frontend-design` skill
- **Before any feature** — invoke `brainstorming` skill
- **Before fixing bugs** — invoke `systematic-debugging` skill
- **After completing work** — invoke `verification-before-completion` skill
- **Use `ui-reviewer` agent** to audit design consistency after UI changes
- **Use context7 MCP** for GramJS, Zustand, Tailwind, Electron documentation lookups

## Do NOT

- Use `any` type — use `unknown` and narrow
- Put GramJS in renderer process
- Use `nodeIntegration: true`
- Commit .env, .session files, or API keys
- Send messages without rate limiting
- Use default exports
- Use class components or Redux
- Hardcode hex colors in components
- Create components over 200 lines
- Duplicate UI patterns that exist in `src/components/ui/`

## PRD & Agents

- Full product spec: `PRD.md`
- Agent definitions: `.claude/agents/`
- Architecture docs: `docs/architecture/`

@PRD.md
