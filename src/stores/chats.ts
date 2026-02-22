import { create } from 'zustand'
import { telegramAPI } from '../lib/telegram'
import type { TelegramDialog, TelegramMessage } from '../types'

interface ChatsState {
  dialogs: TelegramDialog[]
  messages: TelegramMessage[]
  activeChat: string | null
  searchQuery: string
  isLoadingDialogs: boolean
  isLoadingMessages: boolean
  loadDialogs: () => Promise<void>
  setActiveChat: (chatId: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setupRealtimeUpdates: () => () => void
}

export const useChatsStore = create<ChatsState>((set, get) => ({
  dialogs: [],
  messages: [],
  activeChat: null,
  searchQuery: '',
  isLoadingDialogs: false,
  isLoadingMessages: false,

  loadDialogs: async () => {
    set({ isLoadingDialogs: true })
    try {
      const dialogs = await telegramAPI.getDialogs(100)
      set({ dialogs, isLoadingDialogs: false })
    } catch {
      set({ isLoadingDialogs: false })
    }
  },

  setActiveChat: async (chatId: string) => {
    set({ activeChat: chatId, isLoadingMessages: true, messages: [] })
    try {
      const messages = await telegramAPI.getMessages(chatId, 50)
      set({ messages, isLoadingMessages: false })
      // Mark as read
      void telegramAPI.markRead(chatId)
      // Update unread count in dialog list
      set((state) => ({
        dialogs: state.dialogs.map((d) =>
          d.id === chatId ? { ...d, unreadCount: 0 } : d
        ),
      }))
    } catch {
      set({ isLoadingMessages: false })
    }
  },

  sendMessage: async (text: string) => {
    const { activeChat } = get()
    if (!activeChat) return
    const result = await telegramAPI.sendMessage(activeChat, text)
    // Optimistically add to messages
    const newMsg: TelegramMessage = {
      id: result.id,
      chatId: activeChat,
      text,
      date: result.date,
      out: true,
      senderName: 'You',
      senderId: '',
    }
    set((state) => ({ messages: [...state.messages, newMsg] }))
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setupRealtimeUpdates: () => {
    const cleanup = telegramAPI.onUpdate((event, data) => {
      if (event === 'newMessage') {
        const msg = data as TelegramMessage
        const { activeChat } = get()

        // If the message is for the active chat, append it
        if (msg.chatId === activeChat) {
          set((state) => ({ messages: [...state.messages, msg] }))
          // Mark as read immediately
          void telegramAPI.markRead(activeChat)
        }

        // Update dialog list: move chat to top, update preview
        set((state) => {
          const updated = state.dialogs.map((d) => {
            if (d.id === msg.chatId) {
              return {
                ...d,
                lastMessage: msg.text,
                lastMessageDate: msg.date,
                unreadCount: msg.chatId === activeChat ? 0 : d.unreadCount + 1,
              }
            }
            return d
          })
          // Sort: move updated chat to top
          updated.sort((a, b) => b.lastMessageDate - a.lastMessageDate)
          return { dialogs: updated }
        })
      }
    })
    return cleanup
  },
}))
