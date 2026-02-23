# PLAN v3 — Bug Fixes + Multi-Account UX + User Folders

## 🔴 Bug #1: 401 Auth Error When Switching Accounts

### Root Cause Analysis

The 401 error on `switchAccount` → `getMe()` is caused by a **session loading race condition** in the multi-account implementation:

1. **`loadAllSessions()`** (line 272) creates `TelegramClient` instances from saved session strings during startup, but **never calls `.connect()`** on them — they're created but remain disconnected.

2. **`switchAccount` handler** (line 546) calls `entry.client.connect()` which triggers a new connection with the stored `StringSession`. However, **GramJS `StringSession` has a critical behavior**: the session token stored in the DB may have been rotated/updated by Telegram during the first account's active use. When the second client connects with the original session string, it may be stale → 401.

3. **Session saving issue**: `finalizeAuth()` saves the session once after login, but **session updates during normal use are never persisted**. GramJS can update the auth key during reconnections. The original single-account code had a `saveSession()` helper, but the multi-account refactor only calls it in `finalizeAuth()`.

4. **Missing `client.session.save()` on disconnect/switch**: When switching away from Account A, the current session state isn't saved. When switching back, it loads the original (possibly stale) session string.

### Fix Plan

```
Phase 1: Session persistence fix
├── 1.1 Add periodic session save — after each API call or on a timer (every 60s)
│   Store: accounts.get(activeAccountId).sessionString = client.session.save()
│   DB: db.saveSession(`account_session_${id}`, newSessionString)
├── 1.2 Save session BEFORE switching accounts
│   In switchAccount handler: save current active account's session first
├── 1.3 On app close (beforeunload / will-quit): save all active sessions
├── 1.4 On reconnect: update stored session string
└── 1.5 Graceful error handling: if 401 on switch, remove stale session, prompt re-auth
```

**Estimated complexity**: Medium (2-3 files, ~50 lines). Timeout: 300s.

---

## 🔴 Bug #2: Missing User Custom Folders (Telegram Dialog Filters)

### Root Cause Analysis

The current "folders" are **hardcoded client-side filters** (All/Users/Groups/Channels/Forums/Bots) based on dialog properties. They are NOT Telegram's native folder system.

Telegram's real folders use `Api.messages.GetDialogFilters()` which returns the user's custom folders (Work, Personal, etc.) configured in Telegram settings. These were never implemented.

Additionally, **Archived chats** use `Api.messages.GetDialogs({ folder_id: 1 })` — the current `getDialogs` call uses no folder_id, so it only returns the main (non-archived) chat list.

### Fix Plan

```
Phase 2: Telegram native folders + archive
├── 2.1 IPC: telegram:getDialogFilters — Api.messages.GetDialogFilters()
│   Returns: { id, title, emoticon?, includePeers, excludePeers, flags }[]
│   Map to: { id: number, title: string, emoji?: string }[]
├── 2.2 IPC: telegram:getDialogsByFolder(filterId) — fetch dialogs matching a filter
│   Use Api.messages.GetDialogFilters result to get peer lists
│   Or simpler: load all dialogs, filter client-side by peer membership
├── 2.3 IPC: telegram:getArchivedDialogs(limit) — tc.getDialogs({ folder: 1 })
│   Archived chats live in folder_id=1 in MTProto
├── 2.4 Types: add DialogFilter, update ElectronAPI
├── 2.5 Preload + API wrapper: wire new methods
├── 2.6 Store: load user folders on init, store alongside hardcoded tabs
│   userFolders: DialogFilter[]
│   archivedDialogs: TelegramDialog[]
├── 2.7 Sidebar UI: show user folders as tabs AFTER hardcoded ones
│   Tabs: [All] [Users] [Groups] [📁 Work] [📁 Personal] [📦 Archive]
│   Each user folder tab fetches/filters its dialogs
│   Archive: separate section or tab at end
└── 2.8 Chat list: archived chats appear when Archive tab is selected
```

**Estimated complexity**: Medium-High (5-6 files, ~150 lines). Timeout: 600s.

---

## 🟡 Feature #3: True Multi-Account Experience

### Current State

- Account switcher exists (avatar strip in sidebar)
- Switching works but causes full context reset (dialogs reload, messages clear)
- Only one account's chats visible at a time
- No cross-account search
- No visual distinction of which account a chat belongs to

### Design: Column-Based Multi-Account Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Account Strip] [🔍 Global Search]                    [⚙️]  │
├────────────────┬────────────────┬─────────────────────────────┤
│ Account 1      │ Account 2      │                             │
│ ┌────────────┐ │ ┌────────────┐ │                             │
│ │ Chat A     │ │ │ Chat X     │ │    Active Chat View         │
│ │ Chat B  ●  │ │ │ Chat Y     │ │    (messages, input)        │
│ │ Chat C     │ │ │ Chat Z  ●  │ │                             │
│ │ ...        │ │ │ ...        │ │                             │
│ └────────────┘ │ └────────────┘ │                             │
│   [collapse]   │   [collapse]   │                             │
├────────────────┴────────────────┤                             │
│ [Toggle: Columns | Unified]     │                             │
└─────────────────────────────────┴─────────────────────────────┘
```

### Implementation Plan

```
Phase 3: Multi-account UX
├── 3.1 Architecture: Keep all account clients connected simultaneously
│   loadAllSessions() → connect ALL accounts, not just active
│   Event handlers on ALL clients (not just active)
│   Each client tags messages/dialogs with accountId
│
├── 3.2 Store redesign (src/stores/chats.ts):
│   dialogs: Map<accountId, TelegramDialog[]> — per-account dialog lists
│   Load dialogs for ALL connected accounts on startup
│   activeChat: { accountId: string, chatId: string } | null
│   When clicking a chat, auto-route API calls to correct account's client
│
├── 3.3 Layout mode toggle (Column vs Unified):
│   Column mode: separate scrollable chat list per account, side by side
│   Unified mode: all chats merged into one list, sorted by lastMessageDate
│   Store preference in localStorage
│
├── 3.4 Account badge on chats (Unified mode):
│   Small colored dot/label on each chat showing which account it belongs to
│   Account label: first letter of account name + unique color
│   If accounts share a name, use phone number last 4 digits
│   Similar to Telegram folder indicators
│
├── 3.5 Column controls:
│   Each column: collapsible with toggle button
│   Column header: account name/avatar, unread count badge
│   Drag to reorder columns (optional, skip for v1)
│   Column width: equal distribution or adjustable (CSS flex)
│
├── 3.6 Cross-account messaging:
│   Clicking a chat in ANY column opens it in the main chat view
│   The chat view auto-uses the correct account's client for API calls
│   Store tracks which accountId each active chat belongs to
│   sendMessage/getMessages/etc route to the right client
│
├── 3.7 Cross-account search:
│   Global search queries ALL connected accounts in parallel
│   Results grouped by account with account badge
│   Click result → opens in correct account context
│
├── 3.8 Unified notifications:
│   All accounts push notifications
│   Notification shows account name + sender + message
│   Click routes to correct account's chat
│
└── 3.9 New IPC pattern: account-aware API calls
    Option A: Pass accountId in every IPC call (explicit routing)
    Option B: Server-side routing based on chatId→accountId map (implicit)
    Recommendation: Option A — explicit is safer
    Update all telegram:* handlers to accept optional accountId param
    If provided, use that account's client; else use active
```

**Estimated complexity**: High (8-10 files, ~500 lines). Break into sub-tasks:
- 3.1-3.2: Backend + store (600s)  
- 3.3-3.5: Column layout UI (600s)
- 3.6: Cross-account routing (300s)
- 3.7-3.8: Search + notifications (300s)
- 3.9: IPC refactor (600s)

---

## Implementation Order

```
Priority 1 — CRITICAL BUG:
  └── Phase 1: Session persistence fix (blocks everything)

Priority 2 — MISSING CORE FEATURE:
  └── Phase 2: Native Telegram folders + archive

Priority 3 — DEEP ANALYSIS (before implementation):
  └── Phase 3a: Use Claude Code architect agent to deeply analyze codebase
      ├── Study all IPC handlers, stores, components that need multi-account changes
      ├── Design exact TypeScript interfaces for new state shape
      ├── Design component hierarchy for column layout
      ├── Evaluate routing strategies (explicit accountId vs implicit mapping)
      ├── Document edge cases (same contact in 2 accounts, message ordering, etc.)
      ├── Write PLAN-v3-multiaccount.md with detailed specs
      └── Only then proceed to implementation

Priority 4 — IMPLEMENTATION:
  └── Phase 3b: Multi-account columns UX (per detailed plan from 3a)
      ├── Backend foundation (IPC + store refactor)
      ├── Column layout UI
      └── Cross-account features (search, notifications, routing)
```

## Task Breakdown for Claude Code CLI

| Task | Files | Timeout | Description |
|------|-------|---------|-------------|
| P1.1 | electron/ipc/telegram.ts | 300s | Session persistence: save before switch, periodic save, save on quit |
| P1.2 | electron/ipc/telegram.ts | 120s | Graceful 401 handling: catch, clear stale session, notify renderer |
| P2.1 | electron/ipc/telegram.ts, preload, types, wrapper | 600s | getDialogFilters + getArchivedDialogs IPC handlers |
| P2.2 | stores/chats.ts, chat-sidebar.tsx | 600s | User folders in store + tabs UI + archive tab |
| P3.9 | electron/ipc/telegram.ts | 600s | Account-aware IPC: all handlers accept optional accountId |
| P3.1 | electron/ipc/telegram.ts | 300s | Connect all accounts on startup, event handlers on all |
| P3.2 | stores/chats.ts, types | 600s | Per-account dialogs map, account-aware activeChat |
| P3.3 | layout, sidebar | 600s | Column vs Unified toggle, column layout component |
| P3.4 | chat-list-item.tsx | 300s | Account badge (colored dot + label) |
| P3.6 | stores/chats.ts, telegram.ts | 300s | Cross-account message routing |
| P3.7 | stores/chats.ts, sidebar | 300s | Cross-account search |
| P3.8 | electron/ipc/telegram.ts | 300s | Multi-account notifications |

**Total estimated: ~12 Claude Code runs, ~5400s (1.5 hours) of CLI time**
