# Task List — Telegram CRM Client

## Phase 0: Architecture & Design ✅ PARTIAL

### 0.1 Architecture Documentation
- [x] **DDD Domain Model** — `docs/architecture/domain-model.md`
- [ ] **Hexagonal Architecture** — skipped (code follows pattern)
- [x] **IPC Contract** — types in `src/types/index.ts`
- [x] **Database Schema** — `electron/database/migrations/001_initial.ts`
- [ ] **Multi-Account Architecture** — deferred to P2
- [ ] **RAG Architecture** — deferred to Phase 7

### 0.2 Atomic Design Component Catalog
- [x] **Atoms** — `docs/components/atoms.md`
- [x] **Templates** — `docs/components/templates.md`
- [x] **Components implemented** — 20 components across auth/chat/crm/layout

### 0.3 TDD Test Strategy
- [ ] **Test Plan** — deferred
- [ ] **Mock Strategy** — deferred
- [x] **Test infrastructure** — Vitest configured, Playwright configured

---

## Phase 1: Project Scaffold ✅ COMPLETE

- [x] Initialize git repo with proper .gitignore
- [x] Configure TypeScript (strict mode, paths aliases @/, @electron/)
- [x] Configure Vite + Electron (dev + build verified)
- [x] Configure Tailwind + PostCSS (dark mode, telegram/crm theme)
- [x] Configure ESLint + Prettier ✅ NEW
- [x] Configure Vitest + Testing Library
- [x] Configure electron-builder (Windows)
- [x] Set up project structure (DDD layers)
- [x] Create .env.example

---

## Phase 2: Core Infrastructure ✅ COMPLETE

- [x] **SQLite Schema** — migration system + accounts/chats/messages/deals/contacts/activity_log/settings
- [x] **IPC Layer** — fully typed preload + renderer wrappers
- [x] **Domain Layer** — `electron/domain/types.ts` + `src/types/index.ts`
- [x] **Electron Main** — window management, DB init, IPC registration, error handling

---

## Phase 3: Authentication ✅ COMPLETE

- [x] QR code login flow
- [x] Phone + code login flow
- [x] **2FA cloud password** ✅ NEW — real GramJS SRP implementation
- [x] Session persistence (SQLite-backed)
- [x] Auth state machine (idle → qr/phone → 2fa → authenticated)
- [x] Auth UI (auth-screen, qr-login, phone-login, two-factor)
- [x] Logout
- [ ] Multi-account — deferred to P2

---

## Phase 4: Messaging ✅ COMPLETE

- [x] Load dialog list with search
- [x] Display messages (text, media)
- [x] Send text messages (with rate limiting 1-2s)
- [x] **Real-time updates** ✅ NEW — live new messages, dialog reorder
- [x] **Mark as read** ✅ NEW — auto-marks on chat open
- [ ] Message search (FTS5) — deferred
- [x] Chat list UI (sidebar, search, items)
- [x] Message view UI (bubbles, input, auto-scroll)

---

## Phase 5: CRM Integration ✅ COMPLETE

- [x] Bitrix24 API client
- [x] Auto-match contact to deal by phone
- [x] CRM sidebar panel
- [x] Deal stage management (with бустер.рф funnel stages)
- [x] **Pipeline/Kanban view** ✅ NEW — 6 columns, deal cards
- [x] Quick actions (Open in Bitrix24)

---

## Phase 6: AI Composer ✅ COMPLETE

- [x] Claude API integration
- [x] Context builder (deal stage + chat history)
- [x] Message suggestion generation (3 variants)
- [x] Tone control (professional/friendly/urgent)
- [ ] Conversation analysis — deferred

---

## Phase 7: Storage & RAG — DEFERRED

- [x] Message caching (SQLite)
- [ ] Full-text search (FTS5)
- [ ] Embedding pipeline
- [ ] RAG query integration
- [ ] Knowledge base tagging

---

## Phase 8: Polish — PARTIAL

- [ ] Desktop notifications
- [ ] Media sending
- [ ] Wallet section
- [x] **Activity log** ✅ NEW — filterable log view with entry types
- [ ] Performance optimization
- [x] Production build verified
- [x] **ESLint + Prettier** ✅ NEW — flat config, TypeScript strict rules

---

## Stats

- **3300+ lines** TypeScript across 42 files
- **20 React components** (auth, chat, CRM, layout)
- **4 Zustand stores** (auth, chats, crm, ui)
- **3 views** (Chats, Pipeline, Activity)
- **0 TypeScript errors** — `tsc --noEmit` clean
- **Clean build** — renderer + main + preload

## What Works (MVP)

1. ✅ App launches with auth screen (QR / phone / 2FA)
2. ✅ Chat list with search, unread badges, timestamps
3. ✅ Real-time message updates
4. ✅ Send messages with rate limiting
5. ✅ CRM sidebar with deal info and stage colors
6. ✅ AI composer (Claude) with 3 tone variants
7. ✅ Pipeline kanban board (бустер.рф funnel)
8. ✅ Activity log with filters
9. ✅ Session persistence across restarts
10. ✅ Dark Telegram theme

## Deferred

- Multi-account support
- FTS5 / RAG pipeline
- Desktop notifications
- Media sending
- Unit tests
- Conversation analysis
