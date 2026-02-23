export interface TelegramDialog {
  id: string
  accountId?: string
  title: string
  unreadCount: number
  lastMessage: string
  lastMessageDate: number
  avatar?: string
  isUser: boolean
  isSavedMessages: boolean
  isGroup: boolean
  isChannel: boolean
  isForum?: boolean
  username?: string
  phone?: string
}

export interface ForumTopic {
  id: number
  title: string
  iconColor: number
  iconEmojiId?: string
  unreadCount: number
  lastMessage?: string
  lastMessageDate?: number
  closed?: boolean
  pinned?: boolean
  hidden?: boolean
}

export interface MessageEntity {
  type: 'bold' | 'italic' | 'code' | 'pre' | 'underline' | 'strike' | 'spoiler' | 'url' | 'textUrl' | 'mention' | 'hashtag'
  offset: number
  length: number
  url?: string
}

export interface ReplyPreview {
  id: number
  text: string
  senderName: string
}

export interface LinkPreview {
  url: string
  title?: string
  description?: string
  siteName?: string
  photo?: string
}

export interface TelegramMessage {
  id: number
  chatId: string
  accountId?: string
  text: string
  date: number
  out: boolean
  senderName: string
  senderId: string
  replyToId?: number
  media?: MessageMedia
  entities?: MessageEntity[]
  replyToMessage?: ReplyPreview
  forwardedFrom?: string
  isEdited?: boolean
  linkPreview?: LinkPreview
}

export interface MessageMedia {
  type: 'photo' | 'document' | 'video' | 'voice' | 'sticker' | 'gif' | 'videoNote'
  url?: string
  fileName?: string
  size?: number
  duration?: number
  width?: number
  height?: number
  mimeType?: string
  waveform?: number[]
}

export interface TelegramUser {
  id: string
  firstName: string
  lastName: string
  username: string
  phone: string
}

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  username: string
  phone: string
  bio: string
  avatar?: string
  isBot: boolean
  lastSeen: string
}

export interface VerifyCodeResult {
  success: boolean
  needs2FA: boolean
  error?: string
}

export interface SendMessageResult {
  id: number
  date: number
}

export interface SearchResult {
  id: number
  chatId: string
  accountId?: string
  chatTitle?: string
  text: string
  date: number
  out: boolean
  senderName: string
  senderId: string
}

export type SharedMediaFilter = 'photos' | 'videos' | 'links' | 'voice' | 'documents'

export interface SharedMediaItem {
  id: number
  date: number
  type: SharedMediaFilter
  thumbnail?: string
  url?: string
  linkTitle?: string
  linkDescription?: string
  linkSiteName?: string
  fileName?: string
  size?: number
  duration?: number
  mimeType?: string
}

export interface SharedMediaCounts {
  photos: number
  videos: number
  links: number
  voice: number
  documents: number
}

export interface BitrixDeal {
  ID: string
  TITLE: string
  STAGE_ID: string
  STAGE_NAME?: string
  OPPORTUNITY: string
  CURRENCY_ID: string
  CONTACT_ID: string
  COMPANY_ID?: string
  ASSIGNED_BY_ID: string
  DATE_CREATE: string
  DATE_MODIFY: string
  COMMENTS?: string
  UF_CRM_PHONE?: string
}

export interface BitrixContact {
  ID: string
  NAME: string
  LAST_NAME: string
  PHONE: Array<{ VALUE: string; VALUE_TYPE: string }>
  EMAIL: Array<{ VALUE: string; VALUE_TYPE: string }>
}

export interface AIMessageSuggestion {
  text: string
  tone: 'professional' | 'friendly' | 'urgent'
  confidence: number
}

export interface TelegramAccount {
  id: string
  firstName: string
  lastName: string
  username: string
  phone: string
  avatar?: string
}

export interface DialogFilter {
  id: number
  title: string
  emoji?: string
  includePeers: string[]
}

export interface AppTheme {
  mode: 'dark' | 'light'
}

export interface ElectronAPI {
  telegram: {
    // Auth methods (no accountId)
    connect: () => Promise<void>
    getQRUrl: () => Promise<string>
    loginWithPhone: (phone: string) => Promise<{ phoneCodeHash: string }>
    verifyCode: (phone: string, code: string, phoneCodeHash: string) => Promise<VerifyCodeResult>
    submit2FA: (password: string) => Promise<boolean>
    checkPassword: (password: string) => Promise<boolean>
    isAuthorized: () => Promise<boolean>
    // Data methods (optional accountId as last param)
    getMe: (accountId?: string) => Promise<TelegramUser | null>
    getUserInfo: (userId: string, accountId?: string) => Promise<UserProfile | null>
    getDialogs: (limit?: number, accountId?: string) => Promise<TelegramDialog[]>
    getMessages: (chatId: string, limit?: number, offsetId?: number, accountId?: string) => Promise<TelegramMessage[]>
    getForumTopics: (chatId: string, accountId?: string) => Promise<ForumTopic[]>
    getTopicMessages: (chatId: string, topicId: number, limit?: number, accountId?: string) => Promise<TelegramMessage[]>
    sendMessage: (chatId: string, text: string, replyTo?: number, accountId?: string) => Promise<SendMessageResult>
    sendTopicMessage: (chatId: string, topicId: number, text: string, accountId?: string) => Promise<SendMessageResult>
    pickFile: (options?: { mediaOnly?: boolean }) => Promise<string | null>
    sendFile: (chatId: string, filePath: string, caption?: string, replyTo?: number, accountId?: string) => Promise<SendMessageResult>
    sendPhoto: (chatId: string, base64Data: string, caption?: string, replyTo?: number, accountId?: string) => Promise<SendMessageResult>
    setTyping: (chatId: string, accountId?: string) => Promise<void>
    searchMessages: (query: string, chatId?: string, limit?: number, accountId?: string) => Promise<SearchResult[]>
    editMessage: (chatId: string, messageId: number, text: string, accountId?: string) => Promise<void>
    deleteMessages: (chatId: string, messageIds: number[], revoke?: boolean, accountId?: string) => Promise<void>
    markRead: (chatId: string, accountId?: string) => Promise<void>
    getDialogFilters: (accountId?: string) => Promise<DialogFilter[]>
    getArchivedDialogs: (limit?: number, accountId?: string) => Promise<TelegramDialog[]>
    getSharedMediaCounts: (chatId: string, accountId?: string) => Promise<SharedMediaCounts>
    getSharedMedia: (chatId: string, filter: SharedMediaFilter, limit?: number, offset?: number, accountId?: string) => Promise<SharedMediaItem[]>
    // Settings / account management (no accountId)
    setNotificationSettings: (settings: { mutedChats: string[] }) => Promise<void>
    logout: () => Promise<void>
    getAccounts: () => Promise<TelegramAccount[]>
    switchAccount: (accountId: string) => Promise<boolean>
    addAccount: () => Promise<void>
    removeAccount: (accountId: string) => Promise<void>
    cancelAddAccount: () => Promise<void>
    connectAll: () => Promise<Array<{ accountId: string; connected: boolean; error?: string }>>
    // Event listeners
    onNotificationClick: (callback: (chatId: string) => void) => () => void
    onUpdate: (callback: (event: string, data: unknown) => void) => () => void
  }
  crm: {
    getDeal: (id: string) => Promise<BitrixDeal>
    getDeals: (filter?: Record<string, string>) => Promise<BitrixDeal[]>
    getContact: (id: string) => Promise<BitrixContact>
    updateDeal: (id: string, fields: Partial<BitrixDeal>) => Promise<void>
    findDealByPhone: (phone: string) => Promise<BitrixDeal | null>
  }
  claude: {
    generateMessage: (context: string, history: TelegramMessage[], dealInfo?: BitrixDeal) => Promise<AIMessageSuggestion[]>
  }
  db: {
    cacheMessages: (chatId: string, messages: TelegramMessage[]) => Promise<void>
    getCachedMessages: (chatId: string) => Promise<TelegramMessage[]>
    saveSession: (key: string, value: string) => Promise<void>
    getSession: (key: string) => Promise<string | null>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
