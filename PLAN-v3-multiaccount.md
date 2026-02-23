# PLAN v3 — True Multi-Account Architecture

## Executive Summary

Transform the Telegram CRM Client from a single-active-account model into a simultaneous multi-account system where all connected Telegram accounts are live at once. Users can view chat lists from multiple accounts side-by-side in a column layout, receive real-time updates from all accounts, and seamlessly interact with any account's chats from a unified interface.

---

## 1. Current State Audit

### 1.1 IPC Handlers — Single Account Bottleneck (`electron/ipc/telegram.ts`)

The core issue: **`getActiveClient()` (line 57)** returns the one-and-only active client. Every data-fetching and mutation handler calls this function, meaning all Telegram operations implicitly target whichever account is currently "active."

#### Handlers that use `getActiveClient()` — MUST receive `accountId` param:

| Handler | Line | Purpose | Account-Sensitive? |
|---------|------|---------|-------------------|
| `telegram:getDialogs` | 741 | Fetch dialog list | YES — each account has its own dialogs |
| `telegram:getArchivedDialogs` | 679 | Fetch archived dialogs | YES |
| `telegram:getDialogFilters` | 646 | Fetch user folders | YES |
| `telegram:getMessages` | 804 | Fetch messages for a chat | YES — chatId is only valid for the account that owns it |
| `telegram:sendMessage` | 1083 | Send text message | YES |
| `telegram:editMessage` | 1100 | Edit message | YES |
| `telegram:deleteMessages` | 1107 | Delete messages | YES |
| `telegram:getUserInfo` | 1114 | Fetch user profile | YES — user entities are per-account |
| `telegram:getForumTopics` | 1161 | Fetch forum topics | YES |
| `telegram:getTopicMessages` | 1226 | Fetch topic messages | YES |
| `telegram:sendTopicMessage` | 1349 | Send to forum topic | YES |
| `telegram:sendFile` | 1386 | Send file | YES |
| `telegram:sendPhoto` | 1403 | Send photo | YES |
| `telegram:searchMessages` | 1424 | Search messages | YES (also needs cross-account variant) |
| `telegram:setTyping` | 1550 | Send typing indicator | YES |
| `telegram:markRead` | 1561 | Mark chat as read | YES |

#### Handlers that use `activeAccountId` directly:

| Handler | Line | Issue |
|---------|------|-------|
| `telegram:isAuthorized` | 435 | Checks only active account — should check ALL or specific |
| `telegram:getMe` | 486 | Returns active account's info — needs accountId param |
| `telegram:logout` | 1574 | Logs out active account — needs accountId param |

#### Handlers that are already multi-account or account-agnostic:

| Handler | Line | Status |
|---------|------|--------|
| `telegram:getAccounts` | 504 | Already returns all accounts |
| `telegram:switchAccount` | 550 | Exists but becomes less important (no longer the primary way to access accounts) |
| `telegram:addAccount` | 599 | Account-agnostic (creates new auth client) |
| `telegram:removeAccount` | 604 | Already accepts accountId |
| `telegram:cancelAddAccount` | 639 | Account-agnostic |
| `telegram:connect` | 323 | Auth flow — account-agnostic |
| `telegram:getQRUrl` | 329 | Auth flow — uses `authClient` |
| `telegram:loginWithPhone` | 376 | Auth flow |
| `telegram:verifyCode` | 393 | Auth flow |
| `telegram:checkPassword` | 414 | Auth flow |
| `telegram:submit2FA` | 367 | Auth flow |
| `telegram:pickFile` | 1366 | OS dialog — no client needed |
| `telegram:setNotificationSettings` | 1567 | Global muted set — needs per-account redesign |

#### Event handlers (`setupEventHandlers`, line 200):

**Critical**: Currently only called for the active account's client. For simultaneous multi-account, event handlers must be registered on ALL connected clients, and every event must be tagged with `accountId` so the renderer can route it to the correct store slice.

Current events sent to renderer (via `sendToRenderer`):
- `newMessage` — **missing accountId** in payload
- `readHistory` / `readHistoryInbox` — **missing accountId**
- `typing` — **missing accountId**
- `notificationClick` — **missing accountId** (which account's chat to open?)

#### Session management:

- `sessionSaveInterval` (line 1614) — only saves `activeAccountId`'s session. Must save ALL accounts.
- `saveAllSessions()` (line 47) — already saves all. This is called on quit but should also be called periodically.

---

### 1.2 Store Analysis (`src/stores/chats.ts`)

**Every piece of state is global/singleton — nothing is per-account.**

| State Field | Type | Per-Account Needed? | Notes |
|-------------|------|--------------------|----|
| `dialogs` | `TelegramDialog[]` | YES | Each account has its own dialog list |
| `messages` | `TelegramMessage[]` | YES (via composite key) | Messages are per-chat, but chatId alone isn't unique across accounts |
| `activeChat` | `string \| null` | YES — must include accountId | A chatId is only meaningful in the context of its account |
| `activeFolder` | `ChatFolder` | Per-column (if columns) | Each column could have its own folder filter |
| `searchQuery` | `string` | Global or per-column | |
| `forumTopics` | `ForumTopic[]` | YES | Topics belong to a chat on a specific account |
| `activeTopic` | `number \| null` | YES | |
| `drafts` | `Record<string, string>` | YES — key collision risk | `chatId` alone isn't unique; same numeric ID could exist on 2 accounts |
| `typingUsers` | `Record<string, TypingEntry[]>` | YES — same collision risk | |
| `pinnedChats` | `Set<string>` | YES | |
| `mutedChats` | `Set<string>` | YES | |
| `scrollPositions` | `Record<string, number>` | YES | |
| `userFolders` | `DialogFilter[]` | YES | Each account has its own folder filters |
| `archivedDialogs` | `TelegramDialog[]` | YES | |
| `searchResults` | `SearchResult[]` | Potentially cross-account | |

**Key insight**: Currently, a "chatId" like `"123456789"` is used as a unique key everywhere. But the same Telegram user ID can appear in two different accounts' dialog lists. In multi-account mode, the **composite key** `accountId:chatId` must be used for all chat-level state.

---

### 1.3 Component Analysis

#### `main-layout.tsx`
- Single `<ChatSidebar />` + `<ChatView />` + `<CrmPanel />` composition
- `currentUser` in header shows single account name
- `loadDialogs()` called once on mount — only for active account
- `setupRealtimeUpdates()` sets up ONE event listener — must handle ALL accounts

#### `chat-sidebar.tsx`
- `AccountSwitcher` component exists — renders avatar strip, calls `switchAccount()` + `loadDialogs()`
- `ChatSidebar` renders a single flat dialog list from `useChatsStore().dialogs`
- Folder tabs are global (not per-account)
- Search is global (routes to active account only)
- No visual distinction of which account owns a dialog

#### `chat-view.tsx`
- Reads `activeChat` from store — single string, no account context
- All API calls (search, messages) go through `telegramAPI.*` — which routes to active client
- Profile panel uses `currentDialog.id` — no account context

#### `chat-list-item.tsx` (not read but inferred)
- Renders individual dialog items
- No account badge or indicator

---

### 1.4 Type Analysis (`src/types/index.ts`, `src/types/ipc.ts`)

#### Types missing `accountId`:

| Type | Field Needed | Purpose |
|------|-------------|---------|
| `TelegramDialog` | `accountId: string` | Identify which account owns this dialog |
| `TelegramMessage` | `accountId: string` | Route replies/edits to correct client |
| `ForumTopic` | (inherited from parent dialog) | |
| `SearchResult` | `accountId: string` | Open result in correct account context |
| `ElectronAPI.telegram.*` | `accountId` param on most methods | Route IPC to correct client |

#### `IPCEventMap` — events missing `accountId`:
- `telegram:newMessage` — must include `accountId`
- `telegram:updateReadHistory` — must include `accountId`

---

## 2. Proposed Architecture

### 2.1 New TypeScript Interfaces

```typescript
// ─── Composite Keys ───

/** Unique identifier for a chat across all accounts */
interface AccountChatKey {
  accountId: string
  chatId: string
}

/** Serialize to string for use as Map/Record key */
function chatKey(accountId: string, chatId: string): string {
  return `${accountId}:${chatId}`
}

function parseChatKey(key: string): AccountChatKey {
  const [accountId, chatId] = key.split(':') as [string, string]
  return { accountId, chatId }
}

// ─── Extended Types ───

/** Dialog with account ownership */
interface TelegramDialog {
  // ...existing fields...
  accountId: string  // NEW: which account this dialog belongs to
}

/** Message with account context */
interface TelegramMessage {
  // ...existing fields...
  accountId: string  // NEW: which account this message was sent/received on
}

/** Search result with account context */
interface SearchResult {
  // ...existing fields...
  accountId: string  // NEW
}

// ─── Per-Account State ───

/** State slice for a single account's data */
interface AccountChatState {
  dialogs: TelegramDialog[]
  archivedDialogs: TelegramDialog[]
  userFolders: DialogFilter[]
  activeFolder: ChatFolder
  isLoadingDialogs: boolean
  isLoadingArchive: boolean
  unreadTotal: number  // computed: sum of all dialog unreadCounts
}

/** The active chat selection — now includes accountId */
interface ActiveChatSelection {
  accountId: string
  chatId: string
}

// ─── Store Shape ───

interface ChatsState {
  // Per-account state
  accountStates: Map<string, AccountChatState>

  // Active chat (global — one chat open at a time in the main view)
  activeChat: ActiveChatSelection | null
  messages: TelegramMessage[]             // messages for the active chat
  isLoadingMessages: boolean
  hasMoreMessages: boolean
  isLoadingMoreMessages: boolean

  // Active forum state (for the active chat)
  forumTopics: ForumTopic[]
  activeTopic: number | null
  isLoadingTopics: boolean

  // Per-chat state (keyed by `accountId:chatId`)
  drafts: Record<string, string>          // key: "accountId:chatId"
  scrollPositions: Record<string, number> // key: "accountId:chatId"
  pinnedChats: Set<string>                // "accountId:chatId" composite keys
  mutedChats: Set<string>                 // "accountId:chatId" composite keys
  typingUsers: Record<string, TypingEntry[]>  // key: "accountId:chatId"

  // Search (cross-account)
  searchQuery: string
  searchResults: SearchResult[]           // results include accountId
  isSearching: boolean

  // UI mode
  layoutMode: 'columns' | 'unified'
  columnOrder: string[]                   // accountId order for column display

  // Editing state
  replyingTo: TelegramMessage | null
  editingMessage: TelegramMessage | null

  // Actions
  loadDialogsForAccount: (accountId: string) => Promise<void>
  loadAllDialogs: () => Promise<void>
  setActiveChat: (accountId: string, chatId: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>          // uses activeChat context
  searchMessagesGlobal: (query: string) => Promise<void> // searches ALL accounts
  setLayoutMode: (mode: 'columns' | 'unified') => void
  setAccountFolder: (accountId: string, folder: ChatFolder) => void
  setupRealtimeUpdates: () => () => void                 // listens to ALL accounts
  // ...etc
}
```

### 2.2 Account Color System

Each account gets a deterministic color for visual differentiation:

```typescript
const ACCOUNT_COLORS = [
  '#3390ec', // Telegram blue
  '#e85d75', // pink/red
  '#27ae60', // green
  '#f39c12', // orange
  '#8e44ad', // purple
  '#1abc9c', // teal
] as const

interface AccountMeta {
  id: string
  firstName: string
  color: string      // assigned from ACCOUNT_COLORS by index
  shortLabel: string  // first letter or phone suffix
}
```

---

### 2.3 IPC Contract Changes

#### Strategy: Explicit `accountId` Parameter

**Every handler that touches a TelegramClient must accept `accountId` as the first parameter.** This is the cleanest, most debuggable approach. The alternative (implicit routing via a chatId→accountId map) is fragile because the same chatId CAN appear on multiple accounts.

#### New helper function (replaces `getActiveClient`):

```typescript
function getClientForAccount(accountId: string): TelegramClient {
  const entry = accounts.get(accountId)
  if (!entry) {
    throw new Error(`No session for account ${accountId}`)
  }
  return entry.client
}
```

#### Handler signature changes:

```typescript
// BEFORE:
ipcMain.handle('telegram:getDialogs', async (_event, limit = 50) => {
  const tc = getActiveClient()  // implicit routing
  ...
})

// AFTER:
ipcMain.handle('telegram:getDialogs', async (_event, accountId: string, limit = 50) => {
  const tc = getClientForAccount(accountId)  // explicit routing
  ...
  // Tag each dialog with accountId before returning
  return dialogData.map(d => ({ ...d, accountId }))
})
```

#### Complete IPC change matrix:

| Handler | Current Params | New Params | Response Change |
|---------|---------------|------------|-----------------|
| `telegram:getDialogs` | `limit` | `accountId, limit` | Add `accountId` to each dialog |
| `telegram:getArchivedDialogs` | `limit` | `accountId, limit` | Add `accountId` |
| `telegram:getDialogFilters` | none | `accountId` | None |
| `telegram:getMessages` | `chatId, limit, offsetId` | `accountId, chatId, limit, offsetId` | Add `accountId` to each message |
| `telegram:sendMessage` | `chatId, text, replyTo` | `accountId, chatId, text, replyTo` | None |
| `telegram:editMessage` | `chatId, messageId, text` | `accountId, chatId, messageId, text` | None |
| `telegram:deleteMessages` | `chatId, messageIds, revoke` | `accountId, chatId, messageIds, revoke` | None |
| `telegram:getUserInfo` | `userId` | `accountId, userId` | None |
| `telegram:getForumTopics` | `chatId` | `accountId, chatId` | None |
| `telegram:getTopicMessages` | `chatId, topicId, limit` | `accountId, chatId, topicId, limit` | Add `accountId` |
| `telegram:sendTopicMessage` | `chatId, topicId, text` | `accountId, chatId, topicId, text` | None |
| `telegram:sendFile` | `chatId, filePath, ...` | `accountId, chatId, filePath, ...` | None |
| `telegram:sendPhoto` | `chatId, base64Data, ...` | `accountId, chatId, base64Data, ...` | None |
| `telegram:searchMessages` | `query, chatId?, limit` | `accountId, query, chatId?, limit` | Add `accountId` to results |
| `telegram:setTyping` | `chatId` | `accountId, chatId` | None |
| `telegram:markRead` | `chatId` | `accountId, chatId` | None |
| `telegram:getMe` | none | `accountId?` | None (if no param, use first account or return all) |
| `telegram:logout` | none | `accountId` | None |
| `telegram:setNotificationSettings` | `{ mutedChats }` | `accountId, { mutedChats }` | None |

#### New IPC handlers:

| Handler | Params | Purpose |
|---------|--------|---------|
| `telegram:connectAll` | none | Connect ALL stored accounts on startup |
| `telegram:getConnectedAccounts` | none | Return which accounts are connected and ready |
| `telegram:searchMessagesGlobal` | `query, limit` | Search across ALL accounts simultaneously |

#### Event payload changes:

```typescript
// BEFORE:
sendToRenderer('newMessage', {
  id, chatId, text, date, out, senderName, senderId
})

// AFTER:
sendToRenderer('newMessage', {
  accountId,  // NEW — identifies which account received this message
  id, chatId, text, date, out, senderName, senderId
})

// Same for readHistory, readHistoryInbox, typing:
sendToRenderer('readHistory', { accountId, peerId, maxId })
sendToRenderer('typing', { accountId, chatId, userId })

// Notifications:
sendToRenderer('notificationClick', { accountId, chatId })
```

---

### 2.4 Event Handler Registration

```typescript
// NEW: Called once per account, not once per "active account switch"
function setupEventHandlersForAccount(accountId: string, tc: TelegramClient): void {
  // Prevent duplicate handlers by tracking
  if (accountEventHandlers.has(accountId)) return
  accountEventHandlers.add(accountId)

  tc.addEventHandler(async (event) => {
    const msg = event.message
    if (!msg) return
    sendToRenderer('newMessage', {
      accountId,  // ← tagged
      id: msg.id,
      chatId: msg.chatId?.toString() ?? '',
      text: msg.message ?? '',
      // ...
    })
  }, new NewMessage({}))

  tc.addEventHandler((update) => {
    if (update instanceof Api.UpdateReadHistoryOutbox) {
      sendToRenderer('readHistory', {
        accountId,  // ← tagged
        peerId: update.peer.toString(),
        maxId: update.maxId,
      })
    }
    // ...etc for all update types
  })
}
```

**Startup flow:**

```typescript
async function connectAllAccounts(): Promise<void> {
  const ids = loadAccountIds()
  for (const id of ids) {
    const entry = accounts.get(id)
    if (!entry) continue
    try {
      await entry.client.connect()
      setupEventHandlersForAccount(id, entry.client)
    } catch (err) {
      console.error(`[Telegram] Failed to connect account ${id}:`, err)
      // Mark as disconnected, don't block other accounts
    }
  }
}
```

---

### 2.5 Preload & Renderer API Changes

#### `electron/preload.ts`:

Every method gains an `accountId` first parameter:

```typescript
const api = {
  telegram: {
    // Account-scoped operations
    getDialogs: (accountId: string, limit?: number) =>
      ipcRenderer.invoke('telegram:getDialogs', accountId, limit),
    getMessages: (accountId: string, chatId: string, limit?: number, offsetId?: number) =>
      ipcRenderer.invoke('telegram:getMessages', accountId, chatId, limit, offsetId),
    sendMessage: (accountId: string, chatId: string, text: string, replyTo?: number) =>
      ipcRenderer.invoke('telegram:sendMessage', accountId, chatId, text, replyTo),
    // ...all other handlers similarly

    // Global operations (unchanged)
    getAccounts: () => ipcRenderer.invoke('telegram:getAccounts'),
    connectAll: () => ipcRenderer.invoke('telegram:connectAll'),

    // Cross-account operations
    searchMessagesGlobal: (query: string, limit?: number) =>
      ipcRenderer.invoke('telegram:searchMessagesGlobal', query, limit),

    // Events now include accountId in payload (no API change needed,
    // but renderer must handle the new field)
    onUpdate: (callback) => { /* unchanged signature */ },
  },
}
```

#### `src/lib/telegram.ts`:

Thin wrapper updated to pass `accountId`:

```typescript
export const telegramAPI = {
  getDialogs: (accountId: string, limit?: number) =>
    api().getDialogs(accountId, limit),
  getMessages: (accountId: string, chatId: string, limit?: number, offsetId?: number) =>
    api().getMessages(accountId, chatId, limit, offsetId),
  sendMessage: (accountId: string, chatId: string, text: string, replyTo?: number) =>
    api().sendMessage(accountId, chatId, text, replyTo),
  // ...etc
}
```

---

### 2.6 ElectronAPI Type Updates (`src/types/index.ts`)

```typescript
export interface ElectronAPI {
  telegram: {
    // Auth (unchanged — auth flow is account-creation, not account-scoped)
    connect: () => Promise<void>
    getQRUrl: () => Promise<string>
    loginWithPhone: (phone: string) => Promise<{ phoneCodeHash: string }>
    verifyCode: (phone: string, code: string, phoneCodeHash: string) => Promise<VerifyCodeResult>
    submit2FA: (password: string) => Promise<boolean>
    checkPassword: (password: string) => Promise<boolean>
    isAuthorized: () => Promise<boolean>

    // Account management (unchanged)
    getAccounts: () => Promise<TelegramAccount[]>
    addAccount: () => Promise<void>
    removeAccount: (accountId: string) => Promise<void>
    cancelAddAccount: () => Promise<void>

    // NEW: Connect all accounts
    connectAll: () => Promise<void>

    // Account-scoped operations (accountId added as first param)
    getMe: (accountId: string) => Promise<TelegramUser | null>
    getDialogs: (accountId: string, limit?: number) => Promise<TelegramDialog[]>
    getArchivedDialogs: (accountId: string, limit?: number) => Promise<TelegramDialog[]>
    getDialogFilters: (accountId: string) => Promise<DialogFilter[]>
    getMessages: (accountId: string, chatId: string, limit?: number, offsetId?: number) => Promise<TelegramMessage[]>
    sendMessage: (accountId: string, chatId: string, text: string, replyTo?: number) => Promise<SendMessageResult>
    editMessage: (accountId: string, chatId: string, messageId: number, text: string) => Promise<void>
    deleteMessages: (accountId: string, chatId: string, messageIds: number[], revoke?: boolean) => Promise<void>
    getUserInfo: (accountId: string, userId: string) => Promise<UserProfile | null>
    getForumTopics: (accountId: string, chatId: string) => Promise<ForumTopic[]>
    getTopicMessages: (accountId: string, chatId: string, topicId: number, limit?: number) => Promise<TelegramMessage[]>
    sendTopicMessage: (accountId: string, chatId: string, topicId: number, text: string) => Promise<SendMessageResult>
    pickFile: (options?: { mediaOnly?: boolean }) => Promise<string | null>
    sendFile: (accountId: string, chatId: string, filePath: string, caption?: string, replyTo?: number) => Promise<SendMessageResult>
    sendPhoto: (accountId: string, chatId: string, base64Data: string, caption?: string, replyTo?: number) => Promise<SendMessageResult>
    searchMessages: (accountId: string, query: string, chatId?: string, limit?: number) => Promise<SearchResult[]>
    searchMessagesGlobal: (query: string, limit?: number) => Promise<SearchResult[]>
    setTyping: (accountId: string, chatId: string) => Promise<void>
    markRead: (accountId: string, chatId: string) => Promise<void>
    setNotificationSettings: (accountId: string, settings: { mutedChats: string[] }) => Promise<void>
    logout: (accountId: string) => Promise<void>

    // Events (unchanged signature, but payloads now include accountId)
    onNotificationClick: (callback: (accountId: string, chatId: string) => void) => () => void
    onUpdate: (callback: (event: string, data: unknown) => void) => () => void
  }
  // ...crm, claude, db unchanged
}
```

---

## 3. Component Hierarchy — Column Layout

### 3.1 Layout Modes

Two modes, togglable by user:

**Column Mode** (default for 2+ accounts):
```
┌──────────────────────────────────────────────────────────────────┐
│ [Nav: Chats | Pipeline | Activity]                    [User] [⚙]│
├──────────┬──────────┬────────────────────────┬──────────────────┤
│ Account1 │ Account2 │                        │                  │
│ (column) │ (column) │    Chat View           │   CRM Panel     │
│          │          │    (messages + input)   │   (if open)     │
│ ┌──────┐ │ ┌──────┐ │                        │                  │
│ │folder│ │ │folder│ │                        │                  │
│ │tabs  │ │ │tabs  │ │                        │                  │
│ ├──────┤ │ ├──────┤ │                        │                  │
│ │dialog│ │ │dialog│ │                        │                  │
│ │list  │ │ │list  │ │                        │                  │
│ │      │ │ │      │ │                        │                  │
│ └──────┘ │ └──────┘ │                        │                  │
└──────────┴──────────┴────────────────────────┴──────────────────┘
```

**Unified Mode** (default for 1 account):
```
┌──────────────────────────────────────────────────────────────────┐
│ [Nav: Chats | Pipeline | Activity]                    [User] [⚙]│
├────────────┬─────────────────────────┬──────────────────────────┤
│ [Acct1|A2] │                         │                          │
│ ┌────────┐ │                         │                          │
│ │ Search │ │   Chat View             │    CRM Panel             │
│ ├────────┤ │   (messages + input)    │    (if open)             │
│ │ [●]A1: │ │                         │                          │
│ │ Chat A │ │                         │                          │
│ │ [●]A2: │ │                         │                          │
│ │ Chat X │ │                         │                          │
│ │ [●]A1: │ │                         │                          │
│ │ Chat B │ │                         │                          │
│ └────────┘ │                         │                          │
└────────────┴─────────────────────────┴──────────────────────────┘
```

### 3.2 Component Tree

```
<MainLayout>
  <TopNavBar />
  <div className="flex flex-1">
    {layoutMode === 'columns' ? (
      <MultiAccountColumns>
        {connectedAccounts.map(account => (
          <AccountColumn key={account.id} accountId={account.id}>
            <AccountColumnHeader account={account} />
            <FolderTabs accountId={account.id} />
            <DialogList accountId={account.id} />
          </AccountColumn>
        ))}
      </MultiAccountColumns>
    ) : (
      <UnifiedSidebar>
        <AccountSwitcherStrip />
        <SearchBar />
        <FolderTabs />  {/* global folder filter */}
        <UnifiedDialogList />  {/* merged, sorted, with account badges */}
      </UnifiedSidebar>
    )}
    <ChatView />        {/* uses activeChat.accountId for routing */}
    {crmPanelOpen && <CrmPanel />}
  </div>
</MainLayout>
```

### 3.3 New Components

| Component | File | Purpose |
|-----------|------|---------|
| `MultiAccountColumns` | `src/components/chat/multi-account-columns.tsx` | Container with flex layout for account columns |
| `AccountColumn` | `src/components/chat/account-column.tsx` | Single account's dialog list with header, folders, search |
| `AccountColumnHeader` | `src/components/chat/account-column-header.tsx` | Account avatar, name, unread badge, collapse button |
| `UnifiedDialogList` | `src/components/chat/unified-dialog-list.tsx` | Merged dialog list with account badges |
| `AccountBadge` | `src/components/chat/account-badge.tsx` | Small colored dot + account initial |
| `LayoutModeToggle` | `src/components/layout/layout-mode-toggle.tsx` | Switch between columns and unified mode |

### 3.4 Component Behavior Details

#### `AccountColumn`
- Independent scrollable dialog list per account
- Own folder tabs (can be in different folders simultaneously)
- Own search within that account
- Collapsible (toggle between full width and narrow strip showing just avatar + unread count)
- Width: equal flex distribution, min-width 200px, max 3 columns visible (horizontal scroll for more)
- Active chat highlighted with accent border
- Unread count badge on column header = sum of all dialog unread counts

#### `UnifiedDialogList`
- Merges all accounts' dialogs into one sorted list
- Each item has a colored dot badge (account color) + first letter
- Sort: globally by `lastMessageDate` descending
- Pinned chats: per-account pins shown at top (grouped by account or interleaved)
- Folder filter applies across all accounts simultaneously

#### `ChatView` Changes
- Header shows which account this chat belongs to (small account badge next to chat title)
- All API calls use `activeChat.accountId` for routing
- "Replying as [Account Name]" indicator when composing

---

## 4. State Management Design

### 4.1 Store Refactor — `src/stores/chats.ts`

```typescript
interface AccountChatState {
  dialogs: TelegramDialog[]
  archivedDialogs: TelegramDialog[]
  userFolders: DialogFilter[]
  activeFolder: ChatFolder
  isLoadingDialogs: boolean
  isLoadingArchive: boolean
  isCollapsed: boolean        // for column mode
}

interface ChatsState {
  // ─── Per-account data ───
  accountStates: Record<string, AccountChatState>

  // ─── Active chat (global) ───
  activeChat: { accountId: string; chatId: string } | null
  messages: TelegramMessage[]
  isLoadingMessages: boolean
  hasMoreMessages: boolean
  isLoadingMoreMessages: boolean

  // ─── Active forum (follows activeChat) ───
  forumTopics: ForumTopic[]
  activeTopic: number | null
  isLoadingTopics: boolean

  // ─── Per-chat state (composite key: "accountId:chatId") ───
  drafts: Record<string, string>
  scrollPositions: Record<string, number>
  pinnedChats: Set<string>
  mutedChats: Set<string>
  typingUsers: Record<string, TypingEntry[]>

  // ─── UI state ───
  layoutMode: 'columns' | 'unified'
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean

  // ─── Editing state (follows activeChat) ───
  replyingTo: TelegramMessage | null
  editingMessage: TelegramMessage | null

  // ─── Actions ───
  loadDialogsForAccount: (accountId: string) => Promise<void>
  loadAllDialogs: () => Promise<void>
  setActiveChat: (accountId: string, chatId: string) => Promise<void>
  setAccountFolder: (accountId: string, folder: ChatFolder) => void
  toggleAccountCollapsed: (accountId: string) => void
  setLayoutMode: (mode: 'columns' | 'unified') => void
  sendMessage: (text: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  searchMessagesGlobal: (query: string) => Promise<void>
  setupRealtimeUpdates: () => () => void
  // ...existing actions with updated signatures
}
```

### 4.2 Key State Transitions

#### Loading dialogs for all accounts (startup):

```typescript
loadAllDialogs: async () => {
  const accounts = useAuthStore.getState().accounts
  // Load in parallel
  await Promise.all(
    accounts.map(account => get().loadDialogsForAccount(account.id))
  )
}

loadDialogsForAccount: async (accountId: string) => {
  set(state => ({
    accountStates: {
      ...state.accountStates,
      [accountId]: {
        ...(state.accountStates[accountId] ?? defaultAccountState()),
        isLoadingDialogs: true,
      },
    },
  }))

  const dialogs = await telegramAPI.getDialogs(accountId, 100)

  set(state => ({
    accountStates: {
      ...state.accountStates,
      [accountId]: {
        ...state.accountStates[accountId]!,
        dialogs,
        isLoadingDialogs: false,
      },
    },
  }))
}
```

#### Setting active chat (with account context):

```typescript
setActiveChat: async (accountId: string, chatId: string) => {
  const accountState = get().accountStates[accountId]
  const dialog = accountState?.dialogs.find(d => d.id === chatId)
    ?? accountState?.archivedDialogs.find(d => d.id === chatId)

  if (dialog?.isForum) {
    set({
      activeChat: { accountId, chatId },
      activeTopic: null,
      forumTopics: [],
      messages: [],
      isLoadingTopics: true,
    })
    const topics = await telegramAPI.getForumTopics(accountId, chatId)
    set({ forumTopics: topics, isLoadingTopics: false })
  } else {
    set({
      activeChat: { accountId, chatId },
      activeTopic: null,
      forumTopics: [],
      messages: [],
      isLoadingMessages: true,
      hasMoreMessages: true,
    })
    const messages = await telegramAPI.getMessages(accountId, chatId, 50)
    set({
      messages,
      isLoadingMessages: false,
      hasMoreMessages: messages.length >= 50,
    })
    void telegramAPI.markRead(accountId, chatId)
  }
}
```

#### Sending a message (uses activeChat context automatically):

```typescript
sendMessage: async (text: string) => {
  const { activeChat, activeTopic, editingMessage, replyingTo } = get()
  if (!activeChat) return

  const { accountId, chatId } = activeChat

  if (editingMessage) {
    await telegramAPI.editMessage(accountId, chatId, editingMessage.id, text)
    // ...update local state
    return
  }

  const result = activeTopic !== null
    ? await telegramAPI.sendTopicMessage(accountId, chatId, activeTopic, text)
    : await telegramAPI.sendMessage(accountId, chatId, text, replyingTo?.id)

  // Optimistic update
  const newMsg: TelegramMessage = {
    id: result.id,
    chatId,
    accountId,
    text,
    date: result.date,
    out: true,
    senderName: 'You',
    senderId: '',
  }
  set(state => ({ messages: [...state.messages, newMsg], replyingTo: null }))
}
```

#### Real-time updates (handle ALL accounts):

```typescript
setupRealtimeUpdates: () => {
  const cleanup = telegramAPI.onUpdate((event, data) => {
    if (event === 'newMessage') {
      const msg = data as TelegramMessage & { accountId: string }
      const { activeChat } = get()

      // Append to messages if this is the active chat
      if (activeChat &&
          msg.accountId === activeChat.accountId &&
          msg.chatId === activeChat.chatId) {
        set(state => ({ messages: [...state.messages, msg] }))
        void telegramAPI.markRead(msg.accountId, msg.chatId)
      }

      // Update the correct account's dialog list
      set(state => {
        const accountState = state.accountStates[msg.accountId]
        if (!accountState) return state

        const updatedDialogs = accountState.dialogs.map(d => {
          if (d.id === msg.chatId) {
            const isActive = activeChat?.accountId === msg.accountId &&
                            activeChat?.chatId === msg.chatId
            return {
              ...d,
              lastMessage: msg.text,
              lastMessageDate: msg.date,
              unreadCount: isActive ? 0 : d.unreadCount + 1,
            }
          }
          return d
        })
        updatedDialogs.sort((a, b) => b.lastMessageDate - a.lastMessageDate)

        return {
          accountStates: {
            ...state.accountStates,
            [msg.accountId]: {
              ...accountState,
              dialogs: updatedDialogs,
            },
          },
        }
      })
    }

    if (event === 'typing') {
      const { accountId, chatId, userId } = data as {
        accountId: string; chatId: string; userId: string
      }
      const key = `${accountId}:${chatId}`
      get().addTypingUser(key, userId)
    }
  })

  return cleanup
}
```

### 4.3 localStorage Key Migration

Current keys are not account-scoped. Migration needed:

| Current Key | New Key Format | Migration |
|-------------|---------------|-----------|
| `telegram-crm-drafts` | `telegram-crm-drafts` (internal keys change to `acctId:chatId`) | On first load, prefix existing keys with activeAccountId |
| `telegram-crm-pinned` | `telegram-crm-pinned` (values become `acctId:chatId`) | Prefix existing values |
| `telegram-crm-muted` | `telegram-crm-muted` (values become `acctId:chatId`) | Prefix existing values |
| `app-layout-mode` | NEW | Default: `'unified'` for 1 account, `'columns'` for 2+ |

---

## 5. Edge Cases & Solutions

### 5.1 Same Contact on Two Accounts

**Scenario**: User "Ivan" (Telegram ID `123456`) exists in Account A's dialog list AND Account B's dialog list.

**Problem**: chatId `"123456"` appears twice. If we just use chatId as key, state collides.

**Solution**: All state keys use composite `accountId:chatId`. The same person appears as two separate dialog entries, one per account column. This is correct behavior — the conversation history with Ivan is different on each account.

**CRM Panel**: When opening Ivan's chat from Account A vs Account B, the CRM deal lookup uses the phone number (which is the same), so the same Bitrix24 deal shows in both. This is correct and desired.

### 5.2 Notification Routing

**Scenario**: Message arrives on Account B while user is looking at Account A's chat.

**Solution**:
1. Desktop notification shows: `"[Account B] Ivan: Hello!"` — account name prefixed
2. Notification click payload includes `{ accountId: 'B', chatId: '123456' }`
3. Click handler calls `setActiveChat('B', '123456')` — opens correct chat
4. Dialog list updates in real-time: Account B's column shows new unread badge

### 5.3 Unread Counts

- **Per-dialog**: Already tracked by Telegram, comes from `getDialogs()`. No change needed.
- **Per-account total**: Computed from `accountState.dialogs.reduce((sum, d) => sum + d.unreadCount, 0)`. Displayed in column header badge.
- **Global total**: Sum across all accounts. Can be shown in app title bar: `"Telegram CRM (5)"`.
- **App badge (taskbar)**: Sum of all accounts' unread counts.

### 5.4 Cross-Account Search

**Global search** searches ALL connected accounts in parallel:

```typescript
// IPC handler
ipcMain.handle('telegram:searchMessagesGlobal', async (_event, query: string, limit = 20) => {
  const ids = loadAccountIds()
  const results = await Promise.all(
    ids.map(async (accountId) => {
      const entry = accounts.get(accountId)
      if (!entry) return []
      try {
        const tc = entry.client
        const result = await tc.invoke(
          new Api.messages.SearchGlobal({ q: query, /* ... */ })
        )
        // Map results, tag with accountId
        return mapResults(result).map(r => ({ ...r, accountId }))
      } catch {
        return []
      }
    })
  )
  // Merge and sort by date
  return results.flat().sort((a, b) => b.date - a.date).slice(0, limit)
})
```

**In-column search** (when searching within a specific account column): Uses existing `telegram:searchMessages` with the column's `accountId`.

### 5.5 Rate Limiting Across Accounts

Each account has its own rate limit budget (Telegram rate limits are per-account, not per-IP for MTProto). No coordination needed between accounts. The existing 1-2s delay before sends applies per-account.

However, `connectAll()` on startup should stagger connections slightly to avoid burst:

```typescript
for (const id of ids) {
  await connectAccount(id)
  await new Promise(r => setTimeout(r, 500))  // 500ms between connections
}
```

### 5.6 Account Disconnection / Session Expiry

**Scenario**: Account B's session expires while Account A is active.

**Solution**:
1. GramJS fires a connection error on Account B's client
2. Main process catches it, sends `telegram:accountDisconnected` event with `{ accountId: 'B' }`
3. Renderer shows a warning badge on Account B's column header: "Reconnecting..." or "Re-auth needed"
4. If auth key is revoked (401), show "Session expired" with a re-login button in the column
5. Account A continues working normally — accounts are fully independent

### 5.7 Memory & Performance

**Concern**: Multiple GramJS clients = multiple MTProto connections = more memory.

**Mitigation**:
- Each GramJS client uses ~20-30MB. For 2-3 accounts, ~90MB extra is acceptable for a desktop app.
- Dialog avatars: already limited to 20 per account. With 3 accounts = 60 avatar downloads max.
- Message loading: only the active chat loads messages. No change here.
- WebSocket connections: one per account. Electron handles this fine.

**Limit**: Cap at 5 simultaneous accounts. Show warning at 4+.

### 5.8 Column Collapse & Width

- Each column: min-width 200px, default equal flex distribution
- Collapsed column: 48px wide (shows just account avatar + unread badge)
- If total column width would exceed sidebar area, enable horizontal scroll OR auto-collapse least-recently-used columns
- Column order: configurable (stored in localStorage), default = account creation order

### 5.9 Unified Mode Sorting

When all accounts' dialogs are merged into one list:

```typescript
function unifiedDialogList(accountStates: Record<string, AccountChatState>): TelegramDialog[] {
  const all = Object.values(accountStates).flatMap(s => s.dialogs)
  // Pinned first (across all accounts), then by date
  return all.sort((a, b) => {
    const aPinned = pinnedChats.has(`${a.accountId}:${a.id}`)
    const bPinned = pinnedChats.has(`${b.accountId}:${b.id}`)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return b.lastMessageDate - a.lastMessageDate
  })
}
```

---

## 6. Auth Store Changes (`src/stores/auth.ts`)

The auth store needs minimal changes:

```typescript
interface AuthState {
  // Existing fields (mostly unchanged)
  step: AuthStep
  isAuthorized: boolean              // true if ANY account is authenticated
  isLoading: boolean
  currentUser: TelegramUser | null   // DEPRECATED — use per-account data
  accounts: TelegramAccount[]
  activeAccountId: string            // DEPRECATED for data operations, kept for "last clicked column"

  // Changed
  connectedAccountIds: string[]      // which accounts are currently connected
  disconnectedAccountIds: string[]   // which accounts need re-auth

  // Auth flow (unchanged — always for a specific new/re-auth flow)
  isAddingAccount: boolean
  needs2FA: boolean
  qrUrl: string | null
  phoneCodeHash: string | null
  error: string | null
}
```

---

## 7. Implementation Phases

### Phase 1: IPC Foundation (Backend)
**Files**: `electron/ipc/telegram.ts`, `electron/preload.ts`, `src/lib/telegram.ts`, `src/types/index.ts`

1. Add `accountId` parameter to ALL `getActiveClient()` handlers
2. Replace `getActiveClient()` with `getClientForAccount(accountId)`
3. Tag all event payloads with `accountId`
4. Register event handlers on ALL accounts (not just active)
5. Add `telegram:connectAll` handler
6. Update preload bridge signatures
7. Update `src/lib/telegram.ts` wrapper
8. Update `ElectronAPI` types
9. Add `accountId` field to `TelegramDialog`, `TelegramMessage`, `SearchResult`

**Backward compat strategy**: During migration, if `accountId` is not provided (old code path), fall back to `activeAccountId`. This allows incremental migration.

### Phase 2: Store Refactor
**Files**: `src/stores/chats.ts`, `src/stores/auth.ts`

1. Reshape `ChatsState` to use `accountStates: Record<string, AccountChatState>`
2. Change `activeChat` from `string | null` to `{ accountId, chatId } | null`
3. Update all composite keys to `accountId:chatId` format
4. Update `loadDialogs` → `loadAllDialogs` (parallel)
5. Update `setupRealtimeUpdates` to handle `accountId` in events
6. Update `sendMessage`, `editMessage`, `deleteMessages` to use `activeChat.accountId`
7. Migrate localStorage keys on first load

### Phase 3: Column Layout UI
**Files**: `src/components/chat/multi-account-columns.tsx` (new), `src/components/chat/account-column.tsx` (new), `src/components/layout/main-layout.tsx`

1. Create `AccountColumn` component with own folder tabs + dialog list
2. Create `MultiAccountColumns` container with flex layout
3. Update `MainLayout` to render columns vs unified based on `layoutMode`
4. Add `LayoutModeToggle` component
5. Column collapse/expand functionality
6. Account color assignment and badge component

### Phase 4: Unified Mode Updates
**Files**: `src/components/chat/chat-sidebar.tsx`, `src/components/chat/chat-list-item.tsx`

1. Update `UnifiedDialogList` to merge all accounts' dialogs
2. Add `AccountBadge` to each dialog item (colored dot)
3. Update `AccountSwitcher` to be a visual indicator rather than a switcher
4. Folder filtering across all accounts

### Phase 5: ChatView & Cross-Account Features
**Files**: `src/components/chat/chat-view.tsx`, `src/components/chat/message-input.tsx`

1. Update `ChatView` to show account badge in header
2. Update all internal API calls to use `activeChat.accountId`
3. Add "Replying as [Account]" indicator
4. Cross-account global search
5. Notification routing with account context
6. App title bar unread count (all accounts)

---

## 8. Testing Strategy

### Unit Tests
- `chatKey()` / `parseChatKey()` utility functions
- `AccountChatState` initialization and updates
- Unified dialog list merging and sorting
- Account color assignment

### Integration Tests
- IPC round-trip with `accountId` parameter
- Event routing: message arrives on Account B while viewing Account A
- Session save/restore for multiple accounts
- Cross-account search result merging

### E2E Tests
- Column layout renders correct number of columns
- Clicking chat in column B opens it in ChatView with correct messages
- Layout mode toggle persists across reload
- Column collapse/expand

### Manual QA Scenarios
- Same person contacted from 2 accounts
- Account session expires while app is running
- Add 3rd account while 2 are already connected
- Remove account whose chat is currently open
- Send message from account that just reconnected

---

## 9. Migration Plan

### Data Migration

On first startup after the multi-account update:

1. Detect if localStorage has old-format keys (no `accountId:` prefix)
2. Read `activeAccountId` from auth store
3. Prefix all existing draft, pinned, muted keys with `activeAccountId:`
4. Save migration flag: `localStorage.setItem('multi-account-migrated', 'true')`

### Rollback Safety

- Database schema unchanged (sessions already stored per-account)
- localStorage changes are additive (old keys preserved until migration confirmed)
- IPC backward compat: handlers accept optional `accountId`, default to active

---

## 10. Open Questions for Implementation

1. **Column order persistence**: Should column order be user-configurable (drag-to-reorder) or fixed by account creation order?
   - **Recommendation**: Fixed order for v1. Configurable in v2.

2. **Maximum accounts**: Hard limit on simultaneous accounts?
   - **Recommendation**: 5 accounts max. UI becomes unwieldy beyond 3 columns anyway.

3. **CRM panel behavior**: When switching between accounts' chats, should the CRM panel refresh?
   - **Recommendation**: Yes — CRM lookup is based on phone number which differs per account's contact. The CRM panel should use `activeChat.accountId` to look up the correct contact.

4. **Muted chats sync to main process**: Currently one global `mutedChats` set in main. Needs per-account or combined?
   - **Recommendation**: Per-account sets in main process, keyed by `accountId`. Each set controls notifications for that account's client.

5. **Session save interval**: Currently saves only active account every 60s. Should save all?
   - **Recommendation**: Save ALL accounts every 60s. `saveAllSessions()` already exists and iterates all entries.
