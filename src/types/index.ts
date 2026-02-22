export interface TelegramDialog {
  id: string
  title: string
  unreadCount: number
  lastMessage: string
  lastMessageDate: number
  avatar?: string
  isUser: boolean
  isSavedMessages: boolean
  isGroup: boolean
  isChannel: boolean
  username?: string
  phone?: string
}

export interface TelegramMessage {
  id: number
  chatId: string
  text: string
  date: number
  out: boolean
  senderName: string
  senderId: string
  replyToId?: number
  media?: MessageMedia
}

export interface MessageMedia {
  type: 'photo' | 'document' | 'video' | 'voice' | 'sticker'
  url?: string
  fileName?: string
  size?: number
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

export interface AppTheme {
  mode: 'dark' | 'light'
}

export interface ElectronAPI {
  telegram: {
    connect: () => Promise<void>
    getQRUrl: () => Promise<string>
    loginWithPhone: (phone: string) => Promise<{ phoneCodeHash: string }>
    verifyCode: (phone: string, code: string, phoneCodeHash: string) => Promise<VerifyCodeResult>
    submit2FA: (password: string) => Promise<boolean>
    checkPassword: (password: string) => Promise<boolean>
    isAuthorized: () => Promise<boolean>
    getMe: () => Promise<TelegramUser | null>
    getUserInfo: (userId: string) => Promise<UserProfile | null>
    getDialogs: (limit?: number) => Promise<TelegramDialog[]>
    getMessages: (chatId: string, limit?: number) => Promise<TelegramMessage[]>
    sendMessage: (chatId: string, text: string) => Promise<SendMessageResult>
    markRead: (chatId: string) => Promise<void>
    logout: () => Promise<void>
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
