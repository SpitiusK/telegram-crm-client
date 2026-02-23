---
paths:
  - src/components/**
  - src/styles/**
---

# Design System Rules

## Color Tokens

Use **semantic CSS variable classes** for all components:
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `bg-popover`, `bg-primary`, `bg-destructive`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`
- Borders: `border-border`

Use **Telegram theme tokens** when semantic vars don't cover the case:
- `bg-telegram-sidebar`, `bg-telegram-message-out`, `bg-telegram-hover`
- `text-telegram-text-secondary`

Use **CRM stage tokens** for deal pipeline colors:
- `bg-crm-new`, `bg-crm-contacted`, `bg-crm-testing`, `bg-crm-negotiation`, `bg-crm-paid`, `bg-crm-working`

**NEVER** hardcode hex/rgb values in components. If a new color is needed, add it to `tailwind.config.ts`.
**NEVER** use default Tailwind palette (`bg-red-500`, `text-blue-600`).

## Components

Reuse shadcn/ui base components from `src/components/ui/`:
`Button`, `Input`, `Textarea`, `Card`, `Badge`, `Spinner`, `Separator`, `Tooltip`, `Dialog`, `Tabs`, `DropdownMenu`, `ScrollArea`, `Avatar`, `ContextMenu`, `Popover`, `ResizeHandle`

Use `cn()` from `@/lib/utils` for conditional class merging. Never concatenate className strings manually.
Use `cva` (class-variance-authority) when creating component variants.
Icons: `lucide-react` only.

## File Conventions

- One component per file, kebab-case filename, PascalCase named export
- Max 200 lines per component -- split into sub-components if larger
- Co-locate sub-components in same directory (e.g., `chat/message-item.tsx`, `chat/message-bubble.tsx`)
