---
name: migrate-component
description: Migrate a React component to use the design system (shadcn/ui, semantic CSS vars, cn(), accessibility). Invoke with component file path.
---

# Migrate Component to Design System

Systematically migrate a React component to follow the project's design system.

## Checklist (apply in order)

1. **Replace hand-rolled spinners** → `import { Spinner } from '@/components/ui/spinner'`
   - Pattern to find: `border-2 border-telegram-accent border-t-transparent rounded-full animate-spin`
   - Replace with: `<Spinner size="sm|md|lg" />`

2. **Replace telegram-* classes with semantic equivalents**
   - `bg-telegram-bg` → `bg-background`
   - `bg-telegram-sidebar` → `bg-popover`
   - `bg-telegram-message` → `bg-card`
   - `bg-telegram-hover` → `bg-accent`
   - `bg-telegram-input` → `bg-muted`
   - `text-telegram-text` → `text-foreground`
   - `text-telegram-text-secondary` → `text-muted-foreground`
   - `text-telegram-accent` → `text-primary`
   - `bg-telegram-accent` → `bg-primary`
   - `border-telegram-border` → `border-border`
   - `ring-telegram-accent` → `ring-primary`
   - Keep `bg-telegram-message-out` (no semantic equivalent)

3. **Remove default Tailwind palette colors**
   - `bg-red-500`, `bg-blue-500`, etc. → use CRM tokens or semantic vars
   - `text-blue-400` for links → `text-primary`
   - `bg-gray-500` fallbacks → `bg-muted`

4. **Replace className string concatenation with cn()**
   - Add: `import { cn } from '@/lib/utils'`
   - Replace: `` className={`base ${condition ? 'a' : 'b'}`} ``
   - With: `className={cn('base', condition ? 'a' : 'b')}`

5. **Add aria-labels to icon-only buttons**
   - Every `<button>` with only an SVG/icon child needs `aria-label="Description"`

6. **Replace hand-rolled UI with shadcn/ui components** where applicable
   - Plain `<button>` with styled classes → `<Button variant="ghost|outline|default">`
   - Plain `<input>` → `<Input />`
   - Card-like containers → `<Card>` / `<CardContent>`

7. **Standardize imports to @/ alias**
   - `../../stores/xxx` → `@/stores/xxx`
   - `../../types` → `@/types`
   - `../ui/xxx` → `@/components/ui/xxx`

## Do NOT change
- Component logic, state management, or behavior
- Props interface
- File naming or export pattern
- telegram-message-out class (no semantic equivalent)
