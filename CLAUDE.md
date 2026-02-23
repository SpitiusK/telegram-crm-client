# Telegram CRM Client

Electron desktop Telegram client with Bitrix24 CRM + Claude AI for бустер.рф sales operators.

## Commands

```bash
npx pnpm install      # Install deps
npx pnpm dev          # Vite + Electron dev
npx pnpm build        # Production build
npx pnpm typecheck    # Must pass before commit
npx pnpm lint         # ESLint
npx pnpm lint:fix     # ESLint autofix
npx pnpm format       # Prettier
npx pnpm test         # Vitest
npx pnpm test:e2e     # Playwright E2E
```

## Architecture

Electron (main) + React 18 (renderer). Zustand for state. Tailwind + shadcn/ui for styling. better-sqlite3 for local cache. GramJS for Telegram MTProto.

**Critical invariant:** GramJS runs in main process ONLY. All Telegram operations go through IPC (`electron/ipc/telegram.ts` -> `electron/preload.ts` -> `window.electronAPI.*`). Never import `telegram` in renderer code.

Multi-account: each account gets its own `TelegramClient`. IPC handlers take `accountId` param. Use `getClientForAccount()` to route.

Telegram session fingerprint: `api_id=2040, api_hash=b18441a1ff607e10a989891a5462e627, device=Desktop, system=Windows 10, app=5.12.1 x64`.

## Code Rules (non-lintable)

- **Named exports only** -- no default exports
- **NEVER hardcode hex colors** in components -- use semantic tokens (`bg-primary`, `text-foreground`) or Telegram tokens (`bg-telegram-sidebar`). See `.claude/rules/design-system.md`
- **NEVER use Tailwind color palette** (`bg-red-500`) -- use semantic or CRM tokens (`bg-crm-new`)
- **Use `cn()` from `@/lib/utils`** for class merging -- never concatenate className strings
- **Use shadcn/ui components** from `src/components/ui/` -- don't recreate Button, Input, Card, Badge, etc.
- **Component size limit: 200 lines** -- split into sub-components
- **One component per file** -- kebab-case filenames, PascalCase exports
- Stores: one per domain (`src/stores/{auth,chats,crm,ui}.ts`), flat state, `useXxxStore` naming

## Skill & Agent Usage

- **Before any UI work** -- invoke `frontend-design` skill
- **Before any feature** -- invoke `brainstorming` skill
- **Before fixing bugs** -- invoke `systematic-debugging` skill
- **After completing work** -- invoke `verification-before-completion` skill
- **Use `ui-reviewer` agent** after UI changes
- **Use context7 MCP** for GramJS, Zustand, Tailwind, Electron docs

## Do NOT

- Put GramJS in renderer process
- Use `nodeIntegration: true`
- Commit .env, .session files, or API keys
- Use class components or Redux
- Duplicate UI patterns from `src/components/ui/`

## References

- Product spec: `PRD.md`
- Agent definitions: `.claude/agents/`
- Domain-specific rules: `.claude/rules/` (design-system, electron-ipc, telegram-anti-ban, zustand-stores)
