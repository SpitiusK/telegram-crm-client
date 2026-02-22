# User Stories — Telegram CRM Client

## Epic 1: Authentication & Account Management

### US-1.1: QR Code Login
**As a** manager,
**I want to** scan a QR code with my phone to log into my Telegram account,
**so that** I don't need to enter phone numbers or wait for SMS codes.

**Acceptance Criteria:**
- App displays QR code on launch (if no active session)
- QR code refreshes automatically when expired
- After scanning, app shows "Connecting..." then loads chat list
- Session is persisted to disk — no re-login on restart
- Session appears as "Telegram Desktop" in active sessions

### US-1.2: Phone Number Login
**As a** manager,
**I want to** log in with my phone number as a fallback,
**so that** I can authenticate when QR scanning is unavailable.

**Acceptance Criteria:**
- Input phone number with country code selector
- Receive and enter verification code (SMS/Telegram)
- Handle 2FA: prompt for cloud password if enabled
- Handle email 2FA code if configured
- Error handling for wrong codes, flood wait, banned accounts

### US-1.3: Multi-Account Support
**As a** manager,
**I want to** connect multiple Telegram accounts simultaneously,
**so that** I can manage all client conversations from one window.

**Acceptance Criteria:**
- "Add Account" button in settings/sidebar
- Each account authenticates independently (QR or phone)
- Unified inbox: all messages from all accounts in one list
- Visual indicator showing which account a chat belongs to (colored dot/badge)
- Account switcher to filter by specific account
- Each account has its own session file and rate limiting
- Per-account settings (notification preferences, CRM linking)

### US-1.4: Session Management
**As a** manager,
**I want to** see and manage my active sessions,
**so that** I can disconnect accounts or troubleshoot auth issues.

**Acceptance Criteria:**
- List all connected accounts with status (online/connecting/error)
- Disconnect individual account
- Re-authenticate expired session without removing account
- Show last active time per account

---

## Epic 2: Messaging (Full Telegram Feature Parity)

### US-2.1: Chat List
**As a** manager,
**I want to** see all my dialogs with search and filters,
**so that** I can quickly find the right conversation.

**Acceptance Criteria:**
- List all dialogs: private chats, groups, channels, bots
- Show avatar, name, last message preview, timestamp, unread count
- Pin/unpin chats
- Archive chats
- Folder/filter support (All, Private, Groups, Channels, Bots)
- Search by contact name or message content
- Multi-account: unified list with account indicator, or per-account filter

### US-2.2: Message View
**As a** manager,
**I want to** read messages with full formatting and media,
**so that** I don't miss any context.

**Acceptance Criteria:**
- Text messages with markdown formatting (bold, italic, code, links)
- Photos and videos (thumbnails, full view, download)
- Documents/files (download, show file info)
- Voice messages (playback)
- Stickers and GIFs
- Reply threads (show quoted message)
- Forwarded messages (show origin)
- Reactions
- Read receipts (double check marks)
- Message timestamps
- Infinite scroll with lazy loading

### US-2.3: Send Messages
**As a** manager,
**I want to** send all types of messages,
**so that** I can communicate fully with clients.

**Acceptance Criteria:**
- Text with markdown formatting
- Photos (paste, drag-drop, file picker)
- Documents/files
- Voice messages (record in-app)
- Reply to specific message
- Forward messages
- Edit sent messages
- Delete messages (for me / for everyone)
- Emoji picker
- Sticker picker

### US-2.4: Notifications
**As a** manager,
**I want to** receive desktop notifications for new messages,
**so that** I don't miss client responses.

**Acceptance Criteria:**
- Native OS notifications (Windows toast)
- Sound alerts (configurable)
- Per-chat mute/unmute
- Badge count on taskbar icon
- Notification preview (show/hide message content)
- Do Not Disturb mode

### US-2.5: Contacts & Profile
**As a** manager,
**I want to** view contact profiles and manage my contacts,
**so that** I have full context about who I'm talking to.

**Acceptance Criteria:**
- View user profile (avatar, name, username, bio, phone)
- See shared media/files/links
- Block/unblock users
- View online status

### US-2.6: Groups & Channels
**As a** manager,
**I want to** participate in groups and channels,
**so that** I can use all Telegram features.

**Acceptance Criteria:**
- Read/send in groups
- View channel posts
- Group member list
- Admin actions (if admin)
- Create groups/channels

### US-2.7: Wallet
**As a** manager,
**I want to** access Telegram Wallet features,
**so that** I can handle payments within the app.

**Acceptance Criteria:**
- View wallet balance
- Send/receive TON or Stars
- Transaction history
- Payment requests

---

## Epic 3: CRM Integration (Bitrix24)

### US-3.1: CRM Sidebar
**As a** manager,
**I want to** see deal information alongside chat messages,
**so that** I have full business context while communicating.

**Acceptance Criteria:**
- When opening a chat, auto-match contact to Bitrix24 deal (by phone/username)
- Show deal panel: stage, value, contact name, company, notes
- Link to open deal in Bitrix24 web
- Show deal history (stage changes, comments)
- Manual search and link deal to chat if auto-match fails

### US-3.2: Deal Stage Management
**As a** manager,
**I want to** change deal stages directly from the app,
**so that** I don't need to switch to Bitrix24.

**Acceptance Criteria:**
- Dropdown to change deal stage (follows бустер.рф funnel)
- Confirmation before stage change
- Auto-update in Bitrix24 via API
- Log stage change with timestamp and reason

### US-3.3: Pipeline View
**As a** manager,
**I want to** see all my deals in a Kanban board,
**so that** I can visualize my sales pipeline.

**Acceptance Criteria:**
- Kanban columns = deal stages (бустер.рф funnel)
- Cards show: client name, value, last message date, days in stage
- Click card → open chat with that client
- Drag-and-drop to change stage
- Filter by account, date range, value
- Color coding for overdue deals (> stage time limit)

### US-3.4: Quick Actions
**As a** manager,
**I want to** perform CRM actions without leaving the chat,
**so that** my workflow is seamless.

**Acceptance Criteria:**
- Add note to deal
- Schedule follow-up (reminder)
- Mark as "no response" / "refused" / "interested"
- Log call/meeting
- Create new deal from chat

---

## Epic 4: AI Composer (Claude)

### US-4.1: Message Suggestions
**As a** manager,
**I want to** get AI-generated message suggestions based on context,
**so that** I can respond faster and more effectively.

**Acceptance Criteria:**
- "Suggest" button in message input area
- AI considers: deal stage, last N messages, contact info, бустер.рф scripts
- Shows 1-3 suggestions to choose from
- Edit suggestion before sending
- Send directly or copy to clipboard
- Remember which suggestions were used (feedback loop)

### US-4.2: Tone & Template Control
**As a** manager,
**I want to** control the AI's communication style,
**so that** messages match my approach.

**Acceptance Criteria:**
- Tone selector: formal, friendly, persuasive, brief
- Template library by deal stage
- Custom prompt instructions per account
- Variable substitution (client name, project, test results)

### US-4.3: Conversation Analysis
**As a** manager,
**I want to** get AI analysis of client conversations,
**so that** I understand sentiment and next steps.

**Acceptance Criteria:**
- "Analyze" button on chat view
- Shows: client sentiment, key topics, suggested next action
- Highlights unanswered questions
- Detects buying signals / objections

---

## Epic 5: Activity Logging & Analytics

### US-5.1: Local Activity Log
**As a** manager,
**I want to** have all my CRM actions logged automatically,
**so that** I can review my work and generate reports.

**Acceptance Criteria:**
- SQLite stores: sent messages, stage changes, AI suggestions used, notes
- Log includes: timestamp, account, contact, action type, details
- Browsable log view in app
- Export to CSV/JSON

### US-5.2: Dashboard
**As a** manager,
**I want to** see my daily/weekly stats,
**so that** I can track my performance.

**Acceptance Criteria:**
- Messages sent today/week
- Deals moved forward
- Response rate
- Average response time
- Deals by stage distribution

---

## Epic 6: Message Storage & RAG (Future)

### US-6.1: Message Archive
**As a** manager,
**I want to** have all messages stored locally with full-text search,
**so that** I can find any past conversation.

**Acceptance Criteria:**
- All messages from all accounts stored in SQLite
- Full-text search (FTS5) across all messages
- Filter by account, contact, date range, message type
- Search results show message in context (surrounding messages)

### US-6.2: RAG Memory
**As a** system,
**I want to** build a semantic memory from stored messages,
**so that** AI suggestions are informed by full conversation history.

**Acceptance Criteria:**
- Messages chunked and embedded (local embedding model or API)
- Vector index stored alongside SQLite (sqlite-vec or separate)
- AI composer queries RAG for relevant past conversations
- RAG considers: same client history, similar deal stage conversations, successful message patterns
- Configurable retention and indexing frequency
- Privacy: all data stays local, no cloud upload

### US-6.3: Knowledge Base
**As a** manager,
**I want to** build a searchable knowledge base from conversations,
**so that** best practices and common answers are easily accessible.

**Acceptance Criteria:**
- Mark messages as "knowledge" (FAQ answers, objection handling, etc.)
- Tagged and categorized
- Searchable from AI composer
- Auto-suggest relevant knowledge during conversation
