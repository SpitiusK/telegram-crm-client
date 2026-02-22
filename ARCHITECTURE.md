# Custom Telegram Desktop Client — Architecture

## 🎯 Goal

Build a custom Telegram Desktop client with:
1. Full messaging functionality (like official TDesktop)
2. Custom CRM features integrated (Bitrix24, Claude AI)
3. Session that looks like official Telegram Desktop (anti-ban)
4. Operator panel for CRM Sales Assistant workflow

## 🏗️ Architecture Decision: Which Approach?

### Option A: Fork TDesktop (C++ / Qt) ❌
- **Pros:** Identical to official client, all features out of the box
- **Cons:** C++ complexity, massive codebase (~500k LOC), hard to add custom UI, slow iteration
- **Verdict:** Overkill. Maintenance nightmare.

### Option B: Electron + TDLib (Node.js) ❌
- **Pros:** Familiar web stack, TDLib handles protocol
- **Cons:** TDLib compilation is painful, heavy binary, JSON interface is verbose
- **Verdict:** TDLib adds complexity without proportional benefit for our use case.

### Option C: Electron + GramJS (TypeScript) ✅ **CHOSEN**
- **Pros:**
  - Pure JS/TS MTProto implementation (no native deps)
  - Same library telegram-tt (Telegram Web A) uses — battle-tested
  - Official TDesktop credentials + device spoofing built-in
  - Full control over session management
  - React/TypeScript = fast UI iteration
  - Easy to integrate HTTP APIs (Bitrix24, Claude)
  - Can reuse telegram-tt components or build from scratch
- **Cons:** Must implement some features manually (but we only need what we need)
- **Verdict:** Best balance of power, speed, and maintainability

### Option D: Fork telegram-tt + Electron wrapper ⚠️ **ALTERNATIVE**
- Take the official Telegram Web A source, wrap in Electron
- Add custom panels/views for CRM
- **Pros:** Full-featured client on day 1, just add CRM overlay
- **Cons:** Huge codebase to understand, uses custom "Teact" framework (not standard React)
- **Verdict:** Good if we want full client ASAP, but harder to customize deeply

## ✅ Final Decision: Option C — Electron + GramJS from scratch

We build a focused client, not a full Telegram clone. We implement only what's needed for the CRM workflow, plus basic messaging.

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Electron 33+ | Cross-platform desktop, Node.js + Chromium |
| **UI Framework** | React 18 + TypeScript | Fast iteration, huge ecosystem |
| **State** | Zustand | Lightweight, no boilerplate (vs Redux) |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development, Telegram-like aesthetics |
| **MTProto** | GramJS (telegram npm package) | Pure JS MTProto, used by Telegram Web A |
| **Session** | GramJS StringSession / file session | TDesktop credentials (api_id=2040) |
| **Local DB** | SQLite (better-sqlite3) | Message cache, CRM state, search index |
| **Build** | Vite + electron-builder | Fast dev, production builds |
| **IPC** | Electron IPC (contextBridge) | Secure main↔renderer communication |

### CRM Integration Layer

| Integration | Library | Purpose |
|-------------|---------|---------|
| **Bitrix24** | REST API (fetch) | Read deals, contacts, stages |
| **Claude AI** | @anthropic-ai/sdk | Generate messages, analyze conversations |
| **QR Auth** | qrcode + GramJS | Session creation via QR scan |

## 📁 Project Structure

```
telegram-crm-client/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Context bridge
│   └── ipc/
│       ├── telegram.ts      # GramJS operations (main process)
│       ├── crm.ts           # Bitrix24 API
│       ├── claude.ts        # Claude AI calls
│       └── database.ts      # SQLite operations
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── stores/
│   │   ├── auth.ts          # Auth state
│   │   ├── chats.ts         # Chat list & messages
│   │   ├── crm.ts           # CRM deals & pipeline
│   │   └── ui.ts            # UI state (panels, modals)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── QRLogin.tsx
│   │   │   └── PhoneLogin.tsx
│   │   ├── chat/
│   │   │   ├── ChatList.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── crm/
│   │   │   ├── DealPanel.tsx       # Deal info sidebar
│   │   │   ├── PipelineView.tsx    # Kanban board
│   │   │   ├── AIComposer.tsx      # Claude-generated messages
│   │   │   └── QuickActions.tsx    # CRM actions on chat
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── MainLayout.tsx
│   ├── lib/
│   │   ├── telegram.ts      # GramJS wrapper (renderer side)
│   │   ├── crm-api.ts       # Bitrix24 client
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── prisma/                   # Or raw SQLite schema
│   └── schema.prisma
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
└── .env
```

## 🔄 Data Flow

### CRM-Enhanced Chat Flow

```
User opens chat with client
        │
        ▼
┌───────────────────┐
│  GramJS loads      │──→ Message history displayed
│  chat history      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  CRM Panel loads   │──→ Deal info from Bitrix24
│  (sidebar)         │    Contact stage, notes, history
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  AI Composer       │──→ Claude generates reply suggestions
│  (bottom panel)    │    based on: deal stage + chat history
└────────┬──────────┘
         │
    Operator edits/approves
         │
         ▼
┌───────────────────┐
│  Send via GramJS   │──→ Message sent as "Telegram Desktop"
│  Log to SQLite     │    Activity logged locally
│  Update Bitrix24   │    Deal stage updated if needed
└───────────────────┘
```

## 🔐 Session Strategy

```typescript
// Use official TDesktop credentials
const client = new TelegramClient(
  session,          // StringSession or file
  2040,             // Telegram Desktop api_id
  'b18441a1ff607e10a989891a5462e627',
  {
    deviceModel: 'Desktop',
    systemVersion: 'Windows 10',
    appVersion: '5.12.1 x64',
    connectionRetries: 5,
  }
);
```

QR auth flow in Electron:
1. Generate QR via GramJS `client.signInWithQrCode()`
2. Display QR in React component
3. User scans with phone → session established
4. Session persisted to encrypted file

## 🎨 UI Layout

```
┌──────────────────────────────────────────────────┐
│  [≡] Telegram CRM Client            [🔍] [⚙️]  │
├────────────┬─────────────────────┬───────────────┤
│            │                     │               │
│  Chat List │   Message View      │  CRM Panel    │
│            │                     │               │
│  [👤 Alex] │  ┌─────────────┐   │  Deal: #1234  │
│  [👤 Maria]│  │ msg bubbles │   │  Stage: Nego  │
│  [👤 Ivan] │  │             │   │  Value: 50k   │
│            │  │             │   │  ───────────  │
│  ───────── │  └─────────────┘   │  Notes:       │
│  CRM Deals │                     │  Last contact │
│  [Pipeline]│  ┌─────────────┐   │  3 days ago   │
│  [Stats]   │  │ AI Composer │   │               │
│            │  │ [Suggest▼]  │   │  [📊 History] │
│            │  │ [Send]      │   │  [✏️ Edit]    │
│            │  └─────────────┘   │  [🔄 Refresh] │
├────────────┴─────────────────────┴───────────────┤
│  Status: Connected as +7XXX | Bitrix24: ✅ | AI: ✅│
└──────────────────────────────────────────────────┘
```

## 📋 MVP Scope (Phase 1)

1. **Auth:** QR login + session persistence
2. **Chat list:** Load dialogs, show unread counts
3. **Messages:** View history, send text messages
4. **CRM sidebar:** Show deal info for current chat contact
5. **AI composer:** Generate message suggestions via Claude

## 🚀 Phase 2

- Pipeline/Kanban view for deals
- Bulk message queue with approval flow
- Activity logging (SQLite)
- Message templates
- Search across chats + CRM

## 🔗 CRM Assistant Integration Points

The existing CRM Sales Assistant (Python/Telethon) shares:
- **Same Bitrix24 instance** — unified deal/contact data
- **Same Claude prompts** — consistent AI tone
- **Session compatibility** — can share Telegram session or use separate account

The desktop client replaces the Control Bot (TG bot) with a proper GUI, while the Python backend can still run automated pipelines.

## ⚠️ Key Risks

1. **Telegram ban** — mitigated by TDesktop credentials + rate limiting
2. **GramJS stability** — well-maintained, used by telegram-tt
3. **Electron size** — ~150MB, acceptable for desktop
4. **Scope creep** — MVP must be tight, CRM features added incrementally
