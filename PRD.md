# PRD: Telegram CRM Client

## Product Overview

Custom Telegram Desktop client with integrated CRM functionality for бустер.рф — сервис по продвижению сайтов через поведенческие факторы (клики). МОПы (менеджеры по продажам) ведут клиентов от регистрации через тест (1000 кликов) до оплаты, общаясь в Telegram. Клиент объединяет мессенджер с CRM-данными и AI-помощником.

## Problem Statement

Current workflow requires switching between:
- Telegram Desktop (messaging clients)
- Bitrix24 CRM (deal management)
- Separate Control Bot (approving AI messages)

This fragmentation slows operators, causes context loss, and makes it hard to track conversation-to-deal relationships.

### Воронка бустер.рф
Новая регистрация → Связался после регистрации (7д) → На тесте (7д) → Тест закончен → Связался после теста (7д) → Получили согласие на оплату → Оплата → Работа с клиентом

## Solution

A unified desktop application that embeds Telegram messaging alongside CRM tools, AI composer, and logging — all in one window.

## Target Users

- **МОПы (менеджеры по продажам)** бустер.рф
- Общаются с клиентами (владельцы сайтов, SEO-специалисты) через Telegram
- Ведут воронку в Bitrix24
- Single-user to small team (1-5 операторов)

## Core Requirements

### P0 — MVP (Must Have)

1. **Telegram Authentication**
   - QR code login (primary) — scanned from phone
   - Phone + code login (fallback)
   - Session persisted securely to disk
   - Session appears as "Telegram Desktop" (api_id=2040)
   - Anti-ban: rate limiting, human-like delays

2. **Chat Interface**
   - Dialog list with search, unread counts, avatars
   - Message view: text, images, stickers, replies
   - Send text messages
   - Real-time updates via MTProto
   - Message read status

3. **CRM Sidebar**
   - When chat contact matches a Bitrix24 deal → show deal info
   - Deal stage, value, contact name, notes
   - Link to open deal in Bitrix24 web
   - Manual deal search/link to chat

4. **AI Composer**
   - Generate message suggestions based on:
     - Current deal stage
     - Last N messages in chat
     - Contact info
   - Edit generated message before sending
   - Send directly or copy to clipboard

### P1 — Post-MVP

5. **Pipeline View**
   - Kanban board showing deals by stage
   - Click deal → open corresponding chat
   - Drag to change deal stage

6. **Activity Logging (SQLite)**
   - Log sent messages with metadata locally
   - Log deal stage changes
   - Exportable reports (CSV/JSON)

7. **Message Templates**
   - Predefined templates by deal stage
   - Variable substitution (name, company, etc.)
   - Quick-insert from composer

8. **Bulk Queue**
   - Queue messages for multiple contacts
   - Review/approve before sending
   - Rate-limited sending with delays

### P2 — Future

9. Media messages (photos, documents, voice)
10. Group chat support
11. Multi-account support
12. Analytics dashboard
13. Team collaboration (shared deal assignments)

## Technical Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Electron 33+ | Cross-platform desktop, Node.js + Chromium |
| UI | React 18 + TypeScript 5.5+ | Fast iteration, type safety |
| State | Zustand | Lightweight, no boilerplate |
| Styling | Tailwind CSS + shadcn/ui | Rapid development, consistent design |
| Telegram | GramJS (`telegram` npm) | Pure JS MTProto, battle-tested in Telegram Web A |
| Local DB | better-sqlite3 | Message cache, CRM state, offline access |
| Build | Vite + electron-builder | Fast HMR, cross-platform builds |

### Integration APIs

| Service | Protocol | Purpose |
|---------|----------|---------|
| Telegram | MTProto via GramJS | Messaging (main process) |
| Bitrix24 | REST API (HTTPS) | CRM data |
| Claude AI | Anthropic SDK | Message generation |

### Architecture Principles

- **GramJS in main process only** — heavy MTProto logic stays in Node.js
- **IPC via contextBridge** — secure communication, no nodeIntegration
- **Zustand stores** — single source of truth for UI state
- **Offline-first caching** — SQLite stores messages, deals for fast access
- **Anti-ban by design** — all Telegram calls rate-limited, delays configurable

### Session Strategy

```
api_id: 2040 (Telegram Desktop official)
api_hash: b18441a1ff607e10a989891a5462e627
device_model: Desktop
system_version: Windows 10
app_version: 5.12.1 x64
```

Session stored as encrypted file via GramJS StringSession.

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  [≡] Telegram CRM Client            [🔍] [⚙️]  │
├────────────┬─────────────────────┬───────────────┤
│            │                     │               │
│  Chat List │   Message View      │  CRM Panel    │
│  (250px)   │   (flexible)        │  (300px)      │
│            │                     │               │
│  Search    │  Messages           │  Deal Info    │
│  Dialogs   │  with timestamps    │  Stage/Value  │
│  Unread    │  and read status    │  Contact      │
│            │                     │  Notes        │
│            │  ┌─────────────┐   │               │
│  ───────── │  │ AI Composer │   │  Quick        │
│  CRM Nav   │  │ [Generate]  │   │  Actions      │
│  Pipeline  │  │ [Edit] [Send]│  │               │
│            │  └─────────────┘   │               │
└────────────┴─────────────────────┴───────────────┘
```

### Project Structure

```
telegram-crm-client/
├── .claude/
│   ├── agents/           # Claude Code agent definitions
│   ├── settings.json     # Hooks, permissions, MCP
│   └── commands/         # Custom slash commands
├── electron/
│   ├── main.ts           # Electron main process
│   ├── preload.ts        # Context bridge
│   └── ipc/              # IPC handlers (telegram, crm, claude, db)
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/       # React components
│   │   ├── auth/         # QR login, phone login
│   │   ├── chat/         # Chat list, messages, input
│   │   ├── crm/          # Deal panel, AI composer, pipeline
│   │   └── layout/       # Sidebar, main layout
│   ├── stores/           # Zustand state management
│   ├── lib/              # IPC wrappers, utilities
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript interfaces
├── CLAUDE.md             # Root project conventions
├── PRD.md                # This file
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## CRM Assistant Integration

This project shares infrastructure with the existing CRM Sales Assistant (Python/Telethon):

- **Same Bitrix24 instance** — unified deal/contact data
- **Same Claude prompts** — consistent AI tone and approach
- **Replaces Control Bot** — GUI instead of TG bot for operator workflow
- **Can share Telegram session** — or use separate account for safety

## Success Criteria

### MVP Done When:
- [ ] App launches, shows QR code, user scans → authorized
- [ ] Chat list loads with dialogs, unread counts
- [ ] Messages display correctly, can send text
- [ ] CRM sidebar shows deal info for matched contacts
- [ ] AI composer generates and sends messages
- [ ] Git repo with clean history, passing typecheck

### Quality Bar:
- TypeScript strict mode, no `any`
- ESLint + Prettier enforced
- All IPC calls typed end-to-end
- Rate limiting on all Telegram operations
- Graceful error handling (network failures, auth expiry)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Telegram account ban | High | TDesktop credentials, rate limiting, delays |
| GramJS API gaps | Medium | telegram-tt uses same lib, good reference |
| Electron bundle size | Low | ~150MB acceptable for desktop |
| Scope creep | Medium | Strict P0/P1/P2 prioritization |
| Bitrix24 API limits | Low | Cache locally, batch requests |
