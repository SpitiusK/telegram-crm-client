# Domain Model — Telegram CRM Client

## Overview

This document defines the Domain-Driven Design (DDD) model for the Telegram CRM Client. The system is decomposed into five bounded contexts that communicate through well-defined domain events and shared kernel types.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Identity   │   │  Messaging   │   │     CRM      │
│   Context    │──►│   Context    │◄──│   Context    │
│              │   │              │   │              │
│ Accounts     │   │ Chats        │   │ Deals        │
│ Sessions     │   │ Messages     │   │ Contacts     │
│ Auth flows   │   │ Dialogs      │   │ Pipeline     │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       │           ┌──────▼───────┐          │
       └──────────►│      AI      │◄─────────┘
                   │   Context    │
                   │              │
                   │ Composer     │
                   │ Analysis     │
                   │ RAG          │
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │   Storage    │
                   │   Context    │
                   │              │
                   │ SQLite       │
                   │ Embeddings   │
                   │ Cache        │
                   └──────────────┘
```

---

## Bounded Context 1: Identity

**Purpose:** Manages Telegram account authentication, session lifecycle, and multi-account identity.

### Aggregates

#### `Account` (Aggregate Root)

The core identity unit. Each Account represents one Telegram user authenticated in the application.

```typescript
interface Account {
  readonly id: AccountId;             // Internal UUID
  readonly telegramUserId: bigint;    // Telegram's user ID
  readonly phone: PhoneNumber;        // E.164 phone number
  readonly displayName: string;       // First + last name
  readonly username: string | null;   // @username
  readonly photoUrl: string | null;   // Profile photo path (cached locally)
  readonly dcId: number;              // Telegram datacenter ID
  readonly isActive: boolean;         // Currently logged in
  readonly isPrimary: boolean;        // Primary account flag
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
}
```

#### `Session` (Entity, owned by Account)

Encapsulates the GramJS session state for an account.

```typescript
interface Session {
  readonly id: SessionId;
  readonly accountId: AccountId;
  readonly sessionString: EncryptedString; // GramJS StringSession, encrypted at rest
  readonly deviceModel: string;            // "Desktop"
  readonly systemVersion: string;          // "Windows 10"
  readonly appVersion: string;             // "5.12.1 x64"
  readonly apiId: number;                  // 2040
  readonly apiHash: string;
  readonly isValid: boolean;
  readonly lastUsedAt: Date;
}
```

#### `AuthFlow` (Entity, transient)

Represents an in-progress authentication attempt. Lives only in memory during auth.

```typescript
interface AuthFlow {
  readonly id: AuthFlowId;
  readonly accountId: AccountId | null;    // null until account is created
  readonly method: AuthMethod;             // 'qr' | 'phone'
  readonly step: AuthStep;
  readonly phone: PhoneNumber | null;
  readonly phoneCodeHash: string | null;
  readonly qrToken: Uint8Array | null;
  readonly qrExpiry: Date | null;
  readonly requires2FA: boolean;
  readonly error: AuthError | null;
  readonly startedAt: Date;
}
```

### Value Objects

```typescript
// Branded type for account identification
type AccountId = string & { readonly __brand: 'AccountId' };

// Branded type for session identification
type SessionId = string & { readonly __brand: 'SessionId' };

// Branded type for auth flow identification
type AuthFlowId = string & { readonly __brand: 'AuthFlowId' };

// E.164 phone number
type PhoneNumber = string & { readonly __brand: 'PhoneNumber' };

// Encrypted string (session data at rest)
type EncryptedString = string & { readonly __brand: 'EncryptedString' };

// Authentication method
type AuthMethod = 'qr' | 'phone';

// Auth flow step state machine
type AuthStep =
  | 'idle'
  | 'awaiting_qr_scan'
  | 'awaiting_phone_code'
  | 'awaiting_2fa_password'
  | 'awaiting_email_code'
  | 'authorized'
  | 'failed';

// Auth error types
interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly retryAfter?: number; // seconds, for FloodWaitError
}

type AuthErrorCode =
  | 'PHONE_INVALID'
  | 'CODE_INVALID'
  | 'CODE_EXPIRED'
  | 'PASSWORD_INVALID'
  | 'FLOOD_WAIT'
  | 'SESSION_REVOKED'
  | 'NETWORK_ERROR'
  | 'QR_EXPIRED'
  | 'UNKNOWN';
```

### Domain Events

```typescript
interface AccountCreated {
  type: 'identity.account.created';
  accountId: AccountId;
  telegramUserId: bigint;
  phone: PhoneNumber;
  timestamp: Date;
}

interface AccountDeactivated {
  type: 'identity.account.deactivated';
  accountId: AccountId;
  reason: 'user_logout' | 'session_revoked' | 'ban';
  timestamp: Date;
}

interface AuthFlowCompleted {
  type: 'identity.auth.completed';
  accountId: AccountId;
  method: AuthMethod;
  timestamp: Date;
}

interface AuthFlowFailed {
  type: 'identity.auth.failed';
  error: AuthError;
  method: AuthMethod;
  timestamp: Date;
}

interface AccountSwitched {
  type: 'identity.account.switched';
  fromAccountId: AccountId | null;
  toAccountId: AccountId;
  timestamp: Date;
}
```

### Business Rules

1. A maximum of 5 accounts may be authenticated simultaneously.
2. Exactly one account is `isPrimary` at any time.
3. Sessions are encrypted at rest using a key derived from the OS keychain.
4. Auth flows timeout after 5 minutes of inactivity.
5. QR code tokens are refreshed every 30 seconds.
6. After 3 failed 2FA attempts, auth flow is locked for 60 seconds.

---

## Bounded Context 2: Messaging

**Purpose:** Manages Telegram chats, messages, dialog state, and real-time updates across all accounts.

### Aggregates

#### `Chat` (Aggregate Root)

Represents a Telegram dialog (user, group, or channel) from the perspective of one account.

```typescript
interface Chat {
  readonly id: ChatId;
  readonly accountId: AccountId;           // Which account owns this chat
  readonly telegramChatId: bigint;         // Telegram's peer ID
  readonly type: ChatType;
  readonly title: string;                  // Display name / chat title
  readonly username: string | null;        // @username if available
  readonly photoUrl: string | null;        // Cached avatar path
  readonly lastMessage: MessagePreview | null;
  readonly unreadCount: number;
  readonly unreadMentionCount: number;
  readonly isPinned: boolean;
  readonly isMuted: boolean;
  readonly isArchived: boolean;
  readonly lastReadOutboxMessageId: number;
  readonly lastReadInboxMessageId: number;
  readonly linkedDealId: DealId | null;    // CRM cross-reference
  readonly lastSyncedAt: Date;
}

type ChatType = 'private' | 'group' | 'supergroup' | 'channel';
```

#### `Message` (Entity, owned by Chat)

A single message in a chat.

```typescript
interface Message {
  readonly id: MessageId;
  readonly chatId: ChatId;
  readonly accountId: AccountId;
  readonly telegramMessageId: number;      // Telegram's message ID
  readonly senderId: bigint | null;        // null for channel posts
  readonly senderName: string;
  readonly text: string;
  readonly formattedText: FormattedText | null; // Bold, italic, links, etc.
  readonly replyToMessageId: number | null;
  readonly replyPreview: MessagePreview | null;
  readonly media: MessageMedia[];
  readonly date: Date;
  readonly editDate: Date | null;
  readonly isOutgoing: boolean;
  readonly isRead: boolean;
  readonly deliveryStatus: DeliveryStatus;
  readonly forwardInfo: ForwardInfo | null;
}
```

#### `MessageDraft` (Entity, transient)

An unsent message being composed.

```typescript
interface MessageDraft {
  readonly chatId: ChatId;
  readonly accountId: AccountId;
  readonly text: string;
  readonly replyToMessageId: number | null;
  readonly source: DraftSource;            // 'manual' | 'ai_generated' | 'template'
  readonly aiSuggestionId: string | null;  // Reference to AI suggestion
}
```

### Value Objects

```typescript
type ChatId = string & { readonly __brand: 'ChatId' };
type MessageId = string & { readonly __brand: 'MessageId' };

interface MessagePreview {
  readonly text: string;          // First 100 chars
  readonly senderId: bigint | null;
  readonly senderName: string;
  readonly date: Date;
  readonly hasMedia: boolean;
}

type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
type DraftSource = 'manual' | 'ai_generated' | 'template';

interface FormattedText {
  readonly raw: string;
  readonly entities: TextEntity[];
}

interface TextEntity {
  readonly offset: number;
  readonly length: number;
  readonly type: TextEntityType;
  readonly url?: string;            // For 'text_link'
  readonly userId?: bigint;         // For 'mention_name'
}

type TextEntityType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'pre'
  | 'text_link'
  | 'mention'
  | 'mention_name'
  | 'hashtag'
  | 'url'
  | 'email'
  | 'phone';

interface MessageMedia {
  readonly type: MediaType;
  readonly fileName: string | null;
  readonly mimeType: string | null;
  readonly size: number | null;        // bytes
  readonly width: number | null;       // pixels
  readonly height: number | null;
  readonly thumbnailPath: string | null;
  readonly fullPath: string | null;    // Downloaded file path
  readonly downloadStatus: 'pending' | 'downloading' | 'complete' | 'failed';
}

type MediaType = 'photo' | 'document' | 'video' | 'audio' | 'voice' | 'sticker' | 'animation';

interface ForwardInfo {
  readonly fromChatId: bigint | null;
  readonly fromMessageId: number | null;
  readonly fromName: string | null;
  readonly date: Date;
}
```

### Domain Events

```typescript
interface MessageReceived {
  type: 'messaging.message.received';
  accountId: AccountId;
  chatId: ChatId;
  messageId: MessageId;
  telegramMessageId: number;
  senderId: bigint;
  isOutgoing: boolean;
  timestamp: Date;
}

interface MessageSent {
  type: 'messaging.message.sent';
  accountId: AccountId;
  chatId: ChatId;
  messageId: MessageId;
  telegramMessageId: number;
  source: DraftSource;
  timestamp: Date;
}

interface MessageRead {
  type: 'messaging.message.read';
  accountId: AccountId;
  chatId: ChatId;
  maxReadId: number;
  timestamp: Date;
}

interface ChatUpdated {
  type: 'messaging.chat.updated';
  accountId: AccountId;
  chatId: ChatId;
  changes: Partial<Pick<Chat, 'title' | 'photoUrl' | 'unreadCount' | 'isPinned' | 'isMuted'>>;
  timestamp: Date;
}

interface DialogsLoaded {
  type: 'messaging.dialogs.loaded';
  accountId: AccountId;
  chatCount: number;
  timestamp: Date;
}
```

### Business Rules

1. Messages are loaded in batches of 50, with pagination support.
2. The dialog list loads a maximum of 20-30 dialogs per session to avoid bans.
3. All outgoing messages go through a rate limiter (1-3 second delay between sends).
4. Messages are cached in SQLite for offline access.
5. Real-time updates arrive via GramJS event handlers and are dispatched as domain events.
6. Chat search operates on locally cached data first, then falls back to Telegram API.
7. A Chat can be linked to at most one Deal (via `linkedDealId`).

---

## Bounded Context 3: CRM

**Purpose:** Manages Bitrix24 deals, contacts, pipeline stages, and the mapping between Telegram chats and CRM entities.

### Aggregates

#### `Deal` (Aggregate Root)

A Bitrix24 deal representing a client in the sales funnel.

```typescript
interface Deal {
  readonly id: DealId;
  readonly bitrixDealId: number;          // Bitrix24 ID
  readonly title: string;
  readonly stage: DealStage;
  readonly stageChangedAt: Date;
  readonly value: Money;
  readonly currency: Currency;
  readonly contactId: ContactId;
  readonly assignedToId: string | null;   // Bitrix24 user ID (МОП)
  readonly linkedChatId: ChatId | null;   // Cross-reference to Messaging context
  readonly linkedAccountId: AccountId | null;
  readonly notes: string;
  readonly source: LeadSource | null;
  readonly website: string | null;        // Client's website URL
  readonly daysInStage: number;           // Computed
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly closedAt: Date | null;
}
```

#### `Contact` (Entity, owned by Deal)

A Bitrix24 contact linked to deals.

```typescript
interface Contact {
  readonly id: ContactId;
  readonly bitrixContactId: number;       // Bitrix24 ID
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;              // Computed
  readonly phone: PhoneNumber | null;
  readonly email: string | null;
  readonly company: string | null;
  readonly telegramUsername: string | null;
  readonly telegramUserId: bigint | null;
  readonly notes: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

#### `DealStageChange` (Entity, immutable history)

Records every stage transition for audit trail.

```typescript
interface DealStageChange {
  readonly id: string;
  readonly dealId: DealId;
  readonly fromStage: DealStage | null;   // null for initial creation
  readonly toStage: DealStage;
  readonly changedBy: string;             // 'user' | 'bitrix_sync' | 'automation'
  readonly changedAt: Date;
  readonly notes: string | null;
}
```

### Value Objects

```typescript
type DealId = string & { readonly __brand: 'DealId' };
type ContactId = string & { readonly __brand: 'ContactId' };

// бустер.рф sales funnel stages
type DealStage =
  | 'NEW'                    // Новая регистрация
  | 'CONTACTED_AFTER_REG'    // Связался после регистрации (7д)
  | 'ON_TEST'                // На тесте (7д)
  | 'TEST_FINISHED'          // Тест закончен
  | 'CONTACTED_AFTER_TEST'   // Связался после теста (7д)
  | 'GOT_PAYMENT_CONSENT'    // Получили согласие на оплату
  | 'PAYMENT'                // Оплата
  | 'ACTIVE_CLIENT'          // Работа с клиентом
  | 'LOST';                  // Проиграна

interface DealStageInfo {
  readonly id: DealStage;
  readonly label: string;           // Russian display name
  readonly color: string;           // Hex color for UI
  readonly maxDays: number | null;  // SLA: max days in this stage (null = no limit)
  readonly order: number;           // Sort order in pipeline
}

// All stages with metadata
const DEAL_STAGES: readonly DealStageInfo[] = [
  { id: 'NEW',                   label: 'Новая регистрация',             color: '#3B82F6', maxDays: null, order: 0 },
  { id: 'CONTACTED_AFTER_REG',   label: 'Связался после регистрации',    color: '#8B5CF6', maxDays: 7,    order: 1 },
  { id: 'ON_TEST',               label: 'На тесте',                      color: '#F59E0B', maxDays: 7,    order: 2 },
  { id: 'TEST_FINISHED',         label: 'Тест закончен',                 color: '#EF4444', maxDays: null, order: 3 },
  { id: 'CONTACTED_AFTER_TEST',  label: 'Связался после теста',          color: '#EC4899', maxDays: 7,    order: 4 },
  { id: 'GOT_PAYMENT_CONSENT',   label: 'Получили согласие на оплату',   color: '#10B981', maxDays: null, order: 5 },
  { id: 'PAYMENT',               label: 'Оплата',                        color: '#06B6D4', maxDays: null, order: 6 },
  { id: 'ACTIVE_CLIENT',         label: 'Работа с клиентом',             color: '#22C55E', maxDays: null, order: 7 },
  { id: 'LOST',                  label: 'Проиграна',                     color: '#6B7280', maxDays: null, order: 8 },
] as const;

interface Money {
  readonly amount: number;      // In smallest unit (kopeks for RUB)
  readonly display: string;     // Formatted string: "15 000 ₽"
}

type Currency = 'RUB' | 'USD' | 'EUR';

type LeadSource =
  | 'organic'       // Found бустер.рф via search
  | 'referral'      // Referred by another client
  | 'advertising'   // Came from ads
  | 'cold_outreach' // Cold message from МОП
  | 'other';

// Contact-to-chat matching strategies
type ContactMatchStrategy =
  | 'telegram_username'   // Match by @username
  | 'telegram_user_id'    // Match by Telegram user ID
  | 'phone_number'        // Match by phone number
  | 'manual';             // Manually linked by operator
```

### Domain Events

```typescript
interface DealLinkedToChat {
  type: 'crm.deal.linked';
  dealId: DealId;
  chatId: ChatId;
  accountId: AccountId;
  matchStrategy: ContactMatchStrategy;
  timestamp: Date;
}

interface DealStageChanged {
  type: 'crm.deal.stage_changed';
  dealId: DealId;
  fromStage: DealStage;
  toStage: DealStage;
  changedBy: string;
  timestamp: Date;
}

interface DealSynced {
  type: 'crm.deal.synced';
  dealId: DealId;
  bitrixDealId: number;
  changes: string[];  // Field names that changed
  timestamp: Date;
}

interface ContactMatched {
  type: 'crm.contact.matched';
  contactId: ContactId;
  chatId: ChatId;
  strategy: ContactMatchStrategy;
  timestamp: Date;
}

interface DealSLAWarning {
  type: 'crm.deal.sla_warning';
  dealId: DealId;
  stage: DealStage;
  daysInStage: number;
  maxDays: number;
  timestamp: Date;
}
```

### Business Rules

1. A Deal maps to at most one Chat. A Chat maps to at most one Deal.
2. Contact matching runs automatically when a chat is opened: first by `telegram_user_id`, then `telegram_username`, then `phone_number`.
3. Deal data is synced from Bitrix24 with a 5-minute cache TTL. Local edits are pushed immediately.
4. Stage changes are recorded in `DealStageChange` for full audit trail.
5. SLA warnings fire when `daysInStage` exceeds the stage's `maxDays`.
6. Pipeline view shows deals grouped by stage, ordered by `stageChangedAt` ascending (oldest first = needs attention).

---

## Bounded Context 4: AI

**Purpose:** Manages AI-powered message composition, conversation analysis, and RAG-based context retrieval.

### Aggregates

#### `ComposerSession` (Aggregate Root)

An active AI composition session tied to a specific chat and deal context.

```typescript
interface ComposerSession {
  readonly id: ComposerSessionId;
  readonly accountId: AccountId;
  readonly chatId: ChatId;
  readonly dealId: DealId | null;
  readonly context: ComposerContext;
  readonly suggestions: AISuggestion[];
  readonly selectedSuggestionId: string | null;
  readonly editedText: string | null;   // User's modifications to selected suggestion
  readonly status: ComposerStatus;
  readonly createdAt: Date;
}
```

#### `AISuggestion` (Entity, owned by ComposerSession)

A single generated message suggestion.

```typescript
interface AISuggestion {
  readonly id: string;
  readonly sessionId: ComposerSessionId;
  readonly text: string;
  readonly tone: MessageTone;
  readonly confidence: number;           // 0-1, model's self-assessed relevance
  readonly reasoning: string;            // Why this message was suggested
  readonly tokensUsed: number;
  readonly generatedAt: Date;
}
```

#### `ConversationAnalysis` (Entity)

AI-generated analysis of a conversation's state and recommended actions.

```typescript
interface ConversationAnalysis {
  readonly id: string;
  readonly chatId: ChatId;
  readonly dealId: DealId | null;
  readonly summary: string;              // Brief conversation summary
  readonly sentiment: Sentiment;
  readonly clientIntent: ClientIntent;
  readonly recommendedAction: string;
  readonly suggestedStage: DealStage | null; // If AI thinks stage should change
  readonly analyzedAt: Date;
}
```

### Value Objects

```typescript
type ComposerSessionId = string & { readonly __brand: 'ComposerSessionId' };

type ComposerStatus = 'idle' | 'generating' | 'ready' | 'sending' | 'sent' | 'error';

interface ComposerContext {
  readonly dealStage: DealStage | null;
  readonly dealValue: Money | null;
  readonly contactName: string;
  readonly contactCompany: string | null;
  readonly website: string | null;
  readonly recentMessages: ContextMessage[];  // Last N messages
  readonly ragContext: RAGResult[];           // Retrieved relevant past conversations
  readonly templateHint: string | null;       // If user selected a template
}

interface ContextMessage {
  readonly role: 'client' | 'operator';
  readonly text: string;
  readonly date: Date;
}

type MessageTone =
  | 'professional'   // Default business tone
  | 'friendly'       // Warmer, more casual
  | 'urgent'         // Time-sensitive, action-oriented
  | 'follow_up'      // Gentle reminder
  | 'closing';       // Deal-closing, persuasive

type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

type ClientIntent =
  | 'interested'       // Wants to learn more
  | 'testing'          // Currently in test period
  | 'ready_to_pay'     // Shows buying signals
  | 'hesitant'         // Has objections
  | 'unresponsive'     // Not replying
  | 'churning'         // Wants to leave
  | 'satisfied'        // Happy active client
  | 'unknown';

interface RAGResult {
  readonly chunkId: string;
  readonly text: string;
  readonly similarity: number;        // Cosine similarity score
  readonly sourceChat: string;        // Chat title where this came from
  readonly sourceDate: Date;
  readonly metadata: Record<string, string>;
}

// Message template for quick-insert
interface MessageTemplate {
  readonly id: string;
  readonly name: string;
  readonly stage: DealStage | null;   // Applicable stage, null = all stages
  readonly template: string;           // Template with {{variables}}
  readonly variables: string[];        // Available variable names
  readonly tone: MessageTone;
  readonly createdBy: string;
  readonly createdAt: Date;
}
```

### Domain Events

```typescript
interface SuggestionGenerated {
  type: 'ai.suggestion.generated';
  sessionId: ComposerSessionId;
  suggestionId: string;
  tone: MessageTone;
  tokensUsed: number;
  timestamp: Date;
}

interface SuggestionAccepted {
  type: 'ai.suggestion.accepted';
  sessionId: ComposerSessionId;
  suggestionId: string;
  wasEdited: boolean;
  timestamp: Date;
}

interface SuggestionDismissed {
  type: 'ai.suggestion.dismissed';
  sessionId: ComposerSessionId;
  suggestionId: string;
  reason: 'wrong_tone' | 'irrelevant' | 'too_long' | 'other';
  timestamp: Date;
}

interface AnalysisCompleted {
  type: 'ai.analysis.completed';
  chatId: ChatId;
  sentiment: Sentiment;
  clientIntent: ClientIntent;
  timestamp: Date;
}
```

### Business Rules

1. AI context includes the last 20 messages from the chat, plus up to 5 RAG-retrieved relevant chunks.
2. A ComposerSession generates 1-3 suggestions per request.
3. The Claude API call includes: system prompt (бустер.рф sales context), deal stage, contact info, message history, and RAG context.
4. Suggestions are never sent automatically — the operator must review and approve.
5. Template variables are substituted before display: `{{name}}`, `{{company}}`, `{{website}}`, `{{stage}}`.
6. Token usage is tracked per suggestion for cost monitoring.
7. Dismissed suggestions with reasons feed back into prompt improvement.

---

## Bounded Context 5: Storage

**Purpose:** Manages local persistence (SQLite), caching, embedding storage, and data synchronization.

### Aggregates

#### `MessageStore` (Aggregate Root)

Manages the local message cache with full-text search capability.

```typescript
interface MessageStore {
  readonly accountId: AccountId;
  readonly totalMessages: number;
  readonly totalChats: number;
  readonly lastSyncedAt: Date;
  readonly ftsEnabled: boolean;        // FTS5 index status
  readonly embeddingsEnabled: boolean; // Embedding index status
}
```

#### `EmbeddingRecord` (Entity)

A stored vector embedding for RAG retrieval.

```typescript
interface EmbeddingRecord {
  readonly id: string;
  readonly chunkId: string;
  readonly accountId: AccountId;
  readonly chatId: ChatId;
  readonly messageIds: MessageId[];     // Source messages for this chunk
  readonly text: string;                // Original chunk text
  readonly embedding: Float32Array;     // 1536-dim vector (text-embedding-3-small)
  readonly metadata: EmbeddingMetadata;
  readonly createdAt: Date;
}

interface EmbeddingMetadata {
  readonly chatTitle: string;
  readonly senderNames: string[];
  readonly dateRange: { start: Date; end: Date };
  readonly dealStage: DealStage | null;
  readonly messageCount: number;
}
```

#### `ActivityEntry` (Entity, append-only)

An immutable log entry recording operator actions for audit and analytics.

```typescript
interface ActivityEntry {
  readonly id: string;
  readonly accountId: AccountId;
  readonly action: ActivityAction;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
}

type ActivityAction =
  | 'message_sent'
  | 'message_received'
  | 'ai_suggestion_generated'
  | 'ai_suggestion_accepted'
  | 'ai_suggestion_dismissed'
  | 'deal_stage_changed'
  | 'deal_linked'
  | 'deal_unlinked'
  | 'contact_matched'
  | 'template_used'
  | 'bulk_queue_sent'
  | 'account_login'
  | 'account_logout';

type EntityType = 'message' | 'chat' | 'deal' | 'contact' | 'suggestion' | 'account';
```

#### `AppSettings` (Entity, singleton)

Global application settings.

```typescript
interface AppSettings {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: 'ru' | 'en';
  readonly sendMessageShortcut: 'enter' | 'ctrl_enter';
  readonly showCrmPanel: boolean;
  readonly crmPanelWidth: number;
  readonly chatListWidth: number;
  readonly notificationsEnabled: boolean;
  readonly notificationSound: boolean;
  readonly aiAutoSuggest: boolean;             // Auto-generate suggestions on chat open
  readonly aiDefaultTone: MessageTone;
  readonly rateLimitDelay: { min: number; max: number }; // ms between API calls
  readonly maxDialogsPerSync: number;          // Default 20
  readonly bitrixDomain: string;               // e.g. "booster.bitrix24.ru"
  readonly bitrixWebhookUrl: string;
}
```

### Value Objects

```typescript
// Sync state tracking
interface SyncState {
  readonly entityType: 'dialogs' | 'messages' | 'deals' | 'contacts';
  readonly accountId: AccountId;
  readonly lastSyncedAt: Date;
  readonly lastSyncedId: string | null;  // Cursor for pagination
  readonly status: 'idle' | 'syncing' | 'error';
  readonly error: string | null;
}

// Cache entry with TTL
interface CacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}
```

### Domain Events

```typescript
interface MessagesCached {
  type: 'storage.messages.cached';
  accountId: AccountId;
  chatId: ChatId;
  messageCount: number;
  timestamp: Date;
}

interface EmbeddingsGenerated {
  type: 'storage.embeddings.generated';
  accountId: AccountId;
  chatId: ChatId;
  chunkCount: number;
  timestamp: Date;
}

interface SyncCompleted {
  type: 'storage.sync.completed';
  entityType: string;
  accountId: AccountId;
  recordCount: number;
  timestamp: Date;
}

interface ActivityLogged {
  type: 'storage.activity.logged';
  entryId: string;
  action: ActivityAction;
  timestamp: Date;
}
```

### Business Rules

1. SQLite is the single local data store. No IndexedDB or localStorage for domain data.
2. Message cache uses a sliding window: keep last 1000 messages per chat, older ones are purged (but available via Telegram API).
3. FTS5 index covers message text for full-text search.
4. Embeddings are generated asynchronously in batches (chunked by 5-message windows with 2-message overlap).
5. Activity log is append-only, never modified or deleted.
6. All timestamps are stored as ISO 8601 UTC strings in SQLite.
7. Sync state is tracked per entity type per account to enable incremental sync.

---

## Cross-Context Integration

### Shared Kernel

Types shared across all bounded contexts:

```typescript
// Re-exported from each context for cross-referencing
type AccountId = string & { readonly __brand: 'AccountId' };
type ChatId = string & { readonly __brand: 'ChatId' };
type MessageId = string & { readonly __brand: 'MessageId' };
type DealId = string & { readonly __brand: 'DealId' };
type ContactId = string & { readonly __brand: 'ContactId' };
```

### Context Mapping

```
Identity ──[AccountId]──► Messaging     (Account owns Chats)
Identity ──[AccountId]──► Storage       (Account scopes all data)
Messaging ──[ChatId]────► CRM           (Chat links to Deal)
Messaging ──[ChatId]────► AI            (Chat provides context)
CRM ──[DealId]──────────► AI            (Deal stage informs suggestions)
CRM ──[ContactId]───────► Messaging     (Contact matches to Chat)
AI ──[ComposerSession]─► Messaging      (Suggestion becomes Draft)
Storage ──[embedding]───► AI            (RAG feeds composer context)
All ──[ActivityEntry]───► Storage        (Everything is logged)
```

### Event Flow Example: New Message Received

```
1. GramJS receives MTProto update
2. Messaging context creates MessageReceived event
3. Storage context handles event → caches message in SQLite
4. CRM context handles event → checks if chat has linked deal, updates "last contact" timestamp
5. AI context handles event → if auto-suggest enabled, prepares response context
6. Renderer receives update via IPC → Zustand stores update → UI re-renders
```

### Event Flow Example: AI Suggestion Sent

```
1. Operator clicks "Generate" in AI Composer
2. AI context creates ComposerSession, gathers context:
   a. Messaging context → last 20 messages
   b. CRM context → deal stage, contact info
   c. Storage context → RAG retrieval (top 5 chunks)
3. AI context calls Claude API → generates suggestions
4. Operator selects/edits suggestion, clicks "Send"
5. Messaging context sends message via GramJS (with rate limiting)
6. Storage context logs: ai_suggestion_accepted + message_sent
7. CRM context checks if stage should advance
```
