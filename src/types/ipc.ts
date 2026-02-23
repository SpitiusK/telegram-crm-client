// IPC Request/Response types — fully typed end-to-end

import type { TelegramDialog, TelegramMessage, BitrixDeal, BitrixContact, AIMessageSuggestion, DialogFilter } from './index'
import type { ActivityEntry } from './domain'

// ─── Auth ───

export interface AuthRequestQRResult {
  qrDataUrl: string
}

export interface AuthSubmitPhoneCodeRequest {
  phone: string
  code: string
  phoneCodeHash: string
}

export interface AuthSubmit2FARequest {
  password: string
}

export interface AuthCheckSessionResult {
  authorized: boolean
  accountId: number | null
}

// ─── Telegram ───

export interface TelegramConnectRequest {
  accountId?: number
  phone?: string
  sessionString?: string
}

export interface TelegramGetMessagesRequest {
  accountId?: string
  chatId: string
  limit?: number
  offsetId?: number
}

export interface TelegramSendMessageRequest {
  accountId?: string
  chatId: string
  text: string
}

export interface TelegramGetMeResult {
  id: string
  firstName: string
  lastName: string
  username: string
  phone: string
}

// ─── CRM ───

export interface CrmSearchDealRequest {
  query: string
}

export interface CrmUpdateDealStageRequest {
  dealId: string
  stageId: string
}

export interface CrmSearchContactRequest {
  query: string
}

export interface CrmLinkContactRequest {
  telegramUserId: string
  bitrixContactId: string
}

// ─── Claude ───

export interface ClaudeGenerateMessageRequest {
  context: string
  history: TelegramMessage[]
  dealInfo?: BitrixDeal
}

export interface ClaudeAnalyzeConversationRequest {
  messages: TelegramMessage[]
  dealInfo?: BitrixDeal
}

export interface ConversationAnalysis {
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative'
  suggestedStage: string | null
  keyTopics: string[]
}

// ─── Database ───

export interface DatabaseLogActivityRequest {
  accountId: number
  actionType: string
  entityType: string
  entityId: string
  detailsJson: string
}

export interface DatabaseGetActivityLogRequest {
  accountId?: number
  limit?: number
  offset?: number
}

// ─── IPC Channel Map ───

export interface IPCChannelMap {
  // Auth
  'auth:requestQR': { request: undefined; response: AuthRequestQRResult }
  'auth:submitPhoneCode': { request: AuthSubmitPhoneCodeRequest; response: boolean }
  'auth:submit2FA': { request: AuthSubmit2FARequest; response: boolean }
  'auth:checkSession': { request: undefined; response: AuthCheckSessionResult }
  'auth:logout': { request: undefined; response: undefined }

  // Telegram
  'telegram:connect': { request: TelegramConnectRequest | undefined; response: boolean }
  'telegram:disconnect': { request: undefined; response: undefined }
  'telegram:getDialogs': { request: { accountId?: string; limit?: number }; response: TelegramDialog[] }
  'telegram:getDialogFilters': { request: { accountId?: string } | undefined; response: DialogFilter[] }
  'telegram:getArchivedDialogs': { request: { accountId?: string; limit?: number }; response: TelegramDialog[] }
  'telegram:getMessages': { request: TelegramGetMessagesRequest; response: TelegramMessage[] }
  'telegram:sendMessage': { request: TelegramSendMessageRequest; response: undefined }
  'telegram:getMe': { request: { accountId?: string } | undefined; response: TelegramGetMeResult }

  // CRM
  'crm:searchDeal': { request: CrmSearchDealRequest; response: BitrixDeal[] }
  'crm:getDeal': { request: string; response: BitrixDeal }
  'crm:updateDealStage': { request: CrmUpdateDealStageRequest; response: undefined }
  'crm:getContact': { request: string; response: BitrixContact }
  'crm:searchContact': { request: CrmSearchContactRequest; response: BitrixContact[] }
  'crm:linkContact': { request: CrmLinkContactRequest; response: undefined }

  // Claude
  'claude:generateMessage': { request: ClaudeGenerateMessageRequest; response: AIMessageSuggestion[] }
  'claude:analyzeConversation': { request: ClaudeAnalyzeConversationRequest; response: ConversationAnalysis }

  // Database
  'db:saveSetting': { request: { key: string; value: string }; response: undefined }
  'db:getSetting': { request: string; response: string | null }
  'db:getActivityLog': { request: DatabaseGetActivityLogRequest; response: ActivityEntry[] }
  'db:logActivity': { request: DatabaseLogActivityRequest; response: undefined }
}

// Event types pushed from main → renderer
export interface IPCEventMap {
  'telegram:newMessage': { chatId: string; message: TelegramMessage }
  'telegram:updateReadHistory': { chatId: string; maxId: number }
  'telegram:qrCode': { dataUrl: string }
  'telegram:authorized': { sessionString: string }
}
