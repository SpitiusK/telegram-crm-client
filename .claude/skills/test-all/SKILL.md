---
name: test-all
description: Run comprehensive interactive UI tests across all components using parallel playwright-tester agents. Covers auth, chat, CRM, settings, multi-account, emoji, and keyboard accessibility — ~197 test cases total.
---

# Comprehensive UI Test Suite

Run **197 interactive test cases** across 8 parallel pipelines using `playwright-tester` agents. Each pipeline targets a specific UI domain and executes tests against the live app via Playwright MCP tools.

**No source code is modified. No test files are written to disk. Pure interactive MCP-based testing.**

## Prerequisites

1. Electron app must be running via `npx pnpm dev` (Playwright connects to Electron's renderer via CDP on port 9222)
2. App must be authenticated (logged in) — Pipelines 2-8 require the MAIN state
3. Do NOT start or stop the Electron app — just test against it

## Phase 1: State Detection

Before launching pipelines, detect the current app state. Playwright MCP connects to Electron via CDP (port 9222), so the page is already loaded — no navigation needed.

```
1. browser_snapshot → read page content (already connected to Electron renderer)
2. Classify:
   - If snapshot contains "Telegram CRM" + "Sign in" + "QR Code" → STATE = AUTH
   - If snapshot contains "Chats" + "Pipeline" + "Activity" → STATE = MAIN
   - If snapshot contains "Loading..." → wait 3s, re-snapshot
   - Otherwise → STATE = UNKNOWN (report and abort)
```

Report the detected state to the user before proceeding.

## Phase 2: Launch Pipelines

Spawn **up to 8 `playwright-tester` agents in parallel** using the Task tool. Each agent gets a self-contained prompt from the pipeline definitions below.

**State routing:**
- Pipeline 1 (Auth): runs if STATE = AUTH; if STATE = MAIN, test only settings-based logout button visibility
- Pipelines 2-8: run if STATE = MAIN; if STATE = AUTH, report BLOCKED (user needs to log in via Electron first)

**Launch pattern:**
```
Task tool call for each pipeline:
  - subagent_type: "playwright-tester"
  - description: "Pipeline N: [name]"
  - prompt: [full pipeline prompt from below]
```

Launch all applicable pipelines in a **single message with multiple Task tool calls** for maximum parallelism.

## Phase 3: Aggregate Results

After all agents return, compile a summary:

```
## Test Suite Results

| # | Pipeline | Tests | Passed | Failed | Skipped | Status |
|---|----------|-------|--------|--------|---------|--------|
| 1 | Auth Flow | 17 | ... | ... | ... | ... |
| 2 | Chat Sidebar & Navigation | 35 | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... | ... |

**Total: 197 tests | X passed | Y failed | Z skipped**

### Failures
[List each failed test with: pipeline, test #, step, expected vs actual]

### Console Errors
[List any console errors caught during testing]
```

---

## Pipeline Definitions

Each pipeline below is a complete, self-contained prompt to pass to a `playwright-tester` agent.

---

### Pipeline 1: Auth Flow (17 tests)

**Prompt for agent:**

```
You are testing the AUTH FLOW of Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test all authentication-related UI.

Read these source files first to understand expected behavior:
- src/components/auth/auth-screen.tsx
- src/components/auth/qr-login.tsx
- src/components/auth/phone-login.tsx
- src/components/auth/two-factor.tsx
- src/stores/auth.ts

COMPONENTS TESTED: AuthScreen, QRLogin, PhoneLogin, TwoFactor

Execute these tests. For each: snapshot, act, verify, check console errors, record PASS/FAIL.

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | Auth screen renders | Navigate to app, snapshot | Card with "Telegram CRM" title visible, "Sign in to your Telegram account" description | — |
| 2 | QR tab is default | Snapshot auth screen | "QR Code" tab is selected/active, QR content area visible | — |
| 3 | Phone tab switch | Click "Phone Number" tab | Phone input form appears, QR content hidden | — |
| 4 | QR tab switch back | Click "QR Code" tab | QR content reappears, phone form hidden | — |
| 5 | Rapid tab switching | Click QR→Phone→QR→Phone→QR 5 times fast | No crash, final state matches last clicked tab | Stress test for race conditions |
| 6 | Phone input renders | Switch to Phone tab, snapshot | Phone number input field with country code, "Send Code" or similar submit button | — |
| 7 | Phone empty submit | Click submit with empty phone field | Button should be disabled or show validation error, no API call | — |
| 8 | Phone invalid format | Type "abc" into phone field, attempt submit | Validation error or no submission | Non-numeric input |
| 9 | Phone special chars | Type "+1 (555) 123-4567" into phone field | Input accepts or sanitizes phone format | Formatted phone number |
| 10 | Phone XSS attempt | Type "<script>alert(1)</script>" into phone field | Text displayed as literal text, no script execution | XSS prevention |
| 11 | Phone Cyrillic input | Type "телефон" into phone field | No crash, input displays text (validation may reject) | Unicode handling |
| 12 | QR code display area | On QR tab, snapshot QR area | QR code image or placeholder/loading spinner visible | — |
| 13 | Auth card styling | Snapshot card element | Card has shadow, centered on screen, ~400px width | Design consistency |
| 14 | Tab list full width | Snapshot TabsList | Both tabs span full width of card equally | Layout check |
| 15 | 2FA screen (if reachable) | If 2FA state accessible, verify render | "Enter your cloud password" description, password input visible | May be unreachable without real auth |
| 16 | Add Account mode | If isAddingAccount state accessible, verify | Title shows "Add Account", Cancel button visible | Requires store state |
| 17 | Cancel add account button | If Cancel button visible, click it | Returns to previous state, button disappears | — |

If the app is logged in (MAIN state), test ONLY:
- Navigate to Settings (click Settings button)
- Verify "Log Out" button exists in Settings → About section
- Verify profile info displays correctly
- Report remaining auth tests as SKIPPED (app is logged in, cannot test auth UI)

Provide results in this format:
## Test Results: Pipeline 1 — Auth Flow

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 17 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

### Pipeline 2: Chat Sidebar & Navigation (35 tests)

**Prompt for agent:**

```
You are testing the CHAT SIDEBAR & NAVIGATION of Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test the sidebar, folder tabs, search, and navigation.

Read these source files first:
- src/components/layout/main-layout.tsx
- src/components/chat/chat-sidebar.tsx
- src/components/chat/chat-list-item.tsx
- src/components/chat/account-switcher.tsx
- src/components/chat/chat-context-menu.tsx
- src/components/chat/search-results.tsx
- src/stores/chats.ts
- src/stores/ui.ts

COMPONENTS TESTED: MainLayout, ChatSidebar, ChatListItem, AccountSwitcher, ChatContextMenu, SearchResultItem

PRECONDITION: App must be logged in (MAIN state). If auth screen shows, report ALL tests as BLOCKED.

Execute these tests:

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | Top nav bar renders | Snapshot top bar | "Chats", "Pipeline", "Activity" buttons visible, Settings gear icon | — |
| 2 | Chats view is default | Snapshot | "Chats" button has active/default variant styling | — |
| 3 | Switch to Pipeline | Click "Pipeline" button | Pipeline view renders, chat sidebar hidden | — |
| 4 | Switch to Activity | Click "Activity" button | Activity log view renders | — |
| 5 | Switch back to Chats | Click "Chats" button | Chat sidebar + chat view restored | — |
| 6 | Rapid view switching | Click Chats→Pipeline→Activity→Chats→Pipeline 10x fast | No crash, final view matches last click | Stress test |
| 7 | Sidebar renders | Snapshot sidebar area | Search input, folder tabs, dialog list visible | — |
| 8 | Sidebar search input | Snapshot search area | Input with "Search" placeholder, search icon | — |
| 9 | Search focus with Ctrl+K | Press Ctrl+K | Sidebar search input is focused | Keyboard shortcut |
| 10 | Search focus with Ctrl+F | Press Ctrl+F | Sidebar search input is focused | Alternative shortcut |
| 11 | Type in search | Type "test" in search input | Input shows "test", clear button (X) appears | — |
| 12 | Clear search button | Click X button after typing | Search cleared, X button disappears | — |
| 13 | Search with Escape | Type text, press Escape | Search input cleared | — |
| 14 | Search with emoji | Type "😀" in search | No crash, emoji displayed in input | Unicode search |
| 15 | Search with Cyrillic | Type "Привет" in search | No crash, text displayed correctly | Cyrillic input |
| 16 | Search XSS attempt | Type "<script>alert(1)</script>" | Literal text displayed, no execution | XSS prevention |
| 17 | Search triggers after 3 chars | Type "abc" and wait 500ms | Search results section may appear (or "No messages found") | Debounce behavior |
| 18 | Short search no trigger | Type "ab" only | No search results section, only local filtering | Minimum 3 chars |
| 19 | Folder tabs render | Snapshot folder tab area | "All" tab visible and active by default, plus other built-in tabs | — |
| 20 | Switch folder tab | Click a different folder tab (e.g., "Groups" if visible) | Tab becomes active, dialog list filters | — |
| 21 | Archive tab | Click "Archive" tab | Archive tab active, may show loading or archived chats | — |
| 22 | Switch back to All | Click "All" tab | All dialogs shown again | — |
| 23 | Dialog list renders | Snapshot dialog list | At least one chat item with title, last message preview, timestamp | — |
| 24 | Click a dialog | Click first chat in list | Chat opens in ChatView (right panel shows messages or "Select a chat") | — |
| 25 | Active dialog highlight | After clicking dialog, snapshot sidebar | Clicked dialog has active/highlighted styling | — |
| 26 | Double-click dialog | Double-click a chat list item | No crash, chat opens (same as single click) | Double-click handling |
| 27 | Right-click dialog (context menu) | Right-click a chat list item | Context menu appears with options (pin, mute, etc.) | — |
| 28 | Context menu near bottom edge | Right-click the last visible dialog | Context menu repositions to stay within viewport | Edge positioning |
| 29 | Close context menu | Press Escape or click outside after opening context menu | Context menu closes | — |
| 30 | Navigate chats Alt+Down | Press Alt+ArrowDown | Next chat in list becomes active | Keyboard navigation |
| 31 | Navigate chats Alt+Up | Press Alt+ArrowUp | Previous chat becomes active | Keyboard navigation |
| 32 | Settings button in sidebar | Snapshot sidebar footer | Settings button visible at bottom | — |
| 33 | Click sidebar Settings | Click Settings button in sidebar footer | Settings view opens | — |
| 34 | Close settings Escape | Press Escape while in Settings | Settings closes, returns to chat view | — |
| 35 | "No chats" empty state | If a folder has 0 dialogs, switch to it | "No chats yet" message displayed | Empty state |

Provide results in this format:
## Test Results: Pipeline 2 — Chat Sidebar & Navigation

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 35 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

### Pipeline 3: Message View & Composition (45 tests)

**Prompt for agent:**

```
You are testing MESSAGE VIEW & COMPOSITION in Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test the chat message display, input, reply, edit, and forum topics.

Read these source files first:
- src/components/chat/chat-view.tsx
- src/components/chat/chat-header.tsx
- src/components/chat/message-list.tsx
- src/components/chat/message-bubble.tsx
- src/components/chat/message-input.tsx
- src/components/chat/input-reply-preview.tsx
- src/components/chat/message-context-menu.tsx
- src/components/chat/forum-topics-list.tsx
- src/components/chat/chat-search-bar.tsx
- src/components/chat/formatted-text.tsx
- src/hooks/use-message-input.ts
- src/stores/chats.ts

COMPONENTS TESTED: ChatView, ChatHeader, MessageList, MessageBubble, MessageInput, InputReplyPreview, MessageContextMenu, ForumTopicsList, ChatSearchBar, FormattedText

PRECONDITION: App must be logged in with at least one chat available. If auth screen shows, report ALL as BLOCKED.

Execute these tests:

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | Empty chat view | If no chat selected, snapshot main area | "Select a chat to start messaging" placeholder with message icon | — |
| 2 | Open a chat | Click any dialog in sidebar | Chat header appears with avatar, name, status subtitle | — |
| 3 | Chat header avatar | Snapshot header | Avatar with initials or image, chat title displayed | — |
| 4 | Chat header click (profile) | Click on chat header area (name/avatar) | User profile panel opens on right side | — |
| 5 | Close profile panel | Click close on profile panel or click header again | Profile panel closes | — |
| 6 | Messages render | Snapshot message area | At least one message bubble visible with text and timestamp | — |
| 7 | Message bubble outgoing | Find an outgoing message | Different background color than incoming (bg-telegram-message-out vs bg-card) | — |
| 8 | Message bubble incoming | Find an incoming message | Sender name visible (for groups), standard bg-card styling | — |
| 9 | Message input renders | Snapshot input area | Textarea with "Write a message..." placeholder, emoji button, send button | — |
| 10 | Send button disabled empty | Snapshot send button with empty input | Send button is disabled | — |
| 11 | Type in message input | Type "Hello" in textarea | Text appears, send button becomes enabled | — |
| 12 | Clear message input | Select all + delete in textarea | Input empty, send button disabled again | — |
| 13 | Very long message | Type 1000+ character string | Textarea expands vertically, no overflow/crash | Long content handling |
| 14 | Whitespace-only message | Type "   " (spaces only) | Send button remains disabled (text.trim() is empty) | Edge: whitespace |
| 15 | Newline-only message | Press Enter without Shift (may send), or Shift+Enter for newlines | Appropriate behavior per key combo | — |
| 16 | Multi-line input | Press Shift+Enter to add lines | Textarea grows to accommodate multiple lines | — |
| 17 | Emoji in message | Type or paste emoji "😀" in input | Emoji displays correctly in textarea | Unicode |
| 18 | Cyrillic message | Type "Привет, мир!" | Text displays correctly | Cyrillic support |
| 19 | Message with XSS | Type "<img src=x onerror=alert(1)>" | Literal text in input, no script execution | XSS prevention |
| 20 | Right-click message (context menu) | Right-click on a message bubble | Context menu appears with Reply, Copy, Edit (if own), Delete options | — |
| 21 | Context menu Reply option | Click "Reply" in message context menu | Reply preview appears above input with quoted message | — |
| 22 | Reply preview renders | After selecting reply, snapshot input area | InputReplyPreview shows original message text, close button | — |
| 23 | Cancel reply | Click close/X on reply preview | Reply preview disappears | — |
| 24 | Cancel reply with Escape | Press Escape while reply is active | Reply preview dismissed (after settings/search priority) | Escape chain |
| 25 | Context menu Copy | Click "Copy" in context menu | Text copied to clipboard (verify no crash) | — |
| 26 | Context menu Edit (own msg) | Right-click own message, click "Edit" | Input switches to edit mode, message text loaded, check icon replaces send | — |
| 27 | Cancel edit with Escape | Press Escape while editing | Edit mode cancelled, original text restored in input | Escape chain |
| 28 | Edit mode indicator | While editing, snapshot input | Check icon (not send), original text in textarea | — |
| 29 | In-chat search toggle | Click search icon in chat header | ChatSearchBar appears below header | — |
| 30 | In-chat search Ctrl+Shift+F | Press Ctrl+Shift+F | In-chat search bar toggles | Keyboard shortcut |
| 31 | In-chat search close | Click close on search bar or press Escape | Search bar closes | — |
| 32 | In-chat search type | Type query in chat search bar | Search executes, results navigate | — |
| 33 | Draft persistence setup | Type "draft text" in chat A input, do NOT send | Text remains in input | Setup for next test |
| 34 | Draft survives chat switch | Switch to chat B, then back to chat A | "draft text" should persist in input (or be cleared — verify behavior) | Draft persistence |
| 35 | Rapid chat switching with draft | Type text, switch chats 5 times quickly | No crash, input state consistent | Race condition test |
| 36 | Message list scroll | Scroll up in message list | Older messages visible, smooth scrolling | — |
| 37 | Message list auto-scroll | Snapshot bottom of message list | Most recent message visible at bottom | — |
| 38 | Emoji button in input | Click emoji button (smiley face) | Emoji picker opens above input | — |
| 39 | Attachment button | Click attachment/paperclip button | Attachment menu opens | — |
| 40 | Toggle emoji then attachment | Open emoji picker, then click attachment | Emoji picker closes, attachment menu opens | Mutual exclusion |
| 41 | Toggle attachment then emoji | Open attachment menu, then click emoji | Attachment closes, emoji picker opens | Mutual exclusion |
| 42 | Forum topics list | If a forum chat exists, click it | ForumTopicsList renders with topic titles | Forum support |
| 43 | Forum topic enter | Click a topic in ForumTopicsList | Messages for that topic load, back button appears in header | — |
| 44 | Forum topic back | Click back button in header | Returns to topic list | — |
| 45 | Forum topic navigate different | Enter topic A, back, enter topic B | Topic B messages load correctly | Topic switching |

Provide results in this format:
## Test Results: Pipeline 3 — Message View & Composition

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 45 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

### Pipeline 4: Emoji Picker & Attachments (17 tests)

**Prompt for agent:**

```
You are testing the EMOJI PICKER & ATTACHMENTS in Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test emoji selection, categories, search, recent persistence, and attachment menu.

Read these source files first:
- src/components/chat/emoji-picker.tsx
- src/components/chat/attachment-menu.tsx
- src/components/chat/image-lightbox.tsx
- src/components/chat/message-input.tsx
- src/hooks/use-message-input.ts

COMPONENTS TESTED: EmojiPicker, AttachmentMenu, ImageLightbox

PRECONDITION: App must be logged in with a chat open. If auth screen, report ALL as BLOCKED. If no chat selected, click the first dialog to open one.

Execute these tests:

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | Open emoji picker | Click emoji button (smiley face icon) | Emoji picker panel appears above input, search input auto-focused | — |
| 2 | Emoji picker structure | Snapshot picker | Search input, category tabs (Smileys, Gestures, Hearts, Animals, Food, Objects), emoji grid | — |
| 3 | Default category | Snapshot emoji grid without changing tab | "Smileys" category label, emoji grid shows smiley emojis | — |
| 4 | Switch category | Click "Gestures" tab (hand icon) | Grid updates to show gesture emojis, "Gestures" label | — |
| 5 | Switch all categories | Click through all 6 category tabs | Each tab shows correct emojis, no crash | Full coverage |
| 6 | Search emoji by category | Type "Hearts" in search input | Only heart emojis displayed (filters by category label match) | — |
| 7 | Search no results | Type "xyznonexistent" in search | Empty grid, no crash | No match |
| 8 | Search clears on empty | Clear search input | Full category grid returns, category tabs reappear | — |
| 9 | Select emoji | Click any emoji in grid | Emoji inserted into message input, picker may close | — |
| 10 | Recent emojis appear | After selecting an emoji, reopen picker | "Recent" tab appears (clock icon) at start of tabs | Requires prior selection |
| 11 | Recent emojis persist | Close picker, reopen | Recent tab still shows previously selected emoji | localStorage persistence |
| 12 | Recent max 20 | Select 21 different emojis | Recent list shows max 20, oldest dropped | MAX_RECENT = 20 |
| 13 | Close picker Escape | Press Escape while picker is open | Picker closes | — |
| 14 | Close picker click outside | Click outside the picker panel | Picker closes (mousedown handler) | — |
| 15 | Ctrl+E toggle | Press Ctrl+E | Emoji picker toggles open/closed | Keyboard shortcut |
| 16 | Attachment menu open | Click attachment button (paperclip) | Attachment menu appears with "Photo" and "Document" options | — |
| 17 | Attachment menu close | Click attachment button again or click outside | Menu closes | — |

Provide results in this format:
## Test Results: Pipeline 4 — Emoji Picker & Attachments

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 17 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

### Pipeline 5: CRM Panel & AI Composer (24 tests)

**Prompt for agent:**

```
You are testing the CRM PANEL, AI COMPOSER, PIPELINE BOARD, and ACTIVITY LOG in Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test all CRM-related UI.

Read these source files first:
- src/components/crm/crm-panel.tsx
- src/components/crm/deal-info.tsx
- src/components/crm/ai-composer.tsx
- src/components/crm/pipeline-board.tsx
- src/components/crm/pipeline-view.tsx
- src/components/crm/activity-log.tsx
- src/components/crm/activity-log-entry.tsx
- src/components/crm/deal-card.tsx
- src/stores/crm.ts
- src/stores/ui.ts

COMPONENTS TESTED: CrmPanel, DealInfo, AiComposer, PipelineBoard, PipelineView, ActivityLog, ActivityLogEntry, DealCard

PRECONDITION: App must be logged in. If auth screen shows, report ALL as BLOCKED.

Execute these tests:

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | Pipeline view renders | Click "Pipeline" in top nav | PipelineBoard renders with stage columns | — |
| 2 | Pipeline stage columns | Snapshot pipeline board | Multiple columns representing deal stages (from CRM funnel) | — |
| 3 | Pipeline empty state | If no deals, verify empty display | Empty columns or "No deals" message per column | Empty state |
| 4 | Pipeline deal cards | If deals exist, snapshot a column | DealCard components with deal name, stage badge, value | — |
| 5 | Switch back to Chats | Click "Chats" in top nav | Chat view restored | — |
| 6 | Activity view renders | Click "Activity" in top nav | ActivityLog component renders | — |
| 7 | Activity log entries | Snapshot activity view | List of ActivityLogEntry items with timestamps, or empty state | — |
| 8 | Activity empty state | If no entries, verify | Empty state message displayed | — |
| 9 | Switch to Chats for CRM | Click "Chats", select a chat | Chat opens in main view | Setup |
| 10 | CRM panel not visible by default | Snapshot right side of chat view | No CRM panel visible (crmPanelOpen = false by default) | — |
| 11 | Open CRM panel | Find and activate CRM panel toggle (may be in chat header or via store) | CRM Panel slides in on right side, 320px width | — |
| 12 | CRM panel header | Snapshot CRM panel top | "CRM Panel" title, close button (X) | — |
| 13 | Close CRM panel | Click X button on CRM panel | Panel closes, chat view takes full width | — |
| 14 | CRM panel no deal state | Open CRM panel without matched deal | "No deal linked to this contact" message with clipboard icon | — |
| 15 | CRM panel deal info | If deal matched, snapshot DealInfo | Deal name, stage, value, contact info displayed | — |
| 16 | AI Composer renders | If deal exists in CRM panel, scroll to AI Composer | AiComposer section visible below DealInfo | — |
| 17 | AI Composer empty state | Snapshot composer without generation | Text area or generate button visible | — |
| 18 | AI Composer generate button | Click "Generate" or similar button | Loading indicator appears, then generated text | Requires API key |
| 19 | AI Composer edit text | If generated text appears, edit it | Text is editable in textarea | — |
| 20 | Settings + CRM coexistence | Open Settings while CRM panel was open | Settings view replaces chat area, CRM panel state preserved in store | Simultaneous panels |
| 21 | Return from Settings | Close Settings | CRM panel should restore if it was open | State preservation |
| 22 | Pipeline then Activity rapid | Click Pipeline→Activity→Pipeline→Activity 5x fast | No crash, correct view renders each time | Rapid switching |
| 23 | Pipeline deal click | If a deal card exists, click it | Expected behavior: navigate to chat or show detail (verify actual behavior) | — |
| 24 | Activity log scroll | If many entries, scroll the activity log | Smooth scrolling, entries render correctly | — |

Provide results in this format:
## Test Results: Pipeline 5 — CRM Panel & AI Composer

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 24 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

### Pipeline 6: Settings & Theme (21 tests)

**Prompt for agent:**

```
You are testing SETTINGS & THEME in Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test the settings view, theme switching, accounts management, and API keys.

Read these source files first:
- src/components/settings/settings-view.tsx
- src/components/settings/settings-accounts.tsx
- src/components/settings/settings-api-keys.tsx
- src/stores/ui.ts
- src/stores/auth.ts

COMPONENTS TESTED: SettingsView, SettingsAccounts, SettingsApiKeys

PRECONDITION: App must be logged in. If auth screen shows, report ALL as BLOCKED.

Execute these tests:

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | Open settings via nav bar | Click Settings gear icon in top nav bar | Settings view renders with back arrow, "Settings" title | — |
| 2 | Settings header | Snapshot header | Back arrow button (aria-label "Go back"), "Settings" text | — |
| 3 | Profile section | Snapshot Profile card | Avatar with initial, user's full name, @username if available, phone number | — |
| 4 | Profile avatar initial | Check avatar fallback | First letter of firstName displayed | — |
| 5 | Appearance section | Snapshot Appearance card | "Theme" label with Dark/Light toggle buttons | — |
| 6 | Dark theme active | Snapshot theme toggle | "Dark" button has active/default variant styling | Default state |
| 7 | Switch to Light theme | Click "Light" button | Theme changes — backgrounds, text colors update to light palette | — |
| 8 | Switch back to Dark | Click "Dark" button | Dark theme restored | — |
| 9 | Rapid theme toggle | Click Dark→Light→Dark→Light→Dark 10 times fast | No crash, final theme matches last click, colors correct | Stress test |
| 10 | Theme persists after nav | Switch to Light, close Settings, reopen Settings | "Light" button still active | Persistence |
| 11 | Accounts section renders | Snapshot SettingsAccounts card | Account list with current account, "Add Account" option | — |
| 12 | Account list entries | Check account entries | Each account shows name, username/phone, avatar | — |
| 13 | Add Account button | Click "Add Account" | Auth screen appears for adding new account, "Add Account" title, Cancel button | — |
| 14 | Cancel Add Account | If in add-account flow, click Cancel | Returns to settings or main view | — |
| 15 | API Keys section renders | Snapshot SettingsApiKeys card | Fields for API keys (Bitrix24, Claude/Anthropic) | — |
| 16 | API key input masked | Check API key fields | Values masked/hidden or shown as dots | Security |
| 17 | About section | Snapshot About card | "Telegram CRM Client" app name, version "0.1.0" | — |
| 18 | Log Out button | Snapshot About card bottom | Red "Log Out" button with LogOut icon | — |
| 19 | Log Out button styling | Check Log Out button | Destructive variant (red background), full width | Design |
| 20 | Close settings back arrow | Click back arrow button | Settings closes, returns to previous view (Chats/Pipeline/Activity) | — |
| 21 | Close settings Escape | Reopen settings, press Escape | Settings closes (Escape priority: settings first) | Escape chain |

Provide results in this format:
## Test Results: Pipeline 6 — Settings & Theme

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 21 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

### Pipeline 7: Multi-Account Scenarios (18 tests)

**Prompt for agent:**

```
You are testing MULTI-ACCOUNT SCENARIOS in Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test account switching, multi-column layout, and cross-account features.

Read these source files first:
- src/components/chat/account-switcher.tsx
- src/components/chat/multi-account-columns.tsx
- src/components/chat/account-column.tsx
- src/components/layout/main-layout.tsx
- src/stores/auth.ts
- src/lib/constants.ts

COMPONENTS TESTED: AccountSwitcher, MultiAccountColumns, AccountColumn

PRECONDITION: App must be logged in. Multi-account tests require 2+ accounts; single-account tests always run.

Execute these tests:

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | AccountSwitcher renders | Snapshot sidebar top | AccountSwitcher bar visible with account avatar(s) and "+" button | — |
| 2 | Single account display | If 1 account, snapshot | One avatar + Add button, no multi-column toggle in nav | Single account |
| 3 | Account avatar initial | Check avatar fallback | First letter of account firstName | — |
| 4 | Add account button | Snapshot "+" button | Plus icon button with aria-label "Add account" | — |
| 5 | Click Add account | Click "+" button | Auth flow starts for adding account | — |
| 6 | Active account ring | Snapshot active account avatar | Active account has colored ring-2 border | — |
| 7 | Inactive account opacity | If 2+ accounts, snapshot inactive | Inactive account has opacity-60 styling | — |
| 8 | Switch account | If 2+ accounts, click inactive account avatar | Account switches, dialogs reload for new account | Requires 2+ accounts |
| 9 | Multi-column toggle visible | If 2+ accounts, snapshot nav bar | Columns2 icon button visible | Requires 2+ accounts |
| 10 | Activate multi-column | Click Columns2 button | Layout switches to multi-column, each account gets its own column | Requires 2+ accounts |
| 11 | Multi-column search bar | Snapshot multi-column header | "Search across all accounts" input visible | — |
| 12 | Multi-column search | Type "test" in cross-account search | Results filtered per account column | — |
| 13 | Column collapse | Click collapse toggle on one account column | Column collapses to narrow strip, persists via localStorage | — |
| 14 | Column expand | Click collapsed column | Column expands back to full width | — |
| 15 | All columns collapsed | Collapse all account columns | All show as narrow strips, no crash | Edge: all collapsed |
| 16 | All columns expanded | Expand all columns | All show full dialog lists | — |
| 17 | Switch back to single | Click Columns2 button again | Returns to single sidebar layout | — |
| 18 | Layout mode persists | Switch to columns, refresh or nav away and back | Column mode preserved via localStorage (LAYOUT_MODE_KEY) | Persistence |

If only 1 account exists, tests 8-18 should be reported as SKIPPED (multi-account not available).

Provide results in this format:
## Test Results: Pipeline 7 — Multi-Account Scenarios

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 18 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

### Pipeline 8: Keyboard & Accessibility (20 tests)

**Prompt for agent:**

```
You are testing KEYBOARD SHORTCUTS & ACCESSIBILITY in Telegram CRM Client. You are connected to the Electron renderer via CDP. Take a browser_snapshot to see the current state, then test all keyboard shortcuts defined in use-keyboard-shortcuts.ts plus general accessibility.

Read these source files first:
- src/hooks/use-keyboard-shortcuts.ts
- src/stores/ui.ts
- src/stores/chats.ts
- src/components/layout/main-layout.tsx
- src/components/chat/chat-sidebar.tsx
- src/components/chat/message-input.tsx
- src/components/chat/emoji-picker.tsx

COMPONENTS TESTED: useKeyboardShortcuts hook, all interactive elements

PRECONDITION: App must be logged in with chats available. If auth screen shows, report ALL as BLOCKED.

Execute these tests:

| # | Test Case | Steps | Expected | Edge Cases |
|---|-----------|-------|----------|------------|
| 1 | Ctrl+K focuses search | Press Ctrl+K (not in input) | Sidebar search input (#sidebar-search) gets focus | — |
| 2 | Ctrl+F focuses search | Press Ctrl+F (not in input) | Sidebar search input gets focus | Alternative shortcut |
| 3 | Ctrl+K ignored in input | Focus message textarea, press Ctrl+K | Shortcut does NOT fire (isInputFocused returns true) | Input guard |
| 4 | Ctrl+Shift+F toggles chat search | Press Ctrl+Shift+F (not in input) | In-chat search bar toggles visibility | — |
| 5 | Alt+Down next chat | Open a chat, press Alt+ArrowDown | Next dialog in list becomes active | — |
| 6 | Alt+Up previous chat | Press Alt+ArrowUp | Previous dialog becomes active | — |
| 7 | Alt+Down wraps around | Navigate to last chat, press Alt+ArrowDown | Wraps to first chat in list | Wrap behavior |
| 8 | Alt+Up wraps around | Navigate to first chat, press Alt+ArrowUp | Wraps to last chat in list | Wrap behavior |
| 9 | Ctrl+E toggles emoji | Press Ctrl+E (not in input) | Emoji picker toggles open/closed | — |
| 10 | Ctrl+Shift+M toggles mute | Open a chat, press Ctrl+Shift+M | Chat mute state toggles (verify no crash) | — |
| 11 | Escape closes settings | Open Settings, press Escape | Settings view closes | Priority 1 |
| 12 | Escape closes chat search | Open in-chat search (Ctrl+Shift+F), press Escape | Chat search closes | Priority 2 |
| 13 | Escape cancels edit | Start editing a message, press Escape | Edit mode cancelled | Priority 3 |
| 14 | Escape cancels reply | Start replying to a message, press Escape | Reply preview removed | Priority 4 |
| 15 | Escape blurs element | Focus message input (no reply/edit/search/settings), press Escape | Input loses focus | Priority 5 (last) |
| 16 | Escape priority chain | Open settings + have reply active → Escape | Settings closes first, reply preserved | Combined priority |
| 17 | Tab key navigation | Press Tab repeatedly from top of page | Focus moves through interactive elements in logical order | A11y |
| 18 | Focus visible indicators | Tab to a button, check styling | Focus ring visible (focus-visible:ring-2) | A11y |
| 19 | Aria labels on icon buttons | Snapshot all icon-only buttons | Each has aria-label: "Settings", "Emoji picker", "Send message", "Close CRM panel", etc. | A11y |
| 20 | Button roles correct | Snapshot interactive elements | Buttons have role="button" or are <button> elements, links are <a> | A11y |

Provide results in this format:
## Test Results: Pipeline 8 — Keyboard & Accessibility

| # | Step | Action | Expected | Actual | Result |
|---|------|--------|----------|--------|--------|

**Total:** 20 tests | X passed | Y failed | Z skipped
**Console errors:** none / [list]
```

---

## Quick Reference

| Pipeline | Agent Prompt Starts With | Key Assertion |
|----------|--------------------------|---------------|
| 1 | "You are testing the AUTH FLOW" | Tab switching, phone input validation, XSS |
| 2 | "You are testing the CHAT SIDEBAR" | Folder tabs, search debounce, Alt+Up/Down |
| 3 | "You are testing MESSAGE VIEW" | Reply/edit lifecycle, draft persistence, forum topics |
| 4 | "You are testing the EMOJI PICKER" | Category tabs, recent persistence, Ctrl+E |
| 5 | "You are testing the CRM PANEL" | Deal info, AI composer, pipeline board |
| 6 | "You are testing SETTINGS & THEME" | Dark/Light toggle, rapid switch, Escape close |
| 7 | "You are testing MULTI-ACCOUNT" | Column collapse, layout persistence, cross-account search |
| 8 | "You are testing KEYBOARD SHORTCUTS" | Escape priority chain, focus guards, aria labels |
