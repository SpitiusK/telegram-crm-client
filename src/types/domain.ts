// Domain entities — shared between renderer types

export interface Account {
  id: number
  phone: string
  name: string
  sessionString: string
  isActive: boolean
  createdAt: string
}

export interface Chat {
  id: number
  accountId: number
  telegramChatId: string
  title: string
  type: 'user' | 'group' | 'supergroup' | 'channel'
  unreadCount: number
  lastMessageAt: string | null
  pinned: boolean
}

export interface Message {
  id: number
  chatId: number
  telegramMsgId: number
  senderId: string
  senderName: string
  text: string
  date: number
  isOutgoing: boolean
  replyToMsgId: number | null
  mediaType: 'photo' | 'document' | 'video' | 'voice' | 'sticker' | null
}

export interface Contact {
  id: number
  telegramUserId: string
  firstName: string
  lastName: string
  username: string | null
  phone: string | null
  bitrixContactId: string | null
}

export interface Deal {
  id: number
  bitrixDealId: string
  title: string
  stageId: string
  stageName: string
  amount: number
  contactId: number | null
  assignedUser: string
  createdAt: string
  updatedAt: string
}

export interface DealStage {
  id: string
  name: string
  color: string
  sort: number
}

export interface DealStageHistoryEntry {
  id: number
  dealId: number
  fromStage: string
  toStage: string
  changedAt: string
  changedBy: string
}

export interface ActivityEntry {
  id: number
  accountId: number
  actionType: string
  entityType: string
  entityId: string
  detailsJson: string
  createdAt: string
}

export interface Setting {
  key: string
  value: string
  updatedAt: string
}
