# Atomic Design: Template-Level Components

Templates define page-level layouts. They are slot-based skeletons: they own structure and spacing but carry no real data. Organisms are passed in as children or named slot props. This layer is where responsive behaviour, panel animations, and theme-aware colour tokens live.

All templates connect to `useUIStore` for sidebar/panel toggle state. No other stores are accessed at the template level.

---

## UIStore reference

```typescript
// src/stores/ui.ts
interface UIState {
  sidebarOpen: boolean
  crmPanelOpen: boolean
  theme: 'dark' | 'light'
  authMode: 'qr' | 'phone'
  toggleSidebar: () => void
  toggleCrmPanel: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setAuthMode: (mode: 'qr' | 'phone') => void
}
```

---

## 1. AuthTemplate

### Purpose

Full-screen centred card layout for all authentication steps (QR login, phone login, 2FA). No sidebar. No navigation. Purely presents auth content with branding.

### ASCII Layout

```
┌──────────────────────────────────────────────┐
│                                              │
│   bg-zinc-950 (dark) / bg-zinc-100 (light)  │
│                                              │
│              ┌──────────────┐               │
│              │  Logo + Name │               │
│              │  ──────────  │               │
│              │              │               │
│              │    {content} │  max-w-md     │
│              │              │               │
│              │  ──────────  │               │
│              │    Footer    │               │
│              └──────────────┘               │
│                                             │
└─────────────────────────────────────────────┘
```

### TypeScript Interface

```typescript
// src/components/layout/templates/auth-template.tsx

interface AuthTemplateProps {
  /** The main auth content: QRLogin or PhoneLogin organism */
  children: React.ReactNode
  /**
   * Optional footer override. Defaults to version string.
   * Pass null to hide footer entirely.
   */
  footer?: React.ReactNode | null
}
```

### Tailwind Layout Specification

```typescript
// Root container: full viewport, centred column flex
// "min-h-screen flex flex-col items-center justify-center"
// Theme:  dark → "bg-zinc-950"   light → "bg-zinc-100"

// Card: white/dark surface, rounded, shadow, padding
// "w-full max-w-md mx-4"
// "bg-white dark:bg-zinc-900"
// "rounded-2xl shadow-2xl"
// "border border-zinc-200 dark:border-zinc-800"
// "p-8 flex flex-col gap-6"

// Logo block
// "flex flex-col items-center gap-3 text-center"

// Content slot
// "flex flex-col gap-4"   — organisms fill this naturally

// Footer
// "text-xs text-zinc-400 text-center mt-2"
```

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| `< sm (640px)` | `mx-0`, card fills full width, `rounded-none`, `p-6` |
| `sm – lg` | `max-w-md`, card centred with `mx-4` margins |
| `> lg` | Layout unchanged — desktop app minimum window ~900px wide |

Because this is an Electron desktop app, minimum window width is `860px` (configured in `electron/main.ts`). The `< sm` responsive rule still applies if the user resizes the window very small.

### Theme Support

The template applies `dark` or `light` class on the root div based on `useUIStore().theme`. This propagates Tailwind's `dark:` variant through the entire card.

```typescript
// Theme class application
const { theme } = useUIStore()
<div className={cn('min-h-screen ...', theme === 'dark' ? 'dark bg-zinc-950' : 'bg-zinc-100')}>
```

### Animations / Transitions

- Card entrance: `animate-in fade-in slide-in-from-bottom-4 duration-300`
- Card is mounted once; auth steps animate internally (AuthFlow organism handles step transitions with `animate-in fade-in duration-200`)
- No exit animation on the template itself — the page transition is handled at the App routing layer

### Usage Example

```typescript
// src/components/pages/LoginPage.tsx

import { AuthTemplate } from '../layout/templates/auth-template'
import { AuthFlow } from '../auth/AuthFlow'

export function LoginPage() {
  return (
    <AuthTemplate>
      <AuthFlow />
    </AuthTemplate>
  )
}
```

---

## 2. MainTemplate

### Purpose

The primary 3-column layout used by `ChatPage`. Left sidebar holds `ChatList`, center column holds `ChatView` + `MessageInput` + `AIComposer`, right panel holds `DealPanel`. The sidebar and CRM panel are independently toggleable. This is where 95% of operator time is spent.

### ASCII Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header (h-12, bg-zinc-900 dark)                             │
│  [≡ toggle]  Telegram CRM Client      [search]  [settings]  │
├──────────────┬───────────────────────┬───────────────────────┤
│              │                       │                       │
│  Left        │  Center               │  Right                │
│  Sidebar     │  (flex-1, min-w-0)    │  CRM Panel            │
│  w-[250px]   │                       │  w-[300px]            │
│  shrink-0    │  {centerContent}      │  shrink-0             │
│              │                       │                       │
│  {sidebar}   │                       │  {crmPanel}           │
│              │                       │                       │
└──────────────┴───────────────────────┴───────────────────────┘
```

When `sidebarOpen = false` the left panel collapses (width → 0, overflow hidden). When `crmPanelOpen = false` the right panel collapses likewise.

### TypeScript Interface

```typescript
// src/components/layout/templates/main-template.tsx

interface MainTemplateProps {
  /** ChatList organism (left sidebar content) */
  sidebar: React.ReactNode
  /** ChatView + MessageInput + AIComposer stacked vertically */
  centerContent: React.ReactNode
  /** DealPanel organism (right CRM panel content) */
  crmPanel: React.ReactNode
  /** Optional: additional header actions to render right of the search button */
  headerActions?: React.ReactNode
}
```

### Tailwind Layout Specification

```typescript
// Root: full viewport, column flex, no overflow
// "flex flex-col h-screen w-full overflow-hidden"
// Theme root: "bg-zinc-950 text-zinc-100" dark / "bg-white text-zinc-900" light

// Header bar
// "flex items-center gap-2 px-3 h-12 shrink-0"
// "bg-zinc-900 dark:bg-zinc-900 border-b border-zinc-800"

// Body: row flex, fills remaining height
// "flex flex-1 min-h-0 overflow-hidden"

// Left sidebar
// "shrink-0 overflow-hidden flex flex-col"
// "bg-zinc-900 dark:bg-zinc-900 border-r border-zinc-800"
// Collapsed:  "w-0"   Expanded: "w-[250px]"
// Transition: "transition-[width] duration-200 ease-in-out"

// Center column
// "flex flex-1 flex-col min-w-0 overflow-hidden"
// "bg-zinc-950 dark:bg-zinc-950"

// Right panel
// "shrink-0 overflow-hidden flex flex-col"
// "bg-zinc-900 dark:bg-zinc-900 border-l border-zinc-800"
// Collapsed:  "w-0"   Expanded: "w-[300px]"
// Transition: "transition-[width] duration-200 ease-in-out"
```

### Store Connections

```typescript
// Inside MainTemplate
import { useUIStore } from '../../../stores/ui'

const { sidebarOpen, crmPanelOpen, toggleSidebar, toggleCrmPanel } = useUIStore()
```

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| `< md (768px)` | CRM panel auto-collapses (`crmPanelOpen` forced false on mount if window < 768) |
| `md – lg` | Both panels can toggle; default: sidebar open, CRM panel closed |
| `> lg (1280px)` | Both panels default open |

The `MainTemplate` reads `window.innerWidth` on mount via a `useEffect` to set initial panel state. Subsequent toggles are purely user-driven via `useUIStore`.

### Panel Animations / Transitions

```typescript
// Both sidebar and CRM panel use CSS width transition only.
// Content inside uses overflow-hidden so it clips cleanly.
// No opacity fade on panels — avoids content reflow jank.
// Header toggle button rotates icon: "transition-transform duration-200"
```

### Theme Support

```typescript
// Template root receives theme class:
const { theme } = useUIStore()
<div className={cn('flex flex-col h-screen', theme)}>
  {/* All dark: variants cascade from here */}
</div>
```

### Min-Width Constraint

The Electron `BrowserWindow` is configured with `minWidth: 860`. The layout requires at minimum: `250px (sidebar) + 300px (center min) + 300px (CRM) + borders = ~860px`. When either panel is collapsed the center column gains that space.

### Usage Example

```typescript
// src/components/pages/ChatPage.tsx

import { MainTemplate } from '../layout/templates/main-template'
import { ChatList } from '../chat/ChatList'
import { ChatView } from '../chat/ChatView'
import { MessageInput } from '../chat/MessageInput'
import { AIComposer } from '../crm/AIComposer'
import { DealPanel } from '../crm/DealPanel'

export function ChatPage() {
  return (
    <MainTemplate
      sidebar={<ChatList />}
      centerContent={
        <div className="flex flex-col h-full">
          <ChatView />
          <MessageInput />
          <AIComposer />
        </div>
      }
      crmPanel={<DealPanel />}
    />
  )
}
```

---

## 3. SettingsTemplate

### Purpose

Two-column settings layout: narrow nav sidebar on the left (200px), scrollable content area on the right. Used by `SettingsPage`. The nav is not collapsible — settings is a modal/overlay page with fixed structure.

### ASCII Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header (h-12)                                               │
│  [← Back]  Settings                                         │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│  Nav sidebar   │  Content area                               │
│  w-[200px]     │  flex-1, overflow-y-auto                   │
│  shrink-0      │                                             │
│                │  {activeSection}                            │
│  • Account     │                                             │
│  • Appearance  │                                             │
│  • Notifs      │                                             │
│  • AI          │                                             │
│  • About       │                                             │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

### TypeScript Interface

```typescript
// src/components/layout/templates/settings-template.tsx

type SettingsSection = 'account' | 'appearance' | 'notifications' | 'ai' | 'about'

interface SettingsTemplateProps {
  /** Currently active section — controls nav highlight */
  activeSection: SettingsSection
  /** Callback when user clicks a nav item */
  onSectionChange: (section: SettingsSection) => void
  /** The content for the active section — rendered in the right column */
  children: React.ReactNode
  /** Called when user clicks the back button (navigates to ChatPage) */
  onBack: () => void
}

// Nav item descriptor — defined inside the template
interface SettingsNavItem {
  id: SettingsSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}
```

### Tailwind Layout Specification

```typescript
// Root: full viewport, column flex
// "flex flex-col h-screen overflow-hidden"

// Header
// "flex items-center gap-3 px-4 h-12 shrink-0"
// "bg-zinc-900 border-b border-zinc-800"

// Body: row flex
// "flex flex-1 min-h-0 overflow-hidden"

// Nav sidebar
// "w-[200px] shrink-0 flex flex-col gap-1 p-3"
// "bg-zinc-900 border-r border-zinc-800 overflow-y-auto"

// Nav item (inactive)
// "flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
// "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
// "transition-colors duration-150 cursor-pointer"

// Nav item (active)
// "flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
// "text-zinc-100 bg-zinc-800 font-medium"

// Content area
// "flex-1 overflow-y-auto p-6"
// "bg-zinc-950"
```

### Settings Nav Items (constant, defined in template)

```typescript
const SETTINGS_NAV: readonly SettingsNavItem[] = [
  { id: 'account',       label: 'Account',       icon: UserIcon },
  { id: 'appearance',    label: 'Appearance',    icon: PaintbrushIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'ai',            label: 'AI Composer',   icon: SparklesIcon },
  { id: 'about',         label: 'About',         icon: InfoIcon },
] as const
```

### Responsive Behaviour

Settings is always accessed from the main window at full width. The nav sidebar does not collapse. On very narrow windows (`< 640px`) the nav sidebar would still render at 200px because the Electron minWidth constraint (860px) prevents this in practice. No responsive collapse logic needed.

### Theme Support

Inherits the theme class from the App root. Uses `dark:` variants on all colour utilities. No separate theme logic in this template — theme is toggled from within the `AppearanceSection` organism rendered in the content area.

### Animations / Transitions

- Entering SettingsPage: App-level transition, `animate-in fade-in slide-in-from-right-8 duration-200`
- Content section switch: `animate-in fade-in duration-150` on the content `div` keyed by `activeSection`

### Usage Example

```typescript
// src/components/pages/SettingsPage.tsx

import { useState } from 'react'
import { SettingsTemplate } from '../layout/templates/settings-template'
import { AccountSection } from '../settings/AccountSection'
import { AppearanceSection } from '../settings/AppearanceSection'
import { NotificationsSection } from '../settings/NotificationsSection'
import { AISection } from '../settings/AISection'
import { AboutSection } from '../settings/AboutSection'

type SettingsSection = 'account' | 'appearance' | 'notifications' | 'ai' | 'about'

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const { navigateTo } = useUIStore()

  const sectionMap: Record<SettingsSection, React.ReactNode> = {
    account:       <AccountSection />,
    appearance:    <AppearanceSection />,
    notifications: <NotificationsSection />,
    ai:            <AISection />,
    about:         <AboutSection />,
  }

  return (
    <SettingsTemplate
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onBack={() => navigateTo('chat')}
    >
      {sectionMap[activeSection]}
    </SettingsTemplate>
  )
}
```

---

## 4. PipelineTemplate

### Purpose

Full-width kanban layout for `PipelinePage`. No left sidebar (or collapsed). Full viewport height minus a top header bar. The kanban board scrolls horizontally inside a fixed-height container so columns are always fully visible.

### ASCII Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header (h-14)                                               │
│  [≡ back]  Pipeline         [search] [filter] [refresh]     │
├──────────────────────────────────────────────────────────────┤
│  Horizontal scroll container (flex-1, overflow-x-auto)       │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ...   │
│  │  NEW     │ │ CONTACT  │ │ ON TEST  │ │TEST DONE │        │
│  │  w-[280] │ │  ED REG  │ │  w-[280] │ │  w-[280] │        │
│  │          │ │  w-[280] │ │          │ │          │        │
│  │ DealCard │ │ DealCard │ │ DealCard │ │ DealCard │        │
│  │ DealCard │ │          │ │ DealCard │ │          │        │
│  │   ...    │ │   ...    │ │   ...    │ │   ...    │        │
│  │ [+ Add]  │ │ [+ Add]  │ │ [+ Add]  │ │ [+ Add]  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### TypeScript Interface

```typescript
// src/components/layout/templates/pipeline-template.tsx

interface PipelineTemplateProps {
  /** The PipelineBoard organism — fills the scrollable area */
  children: React.ReactNode
  /** Pipeline header: title, search value, and filter state */
  pipelineName?: string
  searchValue: string
  onSearchChange: (value: string) => void
  /** Currently active stage filter — null means show all */
  activeFilter: string | null
  onFilterChange: (stage: string | null) => void
  /** Triggered when user requests a data refresh */
  onRefresh: () => void
  isRefreshing: boolean
  /** Called to navigate back to ChatPage */
  onBack: () => void
}
```

### Tailwind Layout Specification

```typescript
// Root: full viewport, column flex, no overflow on root
// "flex flex-col h-screen overflow-hidden"
// Theme: dark "bg-zinc-950" light "bg-zinc-50"

// Header bar
// "flex items-center gap-3 px-4 h-14 shrink-0"
// "bg-zinc-900 dark:bg-zinc-900 border-b border-zinc-800"

// Pipeline title
// "text-base font-semibold text-zinc-100 mr-auto"

// Search input (header)
// "w-[220px] h-8 px-3 rounded-lg text-sm"
// "bg-zinc-800 border border-zinc-700 text-zinc-100"
// "placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

// Board scroll container
// "flex-1 overflow-x-auto overflow-y-hidden"
// "flex items-stretch gap-3 p-4"
// Scroll snap: "scroll-smooth" — no snap (free drag scrolling)

// Individual column width reference (not set here, set in PipelineBoard organism)
// Columns: "w-[280px] shrink-0"
```

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| Any width | Columns have fixed width (280px each), board scrolls horizontally |
| `> 1600px` | All 9 deal stage columns visible without horizontal scroll |
| `< 1600px` | Horizontal scroll activates — this is expected behaviour |

The pipeline layout intentionally does not collapse or restack columns. Each column must always show full card content.

### Theme Support

```typescript
// Board background changes by theme:
// dark:  column backgrounds "bg-zinc-900",  card backgrounds "bg-zinc-800"
// light: column backgrounds "bg-zinc-100",  card backgrounds "bg-white"
// Header always dark (brand consistency): "bg-zinc-900" regardless of theme
```

### Animations / Transitions

- Drag-and-drop (P1 feature): card moves with 0ms transition during drag, then `transition-transform duration-150` on drop settle
- Column header count badge: `transition-all duration-200` on count number changes
- Refresh spinner: `animate-spin` on the refresh button icon while `isRefreshing = true`
- Page entrance: `animate-in fade-in duration-200`

### Usage Example

```typescript
// src/components/pages/PipelinePage.tsx

import { useState } from 'react'
import { PipelineTemplate } from '../layout/templates/pipeline-template'
import { PipelineBoard } from '../crm/PipelineBoard'
import { useCrmStore } from '../../stores/crm'

export function PipelinePage() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const { loadDeals, isLoading } = useCrmStore()
  const { navigateTo } = useUIStore()

  return (
    <PipelineTemplate
      pipelineName="бустер.рф Pipeline"
      searchValue={search}
      onSearchChange={setSearch}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      onRefresh={loadDeals}
      isRefreshing={isLoading}
      onBack={() => navigateTo('chat')}
    >
      <PipelineBoard searchFilter={search} stageFilter={activeFilter} />
    </PipelineTemplate>
  )
}
```

---

## Template Composition Summary

| Template | Used By | Panels | Scrolling |
|---|---|---|---|
| `AuthTemplate` | `LoginPage` | None | None |
| `MainTemplate` | `ChatPage` | Left (collapsible) + Right (collapsible) | Center column internal |
| `SettingsTemplate` | `SettingsPage` | Left nav (fixed) | Right content |
| `PipelineTemplate` | `PipelinePage` | None | Horizontal board |

## File Locations

```
src/components/layout/templates/
  auth-template.tsx
  main-template.tsx
  settings-template.tsx
  pipeline-template.tsx
```
