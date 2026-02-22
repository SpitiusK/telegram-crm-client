# Atomic Design: Atoms Catalog

Component catalog for atom-level UI primitives in the Telegram CRM Client.

**Stack:** React 18 + TypeScript 5.5 strict + Tailwind CSS + shadcn/ui
**Theme:** Dark-first (`#17212b` base, `#6ab2f2` accent)
**Conventions:** Named exports only, functional components, no `any`

---

## Table of Contents

1. [Avatar](#1-avatar)
2. [Badge](#2-badge)
3. [Button](#3-button)
4. [Icon](#4-icon)
5. [Input](#5-input)
6. [Label](#6-label)
7. [Spinner](#7-spinner)
8. [Text](#8-text)
9. [Timestamp](#9-timestamp)
10. [Tooltip](#10-tooltip)
11. [Toggle](#11-toggle)
12. [Separator](#12-separator)

---

## 1. Avatar

Renders a user or group avatar with optional online indicator and account color badge. Falls back to generated initials with a deterministic background color when no image URL is provided.

### File

`src/components/atoms/Avatar.tsx`

### Props Interface

```typescript
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

export type AccountColor =
  | 'red'
  | 'orange'
  | 'violet'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'pink'

export interface AvatarProps {
  /** Image source URL — Telegram avatar CDN or blob URL */
  src?: string
  /** Display name used to generate initials fallback */
  name: string
  /** Pixel size tier */
  size?: AvatarSize
  /** Show green online dot in bottom-right corner */
  showOnlineIndicator?: boolean
  /** Whether the contact is currently online */
  isOnline?: boolean
  /** Color badge shown in top-right corner for multi-account indicator */
  accountColor?: AccountColor
  /** Additional class names for the wrapper element */
  className?: string
}
```

### Size Table

| Size | Pixel value | Tailwind class | Font size (initials) |
|------|-------------|----------------|----------------------|
| `xs` | 24 px       | `w-6 h-6`      | `text-[9px]`         |
| `sm` | 32 px       | `w-8 h-8`      | `text-xs`            |
| `md` | 40 px       | `w-10 h-10`    | `text-sm`            |
| `lg` | 56 px       | `w-14 h-14`    | `text-base`          |

### Account Color Table

| Token     | Hex value | Tailwind bg class          |
|-----------|-----------|----------------------------|
| `red`     | `#e17076` | `bg-[#e17076]`             |
| `orange`  | `#ee8172` | `bg-[#ee8172]`             |
| `violet`  | `#a695e7` | `bg-[#a695e7]`             |
| `green`   | `#6cc792` | `bg-[#6cc792]`             |
| `cyan`    | `#5fb8d4` | `bg-[#5fb8d4]`             |
| `blue`    | `#6ab2f2` | `bg-telegram-accent`       |
| `pink`    | `#ee5e99` | `bg-[#ee5e99]`             |

### Initials Generation

Extract up to two capital letters from the `name` prop. For single-word names take the first letter; for multi-word take first letter of first and last word. Derive a deterministic background color by hashing `name.length % accountColors.length`.

```typescript
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getColorFromName(name: string): string {
  const colors = ['#e17076', '#ee8172', '#a695e7', '#6cc792', '#5fb8d4', '#6ab2f2', '#ee5e99']
  return colors[name.length % colors.length]
}
```

### Tailwind Strategy

- Outer wrapper: `relative inline-flex shrink-0`
- Image/initials circle: `rounded-full overflow-hidden object-cover`
- Online dot: `absolute bottom-0 right-0 rounded-full border-2 border-telegram-sidebar bg-green-400`
- Account badge: `absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-telegram-sidebar`

### Usage Examples

```tsx
// Basic avatar with image
<Avatar
  src="https://cdn.telegram.org/..."
  name="Alex Petrov"
  size="md"
/>

// Fallback initials with online indicator
<Avatar
  name="Maria Ivanova"
  size="sm"
  showOnlineIndicator
  isOnline={true}
/>

// Multi-account badge (blue account)
<Avatar
  name="Work Account"
  size="md"
  accountColor="blue"
  showOnlineIndicator
  isOnline={false}
/>
```

### Accessibility

- Render as `<div role="img" aria-label={name}>` when no `<img>` element is present (initials fallback).
- When an image is present use `<img alt={name} />`.
- The online indicator dot should include `aria-label="Online"` or be hidden from AT via `aria-hidden="true"` when the online state is conveyed elsewhere (e.g., in a contact detail pane).
- Account badge: `aria-hidden="true"` — color alone does not convey info; account name is available in a parent context.

---

## 2. Badge

Displays a count (unread messages) or a status dot. Used on `Avatar`, `ChatListItem`, and nav tabs.

### File

`src/components/atoms/Badge.tsx`

### Props Interface

```typescript
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeKind = 'count' | 'dot'

export interface BadgeProps {
  /** Rendering mode: numeric count or status dot */
  kind?: BadgeKind
  /** Number displayed inside a count badge; capped at 99+ */
  count?: number
  /** Visual style variant */
  variant?: BadgeVariant
  /** Accessible label when count or dot is the only indicator */
  'aria-label'?: string
  /** Additional class names */
  className?: string
}
```

### Variant Table

| Variant   | Background             | Text      | Use case                        |
|-----------|------------------------|-----------|---------------------------------|
| `default` | `bg-telegram-accent`   | `#ffffff` | Unread message count (primary)  |
| `success` | `bg-green-500`         | `#ffffff` | Online status, task complete    |
| `warning` | `bg-yellow-500`        | `#000000` | Pending, awaiting action        |
| `danger`  | `bg-red-500`           | `#ffffff` | Error, overdue, urgent          |
| `info`    | `bg-sky-500`           | `#ffffff` | Informational status            |

### Count Capping

Display counts above 99 as `99+`. Counts of zero should hide the badge entirely (return `null`).

```typescript
function formatCount(n: number): string {
  return n > 99 ? '99+' : String(n)
}
```

### Tailwind Strategy

**Count badge:**
```
min-w-[18px] h-[18px] px-1
rounded-full
text-[10px] font-semibold leading-none
flex items-center justify-center
```

**Dot badge:**
```
w-2 h-2 rounded-full
```

### Usage Examples

```tsx
// Unread count on chat list item
<Badge kind="count" count={dialog.unreadCount} variant="default" aria-label={`${dialog.unreadCount} unread messages`} />

// Status dot — online
<Badge kind="dot" variant="success" aria-label="Online" />

// Danger dot — error state
<Badge kind="dot" variant="danger" aria-label="Connection error" />
```

### Accessibility

- Count badges must have an `aria-label` when used standalone (not adjacent to visible text) — e.g., `aria-label="12 unread messages"`.
- Dot badges with no visible label must always have `aria-label`.
- Use `role="status"` on count badges that update dynamically so screen readers announce changes.

---

## 3. Button

The primary interactive element. Covers all call-to-action patterns: form submissions, icon-only toolbar actions, destructive confirmations.

### File

`src/components/atoms/Button.tsx`

### Props Interface

```typescript
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style */
  variant?: ButtonVariant
  /** Size tier */
  size?: ButtonSize
  /** Icon rendered before label text */
  iconLeft?: ReactNode
  /** Icon rendered after label text */
  iconRight?: ReactNode
  /** Renders only an icon with no label text — sets aria-label required */
  iconOnly?: boolean
  /** Shows a spinner and disables interaction */
  loading?: boolean
  /** Forwarded to native disabled attribute; also applies disabled styles */
  disabled?: boolean
  children?: ReactNode
}
```

### Variant Table

| Variant     | Background             | Text                   | Border                 | Hover                          |
|-------------|------------------------|------------------------|------------------------|--------------------------------|
| `primary`   | `bg-telegram-accent`   | `text-white`           | none                   | `hover:bg-[#5aa3e3]`           |
| `secondary` | `bg-white/10`          | `text-telegram-text`   | none                   | `hover:bg-white/20`            |
| `ghost`     | transparent            | `text-telegram-text`   | none                   | `hover:bg-white/5`             |
| `danger`    | `bg-red-600`           | `text-white`           | none                   | `hover:bg-red-700`             |
| `outline`   | transparent            | `text-telegram-accent` | `border border-telegram-accent` | `hover:bg-telegram-accent/10` |

### Size Table

| Size | Height | Padding (x) | Font size | Icon size |
|------|--------|-------------|-----------|-----------|
| `sm` | 32 px  | `px-3`      | `text-sm` | 14 px     |
| `md` | 40 px  | `px-4`      | `text-sm` | 16 px     |
| `lg` | 48 px  | `px-6`      | `text-base`| 18 px    |

### Disabled and Loading States

- `disabled` or `loading`: apply `opacity-50 cursor-not-allowed pointer-events-none`
- `loading`: replace `iconLeft` with `<Spinner size="sm" />` and keep the label text so layout is stable

### Tailwind Strategy

Base classes applied to every button variant:
```
inline-flex items-center justify-center gap-2
rounded-lg font-medium
transition-colors duration-150
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-telegram-accent focus-visible:ring-offset-2 focus-visible:ring-offset-telegram-bg
disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
```

### Usage Examples

```tsx
// Primary action
<Button variant="primary" size="md" onClick={handleSend}>
  Send Message
</Button>

// Icon-only toolbar button
<Button
  variant="ghost"
  size="sm"
  iconOnly
  aria-label="Search chats"
>
  <Icon name="Search" size={16} />
</Button>

// Loading state during async operation
<Button variant="primary" loading={isGenerating} disabled={isGenerating}>
  Generate
</Button>

// Danger confirmation
<Button variant="danger" size="md" iconLeft={<Icon name="Trash2" size={14} />}>
  Delete Deal
</Button>
```

### Accessibility

- Always provide `aria-label` for `iconOnly` buttons.
- `disabled` buttons are excluded from tab order via `disabled` attribute — do not use `tabIndex={-1}` as a substitute.
- `loading` state: add `aria-busy="true"` and `aria-disabled="true"` to signal the async state to AT.
- Focus ring is visible in all high-contrast modes via `focus-visible` (not `focus`) so it does not show on mouse clicks.

---

## 4. Icon

A typed wrapper around Lucide React icons that enforces a consistent size and color API.

### File

`src/components/atoms/Icon.tsx`

### Props Interface

```typescript
import type { LucideIcon } from 'lucide-react'

export type IconSize = 12 | 14 | 16 | 18 | 20 | 24 | 28 | 32

export interface IconProps {
  /** Lucide icon component reference — pass the component itself, not a string */
  icon: LucideIcon
  /** Pixel size applied to both width and height */
  size?: IconSize
  /** Explicit color override; defaults to `currentColor` (inherits from parent) */
  color?: string
  /** Accessible label — required when the icon conveys meaning without adjacent text */
  'aria-label'?: string
  /** When true, hides the icon from assistive technology */
  'aria-hidden'?: boolean
  /** Additional class names */
  className?: string
}
```

### Size Table

| Token | px  | Common use case                   |
|-------|-----|-----------------------------------|
| 12    | 12  | Inline meta, timestamp prefix     |
| 14    | 14  | Small button icons, badge         |
| 16    | 16  | Default inline icon               |
| 18    | 18  | Toolbar icons, list item actions  |
| 20    | 20  | Section headers                   |
| 24    | 24  | Navigation icons, prominent CTA   |
| 28    | 28  | Modal header icons                |
| 32    | 32  | Empty state illustrations         |

### Color Strategy

The component passes `color` directly to the Lucide SVG's `color` prop. When no color is provided, Lucide defaults to `currentColor`, inheriting from the parent element's CSS `color` value via Tailwind's `text-*` classes. This means coloring an icon is done on the parent:

```tsx
// Color via parent text color
<span className="text-telegram-accent">
  <Icon icon={Star} size={16} aria-hidden />
</span>

// Explicit color override for dynamic values
<Icon icon={Circle} size={12} color={accountHexColor} aria-hidden />
```

### Tailwind Strategy

The Icon component itself has minimal styling — it is a thin pass-through. The `className` prop is forwarded to the SVG wrapper for any needed adjustments like `shrink-0` in flex containers.

```
// Always add shrink-0 when inside a flex row to prevent squishing
className="shrink-0"
```

### Usage Examples

```tsx
import { Search, Send, Trash2 } from 'lucide-react'

// Decorative icon with text label (icon hidden from AT)
<button className="flex items-center gap-2">
  <Icon icon={Send} size={16} aria-hidden />
  Send
</button>

// Standalone meaningful icon (requires aria-label)
<Icon icon={Search} size={20} aria-label="Search" />

// Dynamic color from account badge
<Icon icon={Circle} size={12} color="#e17076" aria-hidden />
```

### Accessibility

- When the icon appears alongside visible text that describes its action, use `aria-hidden={true}` (redundant AT output avoided).
- When used standalone without adjacent text, provide a descriptive `aria-label`.
- Never use `role="img"` directly on the Lucide SVG — Lucide icons already render as decorative SVGs with `aria-hidden`. Wrap in a `<span role="img" aria-label="...">` if a semantic landmark is needed.

---

## 5. Input

Text entry component covering search, form fields, and password entry. Wraps a native `<input>` with consistent dark-theme styling, validation states, and optional prefix/suffix slots.

### File

`src/components/atoms/Input.tsx`

### Props Interface

```typescript
import type { InputHTMLAttributes, ReactNode } from 'react'

export type InputType = 'text' | 'password' | 'search' | 'email' | 'tel' | 'number'
export type InputState = 'default' | 'error' | 'success'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'prefix'> {
  /** HTML input type */
  type?: InputType
  /** Visual validation state */
  state?: InputState
  /** Helper or error text rendered below the input */
  helperText?: string
  /** Element rendered inside the input on the left (e.g., search icon) */
  prefix?: ReactNode
  /** Element rendered inside the input on the right (e.g., clear button, eye toggle) */
  suffix?: ReactNode
  /** Makes the input full width of its container */
  fullWidth?: boolean
}
```

### State Table

| State     | Border class                    | Ring class (focus)                  | Helper text color    |
|-----------|---------------------------------|-------------------------------------|----------------------|
| `default` | `border-white/10`               | `focus:ring-telegram-accent`        | `text-telegram-text-secondary` |
| `error`   | `border-red-500`                | `focus:ring-red-500`                | `text-red-400`       |
| `success` | `border-green-500`              | `focus:ring-green-500`              | `text-green-400`     |

### Tailwind Strategy

```
// Base input classes
bg-white/5
border border-white/10
rounded-lg
px-3 py-2
text-sm text-telegram-text
placeholder:text-telegram-text-secondary
transition-colors duration-150
outline-none
focus:ring-2 focus:ring-offset-0

// With prefix: pl-9 (room for icon)
// With suffix: pr-9
// Disabled: opacity-50 cursor-not-allowed bg-transparent
// Full width: w-full
```

### Prefix and Suffix Layout

The outer wrapper is `relative`. Prefix and suffix are absolutely positioned inside:

```
prefix:  absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-telegram-text-secondary
suffix:  absolute right-3 top-1/2 -translate-y-1/2
```

When prefix is present, add `pl-9` to the `<input>`. When suffix is present, add `pr-9`.

### Usage Examples

```tsx
import { Search } from 'lucide-react'

// Search input with icon prefix
<Input
  type="search"
  placeholder="Search chats..."
  prefix={<Icon icon={Search} size={14} aria-hidden />}
  fullWidth
/>

// Error state with helper text
<Input
  type="tel"
  placeholder="+7 999 123 45 67"
  state="error"
  helperText="Enter a valid phone number including country code"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
/>

// Password with toggle suffix
<Input
  type={showPassword ? 'text' : 'password'}
  placeholder="Cloud password"
  suffix={
    <Button variant="ghost" size="sm" iconOnly aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={toggleShow}>
      <Icon icon={showPassword ? EyeOff : Eye} size={14} aria-hidden />
    </Button>
  }
/>
```

### Accessibility

- Associate every `Input` with a `<Label>` via `id` / `htmlFor`. Never rely on `placeholder` as the only label — it disappears on input and has low contrast.
- Use `aria-describedby` pointing to the helper text element's `id` so screen readers announce it after the field label.
- For `state="error"`, also set `aria-invalid="true"` on the `<input>`.
- Search inputs should have `role="searchbox"` implied by `type="search"` — no additional role needed.
- `disabled` inputs should not receive focus; the native `disabled` attribute handles this automatically.

---

## 6. Label

Semantic form label with optional required-field indicator. Always paired with an `Input` or other form control.

### File

`src/components/atoms/Label.tsx`

### Props Interface

```typescript
import type { LabelHTMLAttributes, ReactNode } from 'react'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** The input field id this label is associated with */
  htmlFor: string
  /** Shows a red asterisk after the label text */
  required?: boolean
  children: ReactNode
  /** Additional class names */
  className?: string
}
```

### Visual Specification

| Element          | Tailwind classes                                    |
|------------------|-----------------------------------------------------|
| `<label>` base   | `text-sm font-medium text-telegram-text-secondary block mb-1` |
| Required asterisk| `text-red-400 ml-0.5 select-none` rendered as `aria-hidden="true"` |

The asterisk is `aria-hidden="true"` because the required state is also communicated to screen readers via the `required` attribute on the `<input>` itself — duplicating it in the label text creates noise.

### Usage Examples

```tsx
// Basic label
<Label htmlFor="phone-input">Phone Number</Label>
<Input id="phone-input" type="tel" />

// Required field
<Label htmlFor="deal-title" required>Deal Title</Label>
<Input id="deal-title" type="text" required />

// Custom styling (e.g., inline form)
<Label htmlFor="search" className="sr-only">Search</Label>
<Input id="search" type="search" />
```

### Accessibility

- `htmlFor` is mandatory — the prop type enforces this (no optional).
- The required asterisk is hidden from AT via `aria-hidden="true"`. The associated `<input>` must have `required` or `aria-required="true"` for AT to announce the field as required.
- For `sr-only` usage (visually hidden label for icon-only inputs like search), use the Tailwind `sr-only` utility class on the label itself.

---

## 7. Spinner

Animated loading indicator for async states. Used inline (inside buttons) and as standalone loaders for panels.

### File

`src/components/atoms/Spinner.tsx`

### Props Interface

```typescript
export type SpinnerSize = 'sm' | 'md' | 'lg'
export type SpinnerVariant = 'default' | 'accent' | 'white' | 'muted'

export interface SpinnerProps {
  /** Size tier */
  size?: SpinnerSize
  /** Color variant */
  variant?: SpinnerVariant
  /** Accessible description of what is loading */
  label?: string
  /** Additional class names */
  className?: string
}
```

### Size Table

| Size | Pixel value | Tailwind size class | Border width |
|------|-------------|---------------------|--------------|
| `sm` | 16 px       | `w-4 h-4`           | `border-2`   |
| `md` | 24 px       | `w-6 h-6`           | `border-2`   |
| `lg` | 32 px       | `w-8 h-8`           | `border-[3px]` |

### Variant Table

| Variant   | Track color       | Active arc color          |
|-----------|-------------------|---------------------------|
| `default` | `border-white/10` | `border-t-telegram-text`  |
| `accent`  | `border-white/10` | `border-t-telegram-accent`|
| `white`   | `border-white/20` | `border-t-white`          |
| `muted`   | `border-white/5`  | `border-t-telegram-text-secondary` |

### Animation

Use Tailwind's built-in `animate-spin` class (applies `animation: spin 1s linear infinite`).

### Tailwind Strategy

```
rounded-full animate-spin
// Track: border color on all sides
// Active arc: override the top border color via border-t-*
// Example (accent, md):
w-6 h-6 rounded-full animate-spin border-2 border-white/10 border-t-telegram-accent
```

### Usage Examples

```tsx
// Inside a loading button (sm)
<Button variant="primary" disabled>
  <Spinner size="sm" variant="white" label="Generating..." />
  Generate
</Button>

// Panel loading state (centered, md)
<div className="flex items-center justify-center h-full">
  <Spinner size="md" variant="accent" label="Loading messages..." />
</div>

// Full-page auth loading (lg)
<div className="flex flex-col items-center gap-3">
  <Spinner size="lg" variant="accent" label="Connecting to Telegram..." />
  <Text variant="caption" color="muted">Connecting to Telegram...</Text>
</div>
```

### Accessibility

- Wrap in `<div role="status" aria-label={label}>` so screen readers announce loading state.
- The spinning circle element itself should be `aria-hidden="true"`.
- When `label` is provided and rendered visually, the `<div role="status">` can use `aria-label` instead — but render a visually hidden `<span className="sr-only">` for consistent AT announcement.

---

## 8. Text

Typography component that enforces consistent text styles across the application. Prevents ad-hoc inline `className` chains for headings and body copy.

### File

`src/components/atoms/Text.tsx`

### Props Interface

```typescript
import type { ElementType, ReactNode, HTMLAttributes } from 'react'

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'mono'
export type TextColor = 'primary' | 'secondary' | 'muted' | 'danger' | 'accent' | 'success'

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Typographic scale variant */
  variant?: TextVariant
  /** Color token */
  color?: TextColor
  /** Truncate text with ellipsis on overflow */
  truncate?: boolean
  /** Override the rendered HTML element (polymorphic) */
  as?: ElementType
  children: ReactNode
  /** Additional class names */
  className?: string
}
```

### Variant Table

| Variant   | Default element | Font size      | Font weight  | Line height    | Use case                          |
|-----------|-----------------|----------------|--------------|----------------|-----------------------------------|
| `h1`      | `<h1>`          | `text-2xl`     | `font-bold`  | `leading-tight`| Page titles, auth headings        |
| `h2`      | `<h2>`          | `text-xl`      | `font-semibold`| `leading-snug`| Section titles, panel headers     |
| `h3`      | `<h3>`          | `text-base`    | `font-semibold`| `leading-snug`| Group headers, card titles        |
| `body`    | `<p>`           | `text-sm`      | `font-normal`| `leading-relaxed`| Default body text, messages     |
| `caption` | `<span>`        | `text-xs`      | `font-normal`| `leading-normal`| Timestamps, meta info, labels   |
| `mono`    | `<code>`        | `text-xs`      | `font-normal`| `leading-normal`| Phone numbers, IDs, code        |

### Color Table

| Token      | Tailwind class                     | Hex / Custom             |
|------------|------------------------------------|--------------------------|
| `primary`  | `text-telegram-text`               | `#f5f5f5`                |
| `secondary`| `text-telegram-text-secondary`     | `#708499`                |
| `muted`    | `text-white/40`                    | `rgba(255,255,255,0.4)`  |
| `danger`   | `text-red-400`                     | Tailwind red-400          |
| `accent`   | `text-telegram-accent`             | `#6ab2f2`                |
| `success`  | `text-green-400`                   | Tailwind green-400        |

### Truncation

When `truncate={true}`: apply `truncate` Tailwind class (`overflow-hidden text-ellipsis whitespace-nowrap`) and ensure the parent container has a defined width or `min-w-0` in flex contexts.

### Polymorphic Pattern

The `as` prop allows rendering any HTML element while preserving the style variant:

```tsx
// Renders <span> styled as body text (useful inside flex rows)
<Text variant="body" as="span" color="secondary">
  Last seen 2 hours ago
</Text>

// Renders <label> styled as caption (for form-adjacent text)
<Text variant="caption" as="label" htmlFor="deal-id" color="muted">
  Deal ID
</Text>
```

### Usage Examples

```tsx
// Auth screen heading
<Text variant="h1" color="primary">Welcome back</Text>

// Deal title truncated in sidebar
<Text variant="h3" truncate color="primary">
  {deal.TITLE}
</Text>

// Secondary meta info
<Text variant="caption" color="secondary">
  Stage: {deal.STAGE_NAME}
</Text>

// Monospace phone number
<Text variant="mono" color="muted">{contact.phone}</Text>
```

### Accessibility

- The `variant` prop controls visual appearance only. Use the `as` prop to ensure the rendered element is semantically correct (e.g., `h1` variant should render as `<h1>`, not `<span>`).
- Do not skip heading levels — heading hierarchy must be maintained page-by-page.
- `caption` variant defaults to `<span>` (inline) rather than `<p>` to avoid invalid nesting inside flex rows.
- `mono` variant renders as `<code>` — appropriate for phone numbers and IDs. Use `as="span"` if a `<code>` element is semantically incorrect in context.

---

## 9. Timestamp

Renders a formatted time value in either relative ("2m ago") or absolute ("14:32") format. Relative mode auto-refreshes on a configurable interval.

### File

`src/components/atoms/Timestamp.tsx`

### Props Interface

```typescript
export type TimestampMode = 'relative' | 'absolute' | 'auto'

export interface TimestampProps {
  /**
   * Unix timestamp in seconds (as returned by GramJS / TelegramMessage.date).
   * The component handles conversion to milliseconds internally.
   */
  value: number
  /**
   * Display mode:
   * - 'relative' — always shows "2m ago", "3h ago", "yesterday"
   * - 'absolute' — always shows "14:32" or "22 Feb"
   * - 'auto' — relative for <24h, then switches to absolute date
   */
  mode?: TimestampMode
  /** Locale string for Intl.DateTimeFormat, defaults to navigator.language */
  locale?: string
  /**
   * Interval in milliseconds for auto-refresh in relative/auto mode.
   * Set to 0 to disable auto-refresh.
   * Defaults to 60000 (1 minute).
   */
  refreshInterval?: number
  /** Additional class names */
  className?: string
}
```

### Formatting Rules

| Age of message         | `relative` output | `absolute` output      | `auto` output          |
|------------------------|-------------------|------------------------|------------------------|
| < 1 minute             | "just now"        | "14:32"                | "14:32"                |
| 1–59 minutes           | "5m ago"          | "14:32"                | "5m ago"               |
| 1–23 hours             | "2h ago"          | "14:32"                | "2h ago"               |
| Yesterday              | "yesterday"       | "Yesterday"            | "Yesterday"            |
| 2–6 days ago           | "3d ago"          | "Mon" (short weekday)  | "Mon"                  |
| > 6 days, same year    | "22 Feb"          | "22 Feb"               | "22 Feb"               |
| Different year         | "22 Feb 2024"     | "22 Feb 2024"          | "22 Feb 2024"          |

### Auto-Refresh Implementation

```typescript
// Inside the component, using useEffect + useState
useEffect(() => {
  if (refreshInterval === 0 || mode === 'absolute') return
  const id = setInterval(() => setTick((t) => t + 1), refreshInterval)
  return () => clearInterval(id)
}, [refreshInterval, mode])
```

The `tick` state variable triggers a re-render which recalculates the display string. No external state management required.

### Tailwind Strategy

The component renders a `<time>` element:

```
<time
  dateTime={isoString}
  title={fullDateString}
  className={cn('text-xs text-telegram-text-secondary', className)}
>
  {formattedValue}
</time>
```

### Usage Examples

```tsx
// Chat list item — relative, auto-refreshing
<Timestamp
  value={dialog.lastMessageDate}
  mode="auto"
  className="text-telegram-text-secondary"
/>

// Message bubble — absolute time
<Timestamp
  value={message.date}
  mode="absolute"
  className="text-[10px] text-white/40"
/>

// Frozen timestamp (no refresh) for activity log
<Timestamp
  value={entry.timestamp}
  mode="relative"
  refreshInterval={0}
/>
```

### Accessibility

- Render as `<time dateTime={isoString}>` so search engines and AT can parse the machine-readable date.
- `isoString` must be a valid ISO 8601 string: `new Date(value * 1000).toISOString()`.
- Add `title={fullAbsoluteDate}` so hovering the relative timestamp shows the full date in a browser tooltip — helpful when the relative form is ambiguous.
- For relative timestamps that update, wrap in `aria-live="off"` (default) — constantly announced time changes are noisy and unhelpful.

---

## 10. Tooltip

Displays contextual help text on hover or focus. Wraps any trigger element with a positioned floating label.

### File

`src/components/atoms/Tooltip.tsx`

### Props Interface

```typescript
import type { ReactNode } from 'react'

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left'

export interface TooltipProps {
  /** The element that triggers the tooltip */
  children: ReactNode
  /** Tooltip content — string or any ReactNode for rich content */
  content: ReactNode
  /** Preferred position relative to the trigger */
  position?: TooltipPosition
  /** Delay in milliseconds before the tooltip appears */
  delayMs?: number
  /** Disable the tooltip without removing it from DOM */
  disabled?: boolean
  /** Additional class names applied to the tooltip bubble */
  className?: string
}
```

### Position Table

| Position | Translate class (bubble)           | Arrow direction |
|----------|------------------------------------|-----------------|
| `top`    | `bottom-full mb-2 left-1/2 -translate-x-1/2` | Points down |
| `right`  | `left-full ml-2 top-1/2 -translate-y-1/2`    | Points left |
| `bottom` | `top-full mt-2 left-1/2 -translate-x-1/2`    | Points up   |
| `left`   | `right-full mr-2 top-1/2 -translate-y-1/2`   | Points right|

### Implementation Strategy

Use CSS-only visibility toggling via the wrapper group pattern to avoid JavaScript show/hide logic. The delay is applied via `transition-delay` on the opacity transition.

```
// Wrapper
group relative inline-flex

// Tooltip bubble (hidden by default, visible on group hover/focus-within)
absolute z-50 pointer-events-none
bg-gray-900 border border-white/10
text-telegram-text text-xs
rounded-md px-2 py-1 whitespace-nowrap
opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
transition-opacity duration-150
// Apply delay via: [transition-delay:200ms] (Tailwind arbitrary value)
```

For rich content tooltips or programmatic control, use shadcn/ui's `<TooltipProvider>` / `<Tooltip>` / `<TooltipContent>` from `@radix-ui/react-tooltip` as the underlying primitive.

### Usage Examples

```tsx
// Icon button with tooltip
<Tooltip content="Search chats" position="bottom" delayMs={300}>
  <Button variant="ghost" size="sm" iconOnly aria-label="Search chats">
    <Icon icon={Search} size={16} aria-hidden />
  </Button>
</Tooltip>

// Rich content tooltip
<Tooltip
  content={
    <span>
      <strong>Alex Petrov</strong><br />Last seen 2h ago
    </span>
  }
  position="right"
>
  <Avatar name="Alex Petrov" size="sm" />
</Tooltip>

// Disabled tooltip (e.g., when feature is unavailable)
<Tooltip content="Connect to Bitrix24 first" position="top" disabled={isBitrixConnected}>
  <Button variant="primary" disabled={!isBitrixConnected}>Open Pipeline</Button>
</Tooltip>
```

### Accessibility

- The tooltip pattern follows [ARIA Tooltip role](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).
- The tooltip bubble gets `role="tooltip"` and a unique `id`. The trigger element gets `aria-describedby={tooltipId}`.
- Tooltips must be dismissible with `Escape` key — add `onKeyDown` to close on `Escape`.
- Do not put interactive elements (links, buttons) inside tooltip content — they are unreachable by keyboard. Use a popover pattern instead.
- The tooltip must also appear on keyboard focus (not just hover) — the `group-focus-within:opacity-100` class handles this.

---

## 11. Toggle

A boolean on/off control, visually distinct from a checkbox. Used for settings toggles (notifications, CRM panel visibility, theme switches).

### File

`src/components/atoms/Toggle.tsx`

### Props Interface

```typescript
export type ToggleLabelPosition = 'left' | 'right'

export interface ToggleProps {
  /** Current checked state (controlled) */
  checked: boolean
  /** Called with the new boolean value on change */
  onChange: (checked: boolean) => void
  /** Label text displayed adjacent to the toggle */
  label?: string
  /** Which side the label appears on */
  labelPosition?: ToggleLabelPosition
  /** Disables interaction */
  disabled?: boolean
  /** Id for the underlying checkbox (used in htmlFor) */
  id?: string
  /** Additional class names for the outer wrapper */
  className?: string
}
```

### Visual Specification

| State              | Track color             | Thumb position   |
|--------------------|-------------------------|------------------|
| Off                | `bg-white/10`           | `translate-x-0`  |
| On                 | `bg-telegram-accent`    | `translate-x-[18px]` |
| Disabled + Off     | `bg-white/5 opacity-50` | `translate-x-0`  |
| Disabled + On      | `bg-telegram-accent/50` | `translate-x-[18px]` |

**Track dimensions:** `w-[38px] h-[22px] rounded-full`
**Thumb dimensions:** `w-[16px] h-[16px] rounded-full bg-white shadow-sm`
**Thumb transition:** `transition-transform duration-200 ease-in-out`

### Implementation

The Toggle is implemented as a visually styled `<input type="checkbox">` hidden via `sr-only`, paired with a custom visual track and thumb rendered via `<label>`. This ensures native keyboard support and form semantics at no extra cost.

```tsx
export function Toggle({ checked, onChange, label, labelPosition = 'right', disabled, id }: ToggleProps) {
  const inputId = id ?? useId()
  return (
    <div className="inline-flex items-center gap-2">
      {labelPosition === 'left' && label && (
        <label htmlFor={inputId} className="text-sm text-telegram-text select-none cursor-pointer">
          {label}
        </label>
      )}
      <label htmlFor={inputId} className="relative cursor-pointer">
        <input
          id={inputId}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        {/* Track */}
        <div className={/* track classes */} />
        {/* Thumb */}
        <div className={/* thumb classes */} />
      </label>
      {labelPosition === 'right' && label && (
        <label htmlFor={inputId} className="text-sm text-telegram-text select-none cursor-pointer">
          {label}
        </label>
      )}
    </div>
  )
}
```

### Usage Examples

```tsx
// CRM panel visibility toggle
<Toggle
  checked={crmPanelOpen}
  onChange={toggleCrmPanel}
  label="Show CRM Panel"
  labelPosition="right"
/>

// Theme toggle (label on left)
<Toggle
  checked={theme === 'dark'}
  onChange={(v) => setTheme(v ? 'dark' : 'light')}
  label="Dark mode"
  labelPosition="left"
/>

// Disabled state
<Toggle
  checked={false}
  onChange={() => {}}
  label="Enable notifications"
  disabled
/>
```

### Accessibility

- Use a native `<input type="checkbox">` hidden via `sr-only` — this gives free keyboard access (Space to toggle), checked state announcement, and form participation.
- The visual label has `htmlFor` matching the hidden input — click on label text also toggles the control.
- `aria-checked` is not needed because the native checkbox communicates its state correctly to AT.
- When `disabled`, the AT announces "dimmed" or "unavailable" depending on OS. Do not add custom `aria-disabled` alongside the native `disabled` attribute.

---

## 12. Separator

A visual dividing line between sections. Supports horizontal and vertical orientations. Can be rendered as a decorative or semantic rule.

### File

`src/components/atoms/Separator.tsx`

### Props Interface

```typescript
export type SeparatorOrientation = 'horizontal' | 'vertical'

export interface SeparatorProps {
  /** Layout direction */
  orientation?: SeparatorOrientation
  /**
   * When true, the separator is purely visual and hidden from AT (role="none").
   * When false, it renders as role="separator" (a meaningful section boundary).
   * Defaults to true.
   */
  decorative?: boolean
  /** Additional class names */
  className?: string
}
```

### Orientation Table

| Orientation  | Tailwind classes                              | Required parent                  |
|--------------|-----------------------------------------------|----------------------------------|
| `horizontal` | `w-full h-px bg-white/10 my-1`                | Block-level or flex column       |
| `vertical`   | `h-full w-px bg-white/10 mx-1 self-stretch`   | Flex row with defined height     |

### Semantic vs Decorative

- `decorative={true}` (default): renders `<div role="none" aria-hidden="true">` — the separator is skipped by AT.
- `decorative={false}`: renders `<hr role="separator" aria-orientation={orientation}>` — AT announces it as a thematic break or separator landmark.

Use `decorative={false}` when the separator delineates a meaningful content section (e.g., between the chat list and CRM nav). Use `decorative={true}` (default) for visual-only spacing within a homogeneous list.

### Tailwind Strategy

Avoid using a border on the element itself (`border-t`) — use `bg-white/10` with a fixed height/width instead. This prevents conflicts with Tailwind's base layer `* { border-color: ... }` reset.

```
// Horizontal
h-px w-full bg-white/10

// Vertical
w-px h-full self-stretch bg-white/10
```

### Usage Examples

```tsx
// Between two sections in the sidebar (decorative)
<nav>
  <ChatListSection />
  <Separator orientation="horizontal" />
  <CRMNavSection />
</nav>

// Between account entries (meaningful boundary)
<Separator
  orientation="horizontal"
  decorative={false}
  className="my-2"
/>

// Vertical separator in a toolbar row
<div className="flex items-center h-8 gap-1">
  <Button variant="ghost" iconOnly aria-label="Bold">
    <Icon icon={Bold} size={14} aria-hidden />
  </Button>
  <Separator orientation="vertical" className="h-5" />
  <Button variant="ghost" iconOnly aria-label="Italic">
    <Icon icon={Italic} size={14} aria-hidden />
  </Button>
</div>
```

### Accessibility

- `decorative={true}` (default): `role="none"` and `aria-hidden="true"` — invisible to screen readers.
- `decorative={false}`: `role="separator"` with `aria-orientation="horizontal"` or `aria-orientation="vertical"`.
- Do not put interactive children inside a separator element.
- In ARIA terms, `<hr>` has an implicit `role="separator"` — using `<hr>` for semantic separators is correct and requires no additional role attribute.

---

## Implementation Notes

### File Organization

All atoms live under `src/components/atoms/`, one component per file, kebab-case filenames:

```
src/components/atoms/
├── Avatar.tsx
├── Badge.tsx
├── Button.tsx
├── Icon.tsx
├── Input.tsx
├── Label.tsx
├── Separator.tsx
├── Spinner.tsx
├── Text.tsx
├── Timestamp.tsx
├── Toggle.tsx
└── Tooltip.tsx
```

### Barrel Export

Export all atoms from a single index file for clean imports:

```typescript
// src/components/atoms/index.ts
export { Avatar } from './Avatar'
export type { AvatarProps, AvatarSize, AccountColor } from './Avatar'

export { Badge } from './Badge'
export type { BadgeProps, BadgeVariant, BadgeKind } from './Badge'

export { Button } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'

export { Icon } from './Icon'
export type { IconProps, IconSize } from './Icon'

export { Input } from './Input'
export type { InputProps, InputType, InputState } from './Input'

export { Label } from './Label'
export type { LabelProps } from './Label'

export { Separator } from './Separator'
export type { SeparatorProps, SeparatorOrientation } from './Separator'

export { Spinner } from './Spinner'
export type { SpinnerProps, SpinnerSize, SpinnerVariant } from './Spinner'

export { Text } from './Text'
export type { TextProps, TextVariant, TextColor } from './Text'

export { Timestamp } from './Timestamp'
export type { TimestampProps, TimestampMode } from './Timestamp'

export { Toggle } from './Toggle'
export type { ToggleProps, ToggleLabelPosition } from './Toggle'

export { Tooltip } from './Tooltip'
export type { TooltipProps, TooltipPosition } from './Tooltip'
```

Usage in molecules and organisms:

```typescript
import { Avatar, Badge, Button, Timestamp } from '@/components/atoms'
```

### Shared Utility

Use a `cn()` utility (classnames + tailwind-merge) for conditional class composition:

```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

All atoms import `cn` for merging external `className` props with their internal Tailwind classes.

### Dark Theme Tokens Reference

| Custom token                    | Value       | Purpose                        |
|---------------------------------|-------------|--------------------------------|
| `bg-telegram-bg`                | `#17212b`   | Main app background            |
| `bg-telegram-sidebar`           | `#0e1621`   | Left panel / sidebar           |
| `bg-telegram-message`           | `#182533`   | Incoming message bubble        |
| `bg-telegram-message-out`       | `#2b5278`   | Outgoing message bubble        |
| `text-telegram-text`            | `#f5f5f5`   | Primary text                   |
| `text-telegram-text-secondary`  | `#708499`   | Secondary / muted text         |
| `text-telegram-accent`          | `#6ab2f2`   | Links, interactive accents     |

These tokens are defined in `tailwind.config.js` and must be used in all atoms instead of raw hex values (except for one-off account badge colors that have no semantic token).
