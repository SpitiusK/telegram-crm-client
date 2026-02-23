import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatsStore } from '../chats'
import { useAuthStore } from '../auth'
import type { TelegramDialog, TelegramMessage, TelegramAccount, SearchResult } from '../../types'

// Mock telegramAPI
vi.mock('../../lib/telegram', () => ({
  telegramAPI: {
    getDialogs: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    deleteMessages: vi.fn(),
    sendFile: vi.fn(),
    sendPhoto: vi.fn(),
    sendTopicMessage: vi.fn(),
    searchMessages: vi.fn(),
    markRead: vi.fn(),
    setTyping: vi.fn(),
    getForumTopics: vi.fn(),
    getDialogFilters: vi.fn(),
    getArchivedDialogs: vi.fn(),
    getAccounts: vi.fn(),
    connectAll: vi.fn(),
  },
}))

import { telegramAPI } from '../../lib/telegram'

// All keys are guaranteed by vi.mock above, safe to use Required
type MockedTelegramAPI = { [K in keyof typeof telegramAPI]: ReturnType<typeof vi.fn> }
const mockTelegram: MockedTelegramAPI = telegramAPI as unknown as MockedTelegramAPI

// --- Factories ---

function makeAccount(overrides: Partial<TelegramAccount> = {}): TelegramAccount {
  return {
    id: 'acc-A',
    firstName: 'Alice',
    lastName: '',
    username: '',
    phone: '+1111',
    ...overrides,
  }
}

function makeDialog(overrides: Partial<TelegramDialog> = {}): TelegramDialog {
  return {
    id: 'chat-1',
    name: 'Test Chat',
    type: 'user' as const,
    unreadCount: 0,
    lastMessage: 'Hello',
    lastMessageDate: Date.now() / 1000,
    ...overrides,
  } as TelegramDialog
}

function makeMessage(overrides: Partial<TelegramMessage> = {}): TelegramMessage {
  return {
    id: 1,
    chatId: 'chat-1',
    text: 'Test message',
    date: Date.now() / 1000,
    out: false,
    senderName: 'User',
    senderId: 'user-1',
    ...overrides,
  } as TelegramMessage
}

function setupMultiAccount() {
  useAuthStore.setState({
    accounts: [
      makeAccount({ id: 'acc-A', firstName: 'Alice', phone: '+1111' }),
      makeAccount({ id: 'acc-B', firstName: 'Bob', phone: '+2222' }),
    ],
    activeAccountId: 'acc-A',
  })
}

function resetStores() {
  useChatsStore.setState(useChatsStore.getInitialState())
  useAuthStore.setState({
    accounts: [makeAccount({ id: 'acc-A', firstName: 'Alice', phone: '+1111' })],
    activeAccountId: 'acc-A',
    isAuthorized: true,
    isLoading: false,
    currentUser: null,
  })
  vi.clearAllMocks()
}

// --- Tests ---

describe('Multi-Account Chat Store', () => {
  beforeEach(resetStores)

  // GROUP 1: Account State Management
  describe('Account State Management', () => {
    it('getAccountState returns empty state for unknown account', () => {
      const state = useChatsStore.getState().getAccountState('unknown-id')
      expect(state.dialogs).toEqual([])
      expect(state.messages).toEqual({})
      expect(state.typingUsers).toEqual({})
    })

    it('getAccountState returns same reference for same account', () => {
      const s1 = useChatsStore.getState().getAccountState('acc-A')
      const s2 = useChatsStore.getState().getAccountState('acc-A')
      expect(s1).toBe(s2)
    })

    it('loadDialogs populates accountStates', async () => {
      const dialogs = [makeDialog({ id: 'chat-1' }), makeDialog({ id: 'chat-2' })]
      mockTelegram.getDialogs.mockResolvedValue(dialogs)

      await useChatsStore.getState().loadDialogs()

      const accState = useChatsStore.getState().accountStates['acc-A']
      expect(accState).toBeDefined()
      expect(accState?.dialogs).toHaveLength(2)
      // Dialogs should be tagged with accountId
      expect(accState?.dialogs[0]?.accountId).toBe('acc-A')
    })

    it('loadAllAccountDialogs populates all accounts', async () => {
      setupMultiAccount()
      const dialogsA = [makeDialog({ id: 'chat-A1' })]
      const dialogsB = [makeDialog({ id: 'chat-B1' }), makeDialog({ id: 'chat-B2' })]

      mockTelegram.getDialogs
        .mockImplementation(async (_limit: number, accountId?: string) => {
          if (accountId === 'acc-A') return dialogsA
          if (accountId === 'acc-B') return dialogsB
          return []
        })

      await useChatsStore.getState().loadAllAccountDialogs()

      const stateA = useChatsStore.getState().accountStates['acc-A']
      const stateB = useChatsStore.getState().accountStates['acc-B']
      expect(stateA?.dialogs).toHaveLength(1)
      expect(stateB?.dialogs).toHaveLength(2)
      expect(stateB?.dialogs[0]?.accountId).toBe('acc-B')
    })

    it('loadAllAccountDialogs sets flat dialogs to active account', async () => {
      setupMultiAccount()
      const dialogsA = [makeDialog({ id: 'chat-A1' })]
      const dialogsB = [makeDialog({ id: 'chat-B1' })]

      mockTelegram.getDialogs.mockImplementation(async (_limit: number, accountId?: string) => {
        return accountId === 'acc-A' ? dialogsA : dialogsB
      })

      await useChatsStore.getState().loadAllAccountDialogs()

      // Flat dialogs should be active account's
      const flat = useChatsStore.getState().dialogs
      expect(flat).toHaveLength(1)
      expect(flat[0]?.id).toBe('chat-A1')
    })
  })

  // GROUP 2: Active Chat Routing & Read Status
  describe('Active Chat Routing (Bug #1: unread)', () => {
    it('setActiveChat resolves accountId from dialog owner, not active account', async () => {
      setupMultiAccount()
      // acc-B owns chat-B1
      useChatsStore.setState({
        accountStates: {
          'acc-A': { dialogs: [], messages: {}, typingUsers: {} },
          'acc-B': { dialogs: [makeDialog({ id: 'chat-B1', accountId: 'acc-B' })], messages: {}, typingUsers: {} },
        },
        dialogs: [],
      })
      mockTelegram.getMessages.mockResolvedValue([])

      await useChatsStore.getState().setActiveChat('chat-B1')

      const activeChat = useChatsStore.getState().activeChat
      expect(activeChat).not.toBeNull()
      expect(activeChat?.accountId).toBe('acc-B') // NOT acc-A
    })

    it('markRead is called with correct accountId', async () => {
      setupMultiAccount()
      useChatsStore.setState({
        accountStates: {
          'acc-A': { dialogs: [], messages: {}, typingUsers: {} },
          'acc-B': { dialogs: [makeDialog({ id: 'chat-B1', accountId: 'acc-B' })], messages: {}, typingUsers: {} },
        },
        dialogs: [makeDialog({ id: 'chat-B1', accountId: 'acc-B' })],
      })
      mockTelegram.getMessages.mockResolvedValue([makeMessage()])
      mockTelegram.markRead.mockResolvedValue(undefined)

      await useChatsStore.getState().setActiveChat('chat-B1')

      expect(mockTelegram.markRead).toHaveBeenCalledWith('chat-B1', 'acc-B')
    })

    it('getMessages is called with dialog owner accountId', async () => {
      setupMultiAccount()
      useChatsStore.setState({
        accountStates: {
          'acc-B': { dialogs: [makeDialog({ id: 'chat-B1', accountId: 'acc-B' })], messages: {}, typingUsers: {} },
        },
      })
      mockTelegram.getMessages.mockResolvedValue([])

      await useChatsStore.getState().setActiveChat('chat-B1')

      expect(mockTelegram.getMessages).toHaveBeenCalledWith('chat-B1', 50, undefined, 'acc-B')
    })
  })

  // GROUP 3: Message Order
  describe('Message Order (Bug #2: inverted)', () => {
    it('messages are stored in chronological order', async () => {
      const msgs = [
        makeMessage({ id: 1, date: 1000, text: 'oldest' }),
        makeMessage({ id: 2, date: 2000, text: 'middle' }),
        makeMessage({ id: 3, date: 3000, text: 'newest' }),
      ]
      mockTelegram.getMessages.mockResolvedValue(msgs)

      useChatsStore.setState({
        dialogs: [makeDialog({ id: 'chat-1' })],
      })

      await useChatsStore.getState().setActiveChat('chat-1')

      const stored = useChatsStore.getState().messages
      expect(stored[0]?.text).toBe('oldest')
      expect(stored[2]?.text).toBe('newest')
    })

    it('new incoming message appends at end', async () => {
      const existing = [
        makeMessage({ id: 1, date: 1000 }),
        makeMessage({ id: 2, date: 2000 }),
      ]
      useChatsStore.setState({
        activeChat: { accountId: 'acc-A', chatId: 'chat-1' },
        messages: existing,
        dialogs: [makeDialog({ id: 'chat-1' })],
      })

      // Simulate incoming message via sendMessage
      mockTelegram.sendMessage.mockResolvedValue({ id: 3, date: 3000 })
      await useChatsStore.getState().sendMessage('hello')

      const msgs = useChatsStore.getState().messages
      expect(msgs).toHaveLength(3)
      expect(msgs[2]?.id).toBe(3) // newest at end
    })

    it('loadMoreMessages prepends older messages', async () => {
      const existing = [
        makeMessage({ id: 10, date: 10000 }),
        makeMessage({ id: 11, date: 11000 }),
      ]
      const olderMsgs = [
        makeMessage({ id: 5, date: 5000 }),
        makeMessage({ id: 6, date: 6000 }),
      ]
      useChatsStore.setState({
        activeChat: { accountId: 'acc-A', chatId: 'chat-1' },
        messages: existing,
        hasMoreMessages: true,
        dialogs: [makeDialog({ id: 'chat-1' })],
      })
      mockTelegram.getMessages.mockResolvedValue(olderMsgs)

      await useChatsStore.getState().loadMoreMessages()

      const msgs = useChatsStore.getState().messages
      // Older messages should come BEFORE existing
      expect(msgs[0]?.id).toBe(5)
      expect(msgs[1]?.id).toBe(6)
      expect(msgs[2]?.id).toBe(10)
      expect(msgs[3]?.id).toBe(11)
    })
  })

  // GROUP 4: Message History Completeness
  describe('Message History (Bug #3: incomplete)', () => {
    it('messages are fetched with correct accountId for cross-account chat', async () => {
      setupMultiAccount()
      useChatsStore.setState({
        accountStates: {
          'acc-B': { dialogs: [makeDialog({ id: 'chat-B1', accountId: 'acc-B' })], messages: {}, typingUsers: {} },
        },
      })
      mockTelegram.getMessages.mockResolvedValue([
        makeMessage({ id: 1 }),
        makeMessage({ id: 2 }),
      ])

      await useChatsStore.getState().setActiveChat('chat-B1')

      // Must use acc-B, not acc-A
      expect(mockTelegram.getMessages).toHaveBeenCalledWith('chat-B1', 50, undefined, 'acc-B')
      expect(useChatsStore.getState().messages).toHaveLength(2)
    })

    it('loadMoreMessages uses activeChat.accountId', async () => {
      useChatsStore.setState({
        activeChat: { accountId: 'acc-B', chatId: 'chat-B1' },
        messages: [makeMessage({ id: 10, date: 10000 })],
        hasMoreMessages: true,
      })
      mockTelegram.getMessages.mockResolvedValue([makeMessage({ id: 5, date: 5000 })])

      await useChatsStore.getState().loadMoreMessages()

      const call = mockTelegram.getMessages.mock.calls[0] as unknown[]
      expect(call[0]).toBe('chat-B1') // chatId
      // accountId should be acc-B (last param)
      expect(call[3]).toBe('acc-B')
    })

    it('messages stored in accountStates per chat', async () => {
      useChatsStore.setState({
        accountStates: {
          'acc-A': { dialogs: [makeDialog({ id: 'chat-1' })], messages: {}, typingUsers: {} },
        },
        dialogs: [makeDialog({ id: 'chat-1' })],
      })
      const msgs = [makeMessage({ id: 1 }), makeMessage({ id: 2 })]
      mockTelegram.getMessages.mockResolvedValue(msgs)

      await useChatsStore.getState().setActiveChat('chat-1')

      const acctMsgs = useChatsStore.getState().accountStates['acc-A']?.messages['chat-1']
      expect(acctMsgs).toBeDefined()
      expect(acctMsgs).toHaveLength(2)
    })
  })

  // GROUP 5: Send/Edit/Delete Routing
  describe('Send/Edit/Delete Routing', () => {
    beforeEach(() => {
      useChatsStore.setState({
        activeChat: { accountId: 'acc-B', chatId: 'chat-B1' },
        messages: [makeMessage({ id: 1 })],
        dialogs: [makeDialog({ id: 'chat-B1' })],
      })
    })

    it('sendMessage passes accountId', async () => {
      mockTelegram.sendMessage.mockResolvedValue({ id: 2, date: Date.now() / 1000 })
      await useChatsStore.getState().sendMessage('hello')
      expect(mockTelegram.sendMessage).toHaveBeenCalledWith('chat-B1', 'hello', undefined, 'acc-B')
    })

    it('editMessage passes accountId', async () => {
      mockTelegram.editMessage.mockResolvedValue(undefined)
      await useChatsStore.getState().editMessage(1, 'edited')
      expect(mockTelegram.editMessage).toHaveBeenCalledWith('chat-B1', 1, 'edited', 'acc-B')
    })

    it('deleteMessages passes accountId', async () => {
      mockTelegram.deleteMessages.mockResolvedValue(undefined)
      await useChatsStore.getState().deleteMessages([1])
      expect(mockTelegram.deleteMessages).toHaveBeenCalledWith('chat-B1', [1], undefined, 'acc-B')
    })
  })

  // GROUP 6: Realtime Updates
  describe('Realtime Updates', () => {
    it('addTypingUser stores in accountStates when accountId provided', () => {
      useChatsStore.setState({
        accountStates: {
          'acc-B': { dialogs: [], messages: {}, typingUsers: {} },
        },
      })

      useChatsStore.getState().addTypingUser('chat-1', 'user-1', 'acc-B')

      const acctTyping = useChatsStore.getState().accountStates['acc-B']?.typingUsers['chat-1']
      expect(acctTyping).toBeDefined()
      expect(acctTyping).toHaveLength(1)
      expect(acctTyping?.[0]?.userId).toBe('user-1')

      // Also in flat state
      const flatTyping = useChatsStore.getState().typingUsers['chat-1']
      expect(flatTyping).toBeDefined()
      expect(flatTyping).toHaveLength(1)
    })

    it('addTypingUser without accountId only updates flat state', () => {
      useChatsStore.getState().addTypingUser('chat-1', 'user-1')

      const flatTyping = useChatsStore.getState().typingUsers['chat-1']
      expect(flatTyping).toBeDefined()
      expect(flatTyping).toHaveLength(1)
    })
  })

  // GROUP 7: Cross-Account Search
  describe('Cross-Account Search', () => {
    it('searches all accounts when multiple exist', async () => {
      setupMultiAccount()
      const resultsA: SearchResult[] = [
        { id: 1, chatId: 'chat-A1', chatName: 'Alice Chat', text: 'hello', date: 2000, senderName: 'X', out: false, senderId: 'u1' } as SearchResult,
      ]
      const resultsB: SearchResult[] = [
        { id: 2, chatId: 'chat-B1', chatName: 'Bob Chat', text: 'hello', date: 3000, senderName: 'Y', out: false, senderId: 'u2' } as SearchResult,
      ]

      mockTelegram.searchMessages.mockImplementation(async (_query: string, _chatId?: string, _limit?: number, accountId?: string) => {
        if (accountId === 'acc-A') return resultsA
        if (accountId === 'acc-B') return resultsB
        return []
      })

      await useChatsStore.getState().searchMessages('hello')

      const results = useChatsStore.getState().searchResults
      expect(results).toHaveLength(2)
      // Sorted by date descending — newest first
      expect(results[0]?.date).toBe(3000)
      expect(results[1]?.date).toBe(2000)
    })
  })
})
