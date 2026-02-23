import { create } from 'zustand'
import { telegramAPI } from '../lib/telegram'
import { useAuthStore } from './auth'
import type { TelegramDialog, TelegramMessage, ForumTopic, SearchResult, DialogFilter } from '../types'

const DRAFTS_KEY = 'telegram-crm-drafts'
const PINNED_KEY = 'telegram-crm-pinned'
const MUTED_KEY = 'telegram-crm-muted'

function loadStringSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((v): v is string => typeof v === 'string'))
      }
    }
  } catch {
    // ignore
  }
  return new Set()
}

function persistStringSet(key: string, s: Set<string>): void {
  localStorage.setItem(key, JSON.stringify([...s]))
}

function loadDrafts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>
      }
    }
  } catch {
    // ignore
  }
  return {}
}

function persistDrafts(drafts: Record<string, string>): void {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
}

interface TypingEntry {
  userId: string
  timestamp: number
}

export type ChatFolder = 'all' | 'users' | 'groups' | 'channels' | 'forums' | 'bots' | 'archive' | `folder:${number}`

export interface AccountChatState {
  dialogs: TelegramDialog[]
  messages: Record<string, TelegramMessage[]>
  typingUsers: Record<string, TypingEntry[]>
}

function emptyAccountState(): AccountChatState {
  return { dialogs: [], messages: {}, typingUsers: {} }
}

interface ChatsState {
  dialogs: TelegramDialog[]
  messages: TelegramMessage[]
  activeChat: { accountId: string; chatId: string } | null
  activeFolder: ChatFolder
  searchQuery: string
  isLoadingDialogs: boolean
  isLoadingMessages: boolean
  scrollPositions: Record<string, number>
  forumTopics: ForumTopic[]
  activeTopic: number | null
  isLoadingTopics: boolean
  replyingTo: TelegramMessage | null
  editingMessage: TelegramMessage | null
  drafts: Record<string, string>
  typingUsers: Record<string, TypingEntry[]>
  searchResults: SearchResult[]
  isSearching: boolean
  hasMoreMessages: boolean
  isLoadingMoreMessages: boolean
  pinnedChats: Set<string>
  mutedChats: Set<string>
  userFolders: DialogFilter[]
  archivedDialogs: TelegramDialog[]
  isLoadingArchive: boolean
  accountStates: Record<string, AccountChatState>
  getAccountState: (accountId: string) => AccountChatState
  loadMoreMessages: () => Promise<void>
  searchMessages: (query: string, chatId?: string) => Promise<void>
  clearSearch: () => void
  togglePin: (chatId: string) => void
  toggleMute: (chatId: string) => void
  removeDialog: (chatId: string) => void
  loadDialogs: () => Promise<void>
  loadAllAccountDialogs: () => Promise<void>
  loadUserFolders: () => Promise<void>
  loadArchivedDialogs: () => Promise<void>
  setActiveFolder: (folder: ChatFolder) => void
  setActiveChat: (chatId: string) => Promise<void>
  setActiveTopic: (topicId: number) => Promise<void>
  clearActiveTopic: () => void
  sendMessage: (text: string) => Promise<void>
  sendFile: (filePath: string) => Promise<void>
  sendPhoto: (base64Data: string) => Promise<void>
  setReplyingTo: (msg: TelegramMessage | null) => void
  setEditingMessage: (msg: TelegramMessage | null) => void
  editMessage: (messageId: number, text: string) => Promise<void>
  deleteMessages: (messageIds: number[]) => Promise<void>
  setSearchQuery: (query: string) => void
  saveScrollPosition: (chatId: string, position: number) => void
  saveDraft: (chatId: string, text: string) => void
  getDraft: (chatId: string) => string
  clearDraft: (chatId: string) => void
  addTypingUser: (chatId: string, userId: string, accountId?: string) => void
  setupRealtimeUpdates: () => () => void
}

export const useChatsStore = create<ChatsState>((set, get) => ({
  dialogs: [],
  messages: [],
  activeChat: null,
  activeFolder: 'all',
  searchQuery: '',
  isLoadingDialogs: false,
  isLoadingMessages: false,
  scrollPositions: {},
  forumTopics: [],
  activeTopic: null,
  isLoadingTopics: false,
  replyingTo: null,
  editingMessage: null,
  drafts: loadDrafts(),
  typingUsers: {},
  searchResults: [],
  hasMoreMessages: true,
  isLoadingMoreMessages: false,
  isSearching: false,
  pinnedChats: loadStringSet(PINNED_KEY),
  mutedChats: loadStringSet(MUTED_KEY),
  userFolders: [],
  archivedDialogs: [],
  isLoadingArchive: false,
  accountStates: {},
  getAccountState: (accountId: string) => {
    const existing = get().accountStates[accountId]
    if (existing) return existing
    const fresh = emptyAccountState()
    set((state) => ({
      accountStates: { ...state.accountStates, [accountId]: fresh },
    }))
    return fresh
  },

  loadMoreMessages: async () => {
    const { activeChat, messages, hasMoreMessages, isLoadingMoreMessages, isLoadingMessages } = get()
    if (!activeChat || !hasMoreMessages || isLoadingMoreMessages || isLoadingMessages) return
    if (messages.length === 0) return

    const oldestMsg = messages[0]
    if (!oldestMsg) return

    set({ isLoadingMoreMessages: true })
    try {
      const olderMessages = await telegramAPI.getMessages(activeChat.chatId, 50, oldestMsg.id, activeChat.accountId)
      set((state) => ({
        messages: [...olderMessages, ...state.messages],
        hasMoreMessages: olderMessages.length >= 50,
        isLoadingMoreMessages: false,
      }))
    } catch {
      set({ isLoadingMoreMessages: false })
    }
  },

  searchMessages: async (query: string, chatId?: string) => {
    set({ isSearching: true, searchResults: [] })
    try {
      const accounts = useAuthStore.getState().accounts
      let results: SearchResult[]
      if (accounts.length > 1 && !chatId) {
        // Search all accounts in parallel, tag each result with accountId
        const perAccount = await Promise.all(
          accounts.map(async (acc) => {
            try {
              const hits = await telegramAPI.searchMessages(query, chatId, 20, acc.id)
              return hits.map((r) => ({ ...r, accountId: acc.id }))
            } catch {
              return [] as SearchResult[]
            }
          })
        )
        results = perAccount.flat().sort((a, b) => b.date - a.date)
      } else {
        results = await telegramAPI.searchMessages(query, chatId, 20)
      }
      set({ searchResults: results, isSearching: false })
    } catch {
      set({ isSearching: false })
    }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),

  togglePin: (chatId: string) => {
    set((state) => {
      const next = new Set(state.pinnedChats)
      if (next.has(chatId)) {
        next.delete(chatId)
      } else {
        next.add(chatId)
      }
      persistStringSet(PINNED_KEY, next)
      return { pinnedChats: next }
    })
  },

  toggleMute: (chatId: string) => {
    set((state) => {
      const next = new Set(state.mutedChats)
      if (next.has(chatId)) {
        next.delete(chatId)
      } else {
        next.add(chatId)
      }
      persistStringSet(MUTED_KEY, next)
      void telegramAPI.setNotificationSettings({ mutedChats: [...next] })
      return { mutedChats: next }
    })
  },

  removeDialog: (chatId: string) => {
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.id !== chatId),
      ...(state.activeChat?.chatId === chatId ? { activeChat: null, messages: [] } : {}),
    }))
  },

  setActiveFolder: (folder: ChatFolder) => set({ activeFolder: folder }),

  loadDialogs: async () => {
    set({ isLoadingDialogs: true })
    try {
      const accountId = useAuthStore.getState().activeAccountId
      const dialogs = await telegramAPI.getDialogs(100)
      const tagged = dialogs.map((d) => ({ ...d, accountId }))
      set((state) => ({
        dialogs: tagged,
        isLoadingDialogs: false,
        accountStates: {
          ...state.accountStates,
          [accountId]: { ...state.getAccountState(accountId), dialogs: tagged },
        },
      }))
    } catch {
      set({ isLoadingDialogs: false })
    }
  },

  loadAllAccountDialogs: async () => {
    const accounts = useAuthStore.getState().accounts
    const activeAccountId = useAuthStore.getState().activeAccountId
    const results = await Promise.all(
      accounts.map(async (acc) => {
        try {
          const dialogs = await telegramAPI.getDialogs(100, acc.id)
          return { accountId: acc.id, dialogs: dialogs.map((d) => ({ ...d, accountId: acc.id })) }
        } catch {
          return { accountId: acc.id, dialogs: [] as TelegramDialog[] }
        }
      })
    )
    set((state) => {
      const nextAccountStates = { ...state.accountStates }
      let activeDialogs: TelegramDialog[] = state.dialogs
      for (const { accountId, dialogs } of results) {
        nextAccountStates[accountId] = {
          ...(state.accountStates[accountId] ?? emptyAccountState()),
          dialogs,
        }
        if (accountId === activeAccountId) {
          activeDialogs = dialogs
        }
      }
      return { accountStates: nextAccountStates, dialogs: activeDialogs }
    })
  },

  loadUserFolders: async () => {
    try {
      const folders = await telegramAPI.getDialogFilters()
      set({ userFolders: folders })
    } catch {
      // ignore — folders are optional
    }
  },

  loadArchivedDialogs: async () => {
    const { archivedDialogs, isLoadingArchive } = get()
    if (archivedDialogs.length > 0 || isLoadingArchive) return
    set({ isLoadingArchive: true })
    try {
      const archived = await telegramAPI.getArchivedDialogs()
      set({ archivedDialogs: archived, isLoadingArchive: false })
    } catch {
      set({ isLoadingArchive: false })
    }
  },

  setActiveChat: async (chatId: string) => {
    const dialog = get().dialogs.find((d) => d.id === chatId)
      ?? get().archivedDialogs.find((d) => d.id === chatId)

    // Resolve accountId from the dialog's owning account, not the active account
    let accountId = useAuthStore.getState().activeAccountId
    const { accountStates } = get()
    for (const [acctId, acctState] of Object.entries(accountStates)) {
      if (acctState.dialogs.some((d) => d.id === chatId)) {
        accountId = acctId
        break
      }
    }

    if (dialog?.isForum) {
      // Forum group: load topics instead of messages
      set({ activeChat: { accountId, chatId }, activeTopic: null, forumTopics: [], messages: [], isLoadingTopics: true, isLoadingMessages: false })
      try {
        const topics = await telegramAPI.getForumTopics(chatId, accountId)
        set({ forumTopics: topics, isLoadingTopics: false })
      } catch {
        set({ isLoadingTopics: false })
      }
    } else {
      // Regular chat: load messages
      set({ activeChat: { accountId, chatId }, activeTopic: null, forumTopics: [], isLoadingMessages: true, messages: [], hasMoreMessages: true })
      try {
        const messages = await telegramAPI.getMessages(chatId, 50, undefined, accountId)
        set((state) => ({
          messages,
          isLoadingMessages: false,
          hasMoreMessages: messages.length >= 50,
          accountStates: {
            ...state.accountStates,
            [accountId]: {
              ...(state.accountStates[accountId] ?? emptyAccountState()),
              messages: {
                ...(state.accountStates[accountId]?.messages ?? {}),
                [chatId]: messages,
              },
            },
          },
        }))
        void telegramAPI.markRead(chatId, accountId)
        set((state) => ({
          dialogs: state.dialogs.map((d) =>
            d.id === chatId ? { ...d, unreadCount: 0 } : d
          ),
        }))
      } catch {
        set({ isLoadingMessages: false })
      }
    }
  },

  setActiveTopic: async (topicId: number) => {
    const { activeChat } = get()
    if (!activeChat) return
    set({ activeTopic: topicId, isLoadingMessages: true, messages: [], hasMoreMessages: true })
    try {
      const messages = await telegramAPI.getTopicMessages(activeChat.chatId, topicId, 50, activeChat.accountId)
      set({ messages, isLoadingMessages: false, hasMoreMessages: messages.length >= 50 })
    } catch {
      set({ isLoadingMessages: false })
    }
  },

  clearActiveTopic: () => {
    set({ activeTopic: null, messages: [] })
  },

  sendMessage: async (text: string) => {
    const { activeChat, activeTopic, editingMessage, replyingTo } = get()
    if (!activeChat) return

    // Edit mode: update existing message instead of sending new
    if (editingMessage) {
      await get().editMessage(editingMessage.id, text)
      return
    }

    const replyToId = replyingTo?.id
    const result = activeTopic !== null
      ? await telegramAPI.sendTopicMessage(activeChat.chatId, activeTopic, text, activeChat.accountId)
      : await telegramAPI.sendMessage(activeChat.chatId, text, replyToId, activeChat.accountId)

    // Optimistically add to messages
    const newMsg: TelegramMessage = {
      id: result.id,
      chatId: activeChat.chatId,
      text,
      date: result.date,
      out: true,
      senderName: 'You',
      senderId: '',
      ...(replyingTo ? {
        replyToId: replyingTo.id,
        replyToMessage: { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName },
      } : {}),
    }
    set((state) => {
      const acctId = activeChat.accountId
      const acctState = state.accountStates[acctId] ?? emptyAccountState()
      const chatMsgs = acctState.messages[activeChat.chatId] ?? []
      return {
        messages: [...state.messages, newMsg],
        replyingTo: null,
        accountStates: {
          ...state.accountStates,
          [acctId]: {
            ...acctState,
            messages: { ...acctState.messages, [activeChat.chatId]: [...chatMsgs, newMsg] },
          },
        },
      }
    })
  },

  sendFile: async (filePath: string) => {
    const { activeChat, replyingTo } = get()
    if (!activeChat) return
    const replyToId = replyingTo?.id
    await telegramAPI.sendFile(activeChat.chatId, filePath, undefined, replyToId, activeChat.accountId)
    set({ replyingTo: null })
  },

  sendPhoto: async (base64Data: string) => {
    const { activeChat, replyingTo } = get()
    if (!activeChat) return
    const replyToId = replyingTo?.id
    await telegramAPI.sendPhoto(activeChat.chatId, base64Data, undefined, replyToId, activeChat.accountId)
    set({ replyingTo: null })
  },

  setReplyingTo: (msg: TelegramMessage | null) => set({ replyingTo: msg, editingMessage: null }),
  setEditingMessage: (msg: TelegramMessage | null) => set({ editingMessage: msg, replyingTo: null }),

  editMessage: async (messageId: number, text: string) => {
    const { activeChat } = get()
    if (!activeChat) return
    await telegramAPI.editMessage(activeChat.chatId, messageId, text, activeChat.accountId)
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, text, isEdited: true } : m
      ),
      editingMessage: null,
    }))
  },

  deleteMessages: async (messageIds: number[]) => {
    const { activeChat } = get()
    if (!activeChat) return
    await telegramAPI.deleteMessages(activeChat.chatId, messageIds, undefined, activeChat.accountId)
    set((state) => ({
      messages: state.messages.filter((m) => !messageIds.includes(m.id)),
    }))
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  saveScrollPosition: (chatId: string, position: number) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [chatId]: position },
    })),

  saveDraft: (chatId: string, text: string) => {
    set((state) => {
      const drafts = { ...state.drafts }
      if (text.trim()) {
        drafts[chatId] = text
      } else {
        delete drafts[chatId]
      }
      persistDrafts(drafts)
      return { drafts }
    })
  },

  getDraft: (chatId: string) => {
    return get().drafts[chatId] ?? ''
  },

  clearDraft: (chatId: string) => {
    set((state) => {
      const drafts = { ...state.drafts }
      delete drafts[chatId]
      persistDrafts(drafts)
      return { drafts }
    })
  },

  addTypingUser: (chatId: string, userId: string, accountId?: string) => {
    const entry: TypingEntry = { userId, timestamp: Date.now() }
    set((state) => {
      const existing = state.typingUsers[chatId] ?? []
      const filtered = existing.filter((e) => e.userId !== userId)
      const nextFlat = {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: [...filtered, entry],
        },
      }
      if (!accountId) return nextFlat
      const acctState = state.accountStates[accountId] ?? emptyAccountState()
      const acctExisting = acctState.typingUsers[chatId] ?? []
      const acctFiltered = acctExisting.filter((e) => e.userId !== userId)
      return {
        ...nextFlat,
        accountStates: {
          ...state.accountStates,
          [accountId]: {
            ...acctState,
            typingUsers: {
              ...acctState.typingUsers,
              [chatId]: [...acctFiltered, entry],
            },
          },
        },
      }
    })
    // Auto-expire after 5 seconds
    setTimeout(() => {
      set((state) => {
        const entries = state.typingUsers[chatId]
        if (!entries) return state
        const now = Date.now()
        const filtered = entries.filter((e) => now - e.timestamp < 5000)
        const result: Partial<ChatsState> = {
          typingUsers: {
            ...state.typingUsers,
            [chatId]: filtered,
          },
        }
        if (accountId) {
          const acctState = state.accountStates[accountId] ?? emptyAccountState()
          const acctEntries = acctState.typingUsers[chatId] ?? []
          const acctFiltered = acctEntries.filter((e) => now - e.timestamp < 5000)
          result.accountStates = {
            ...state.accountStates,
            [accountId]: {
              ...acctState,
              typingUsers: {
                ...acctState.typingUsers,
                [chatId]: acctFiltered,
              },
            },
          }
        }
        return result
      })
    }, 5500)
  },

  setupRealtimeUpdates: () => {
    // Sync muted chats to main process on startup
    void telegramAPI.setNotificationSettings({ mutedChats: [...get().mutedChats] })

    // Listen for notification clicks — navigate to the chat
    const cleanupNotification = telegramAPI.onNotificationClick((chatId: string) => {
      void get().setActiveChat(chatId)
    })

    const cleanup = telegramAPI.onUpdate((event, data) => {
      if (event === 'newMessage') {
        const msg = data as TelegramMessage
        const { activeChat } = get()

        // If the message is for the active chat, append it
        if (activeChat && msg.chatId === activeChat.chatId) {
          set((state) => ({ messages: [...state.messages, msg] }))
          // Mark as read immediately
          void telegramAPI.markRead(activeChat.chatId)
        }

        // Also store in accountStates messages
        const msgAcctId = msg.accountId
        if (msgAcctId) {
          set((state) => {
            const acctState = state.accountStates[msgAcctId] ?? emptyAccountState()
            const chatMsgs = acctState.messages[msg.chatId] ?? []
            return {
              accountStates: {
                ...state.accountStates,
                [msgAcctId]: {
                  ...acctState,
                  messages: { ...acctState.messages, [msg.chatId]: [...chatMsgs, msg] },
                },
              },
            }
          })
        }

        // Update dialog list: move chat to top, update preview
        set((state) => {
          const updateDialogList = (dialogs: TelegramDialog[]) => {
            const updated = dialogs.map((d) => {
              if (d.id === msg.chatId) {
                return {
                  ...d,
                  lastMessage: msg.text,
                  lastMessageDate: msg.date,
                  unreadCount: msg.chatId === activeChat?.chatId ? 0 : d.unreadCount + 1,
                }
              }
              return d
            })
            updated.sort((a, b) => b.lastMessageDate - a.lastMessageDate)
            return updated
          }

          const nextDialogs = updateDialogList(state.dialogs)

          // Also update accountStates if the message has an accountId
          const msgAccountId = msg.accountId
          if (msgAccountId && state.accountStates[msgAccountId]) {
            const acctState = state.accountStates[msgAccountId]
            return {
              dialogs: nextDialogs,
              accountStates: {
                ...state.accountStates,
                [msgAccountId]: { ...acctState, dialogs: updateDialogList(acctState.dialogs) },
              },
            }
          }
          return { dialogs: nextDialogs }
        })
      }

      if (event === 'typing') {
        const { chatId, userId, accountId: typingAccountId } = data as { chatId: string; userId: string; accountId?: string }
        get().addTypingUser(chatId, userId, typingAccountId)
      }
    })
    return () => {
      cleanup()
      cleanupNotification()
    }
  },
}))
