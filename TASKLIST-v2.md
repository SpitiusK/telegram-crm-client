# TASKLIST v2 — Telegram Functionality Refinement

Based on deep analysis of Telegram Desktop UI, MTProto API, and current codebase gaps.

---

## 🔴 P0 — Critical Bugs (Broken Functionality)

### 1. Forum Topics (Группы с топиками)
Groups with forum mode enabled (e.g. "flood", "general", "important") show as a flat chat but topics are invisible.

- [ ] **Detect forum groups** — check `channel.forum` flag in dialogs
- [ ] **Load topics list** — `channels.getForumTopics()` API call
- [ ] **Topic list UI** — when opening a forum group, show list of topics instead of flat messages
- [ ] **Topic view** — clicking a topic loads messages for that specific topic (using `replyTo.forum_topic` / `replyTo.reply_to_top_id`)
- [ ] **Topic indicators in chat list** — show topic name in last message preview
- [ ] **IPC: `telegram:getForumTopics(chatId)`** — new handler
- [ ] **IPC: `telegram:getTopicMessages(chatId, topicId)`** — new handler

### 2. Image Display Issues
Images in chat are too large and not clickable.

- [ ] **Thumbnail sizing** — limit photo width to max 300px, height proportional
- [ ] **Click to expand** — fullscreen lightbox/modal on image click
- [ ] **Lightbox component** — overlay with image, close button, zoom
- [ ] **Image loading state** — show placeholder/spinner while base64 loads
- [ ] **Progressive loading** — load thumbnail first (small), full image on click

### 3. Scroll Position
Chat scrolls to bottom every time you open it, losing position.

- [ ] **Remember scroll position** — save per-chat scroll offset in store
- [ ] **Restore on re-enter** — when returning to a chat, scroll to saved position
- [ ] **Scroll to bottom only** on first open or when new messages arrive while at bottom
- [ ] **"Scroll to bottom" FAB** — floating button when scrolled up, with unread count badge
- [ ] **Date separator sticky header** — show date while scrolling through messages

---

## 🟡 P1 — Missing Core Telegram Features

### 4. Message Types & Formatting
Current: only plain text and basic photo/document.

- [ ] **Stickers** — display webp/tgs/webm stickers inline (image for webp, animated for tgs)
- [ ] **GIFs** — auto-play gif messages
- [ ] **Voice messages** — audio player with waveform, duration
- [ ] **Video messages** (round) — circular video player
- [ ] **Video files** — video player with controls
- [ ] **Links preview** — show webpage preview (title, description, image) from `MessageMediaWebPage`
- [ ] **Message formatting** — bold, italic, code, spoiler, strikethrough (parse entities from `message.entities`)
- [ ] **Reply quotes** — show replied message preview above the message
- [ ] **Forwarded messages** — show "Forwarded from X" header
- [ ] **Edited indicator** — show "edited" label on modified messages
- [ ] **Pinned messages** — show pinned message bar at top of chat
- [ ] **Message reactions** — display reaction emoji under messages
- [ ] **Polls** — render poll questions with vote bars
- [ ] **Contact cards** — display shared contact info
- [ ] **Location messages** — show map/coordinates
- [ ] **File download** — ability to download/save documents and media

### 5. Message Input Enhancements
Current: plain text only.

- [ ] **Reply to message** — click reply → shows reply preview above input
- [ ] **Edit message** — click edit on own message → loads text into input
- [ ] **Delete message** — context menu with delete option
- [ ] **Forward message** — context menu → forward to another chat
- [ ] **Emoji picker** — emoji panel button next to input
- [ ] **File/photo attachment** — attach button → file picker
- [ ] **Voice recording** — hold mic button to record voice
- [ ] **Paste images** — paste from clipboard sends as photo
- [ ] **Draft messages** — save unsent text per chat, restore when returning
- [ ] **Typing indicator** — show "X is typing..." in chat header
- [ ] **Send as... (in groups)** — select which identity to send as

### 6. Chat List Enhancements
Current: flat list with basic info.

- [ ] **Chat folders/filters** — tabs at top (All, Personal, Groups, Channels, Bots, etc.)
- [ ] **Pinned chats** — pinned chats at top with divider
- [ ] **Archived chats** — archive section
- [ ] **Chat context menu** — right-click: pin, mute, archive, delete, mark read
- [ ] **Muted chats** — muted indicator icon, gray unread badge
- [ ] **Online status dots** — green dot on avatar for online users
- [ ] **Typing in chat list** — "typing..." instead of last message when someone types
- [ ] **Last message sender name** — "You: ..." or "John: ..." prefix in group chats
- [ ] **Draft indicator** — show "Draft: ..." in red in chat list if draft exists
- [ ] **Unread mention badge** — separate @ badge for mentions

### 7. User Presence & Status
- [ ] **Online/offline status** — real-time via `UpdateUserStatus`
- [ ] **Last seen** — "last seen recently", "last seen within a week", exact time
- [ ] **Typing status** — `UpdateUserTyping` event handling
- [ ] **Member count** — show in group header
- [ ] **Online member count** — "X members, Y online" in group header

### 8. Settings Page
- [ ] **Settings view** — accessible from nav or hamburger menu
- [ ] **Profile section** — your name, username, phone, avatar
- [ ] **Notifications** — enable/disable, sound settings
- [ ] **Appearance** — theme toggle (dark/light), font size
- [ ] **Data & storage** — cache size, auto-download settings
- [ ] **Sessions** — view active sessions, terminate others
- [ ] **Language** — language selector
- [ ] **Proxy settings** — SOCKS5/MTProto proxy config
- [ ] **About** — app version, links

---

## 🟢 P2 — Polish & Desktop Integration

### 9. Desktop Notifications
- [ ] **System notifications** — new message notification via Electron `Notification` API
- [ ] **Notification click** — focus app and navigate to chat
- [ ] **Notification sound** — configurable sound
- [ ] **Do Not Disturb** — respect system DND settings
- [ ] **Badge count** — show unread count on taskbar icon
- [ ] **Tray icon** — minimize to tray, show unread badge

### 10. Media Viewer
- [ ] **Full media viewer** — modal/lightbox for photos, videos, documents
- [ ] **Navigate between media** — prev/next arrows within chat media
- [ ] **Download button** — save to disk
- [ ] **Zoom** — mouse wheel zoom for photos
- [ ] **Video player** — play/pause, seek, fullscreen, volume

### 11. Search
- [ ] **Global search** — search across all chats (messages, contacts, channels)
- [ ] **In-chat search** — search within current chat, highlight results
- [ ] **Search by date** — jump to specific date in chat
- [ ] **Message navigation** — click search result → scroll to message

### 12. Multi-Account
- [ ] **Account switcher** — add/remove accounts in sidebar
- [ ] **Session isolation** — separate GramJS client per account
- [ ] **Unified inbox** — optional merged chat list
- [ ] **Account indicator** — colored dot showing which account a chat belongs to
- [ ] **Per-account settings** — separate notification settings

### 13. Keyboard Shortcuts
- [ ] `Esc` — close panel/dialog, deselect chat
- [ ] `Ctrl+F` — search in chat
- [ ] `Ctrl+K` — global search
- [ ] `Up arrow` — edit last message
- [ ] `Ctrl+Shift+M` — mute/unmute chat
- [ ] `Alt+Up/Down` — navigate chats
- [ ] `Ctrl+Tab` — switch between chat folders

### 14. Context Menus
- [ ] **Message context menu** — reply, edit, delete, forward, copy, pin, select
- [ ] **Chat context menu** — pin, mute, archive, delete, mark as read
- [ ] **Link context menu** — open, copy URL
- [ ] **Image context menu** — save, copy, open
- [ ] **Text selection** — select text within message bubble

### 15. Performance
- [ ] **Virtualized message list** — render only visible messages (react-virtuoso or similar)
- [ ] **Lazy avatar loading** — load avatars as they scroll into view
- [ ] **Message pagination** — load more on scroll up, don't load all at once
- [ ] **Image lazy loading** — load images only when near viewport
- [ ] **SQLite message cache** — load from cache first, then fetch updates from server
- [ ] **Debounced search** — don't search on every keystroke

---

## Implementation Priority

| Phase | Tasks | Est. Effort |
|-------|-------|-------------|
| **v2.1** | P0 #1-3 (forum topics, image sizing, scroll) | 2-3 days |
| **v2.2** | P1 #4 (message types) + #5 (input enhancements) | 3-4 days |
| **v2.3** | P1 #6 (chat list) + #7 (presence) + #8 (settings) | 2-3 days |
| **v2.4** | P2 #9 (notifications) + #10 (media viewer) + #11 (search) | 2-3 days |
| **v2.5** | P2 #12-15 (multi-account, shortcuts, performance) | 3-4 days |

Total estimated: **12-17 days** for full Telegram Desktop parity.

---

## GramJS API Methods Needed

| Feature | GramJS Method |
|---------|---------------|
| Forum topics | `client.invoke(GetForumTopics)` |
| Topic messages | `client.getMessages(entity, { replyTo: topicId })` |
| Typing indicator | `UpdateUserTyping` event |
| Online status | `UpdateUserStatus` event |
| Chat folders | `client.invoke(GetDialogFilters)` |
| Pinned messages | `message.pinned` flag |
| Reactions | `message.reactions` |
| Message edit | `client.editMessage()` |
| Message delete | `client.deleteMessages()` |
| Forward | `client.forwardMessages()` |
| Sticker download | `client.downloadMedia(stickerDoc)` |
| Voice message | `client.downloadMedia(audioDoc)` |
| Read stories | `client.invoke(ReadStories)` |
| Search messages | `client.invoke(SearchMessages)` |

---

## Current Codebase Stats (for reference)
- 42 files, 3300+ lines TypeScript
- 0 TypeScript errors
- Electron 33 + React 18 + GramJS + Zustand + Tailwind
