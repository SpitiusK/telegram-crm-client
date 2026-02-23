import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatsStore } from '../../stores/chats'
import { telegramAPI } from '../../lib/telegram'
import type { SearchResult } from '../../types'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { UserProfilePanel } from './user-profile-panel'
import { ForumTopicsList } from './forum-topics-list'

function formatResultDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ChatView() {
  const { activeChat, dialogs, activeTopic, forumTopics, clearActiveTopic, typingUsers } = useChatsStore()
  const [showProfile, setShowProfile] = useState(false)
  const [showChatSearch, setShowChatSearch] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState<SearchResult[]>([])
  const [isChatSearching, setIsChatSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const typingEntries = activeChat ? (typingUsers[activeChat.chatId] ?? []) : []
  const isTyping = typingEntries.some((e) => Date.now() - e.timestamp < 5000)

  // Reset chat search when switching chats
  useEffect(() => {
    setShowChatSearch(false)
    setChatSearchQuery('')
    setChatSearchResults([])
  }, [activeChat])

  // Focus search input when opened
  useEffect(() => {
    if (showChatSearch) {
      searchInputRef.current?.focus()
    }
  }, [showChatSearch])

  const performChatSearch = useCallback(async (query: string) => {
    if (!activeChat || query.trim().length < 2) {
      setChatSearchResults([])
      return
    }
    setIsChatSearching(true)
    try {
      const results = await telegramAPI.searchMessages(query.trim(), activeChat.chatId, 20)
      setChatSearchResults(results)
    } catch {
      setChatSearchResults([])
    } finally {
      setIsChatSearching(false)
    }
  }, [activeChat])

  const handleChatSearchChange = (value: string) => {
    setChatSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setChatSearchResults([])
      return
    }
    debounceRef.current = setTimeout(() => void performChatSearch(value), 500)
  }

  const handleChatSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void performChatSearch(chatSearchQuery)
    }
    if (e.key === 'Escape') {
      setShowChatSearch(false)
      setChatSearchQuery('')
      setChatSearchResults([])
    }
  }

  const closeChatSearch = () => {
    setShowChatSearch(false)
    setChatSearchQuery('')
    setChatSearchResults([])
  }

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-telegram-bg">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-telegram-text-secondary text-lg">Select a chat to start messaging</p>
        </div>
      </div>
    )
  }

  const currentDialog = dialogs.find((d) => d.id === activeChat.chatId)

  return (
    <div className="flex-1 flex min-w-0">
      <div className="flex-1 flex flex-col bg-telegram-bg min-w-0">
        {/* Chat header */}
        <div className="h-14 px-4 flex items-center border-b border-telegram-border bg-telegram-sidebar">
          {/* Back button for topic view */}
          {currentDialog?.isForum && activeTopic !== null && (
            <button
              onClick={() => clearActiveTopic()}
              className="mr-2 p-1.5 rounded-full hover:bg-telegram-hover transition-colors"
              title="Back to topics"
            >
              <svg className="w-5 h-5 text-telegram-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
          >
            {currentDialog?.avatar ? (
              <img src={currentDialog.avatar} alt="" className="w-9 h-9 rounded-full object-cover mr-3" />
            ) : null}
            <div className="min-w-0">
              <h2 className="text-telegram-text text-sm font-semibold truncate">
                {currentDialog?.isForum && activeTopic !== null
                  ? forumTopics.find((t) => t.id === activeTopic)?.title ?? 'Topic'
                  : currentDialog?.title ?? 'Chat'}
              </h2>
              <p className="text-telegram-text-secondary text-xs">
                {isTyping ? (
                  <span className="text-telegram-accent">
                    typing
                    <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-pulse" style={{ animationDelay: '300ms' }}>.</span>
                    <span className="animate-pulse" style={{ animationDelay: '600ms' }}>.</span>
                  </span>
                ) : currentDialog?.isForum && activeTopic === null
                  ? `${forumTopics.length} topics`
                  : currentDialog?.username ? `@${currentDialog.username}` : (
                    currentDialog?.isGroup ? 'group' :
                    currentDialog?.isChannel ? 'channel' :
                    currentDialog?.isUser ? 'user' : ''
                  )}
              </p>
            </div>
          </button>

          {/* Search button */}
          <button
            onClick={() => {
              if (showChatSearch) {
                closeChatSearch()
              } else {
                setShowChatSearch(true)
              }
            }}
            className={`p-2 rounded-full transition-colors ${
              showChatSearch
                ? 'bg-telegram-accent/20 text-telegram-accent'
                : 'hover:bg-telegram-hover text-telegram-text-secondary hover:text-telegram-text'
            }`}
            title="Search in chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* In-chat search bar */}
        {showChatSearch && (
          <div className="px-4 py-2 bg-telegram-sidebar border-b border-telegram-border flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-telegram-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search in this chat..."
                value={chatSearchQuery}
                onChange={(e) => handleChatSearchChange(e.target.value)}
                onKeyDown={handleChatSearchKeyDown}
                className="w-full pl-10 pr-3 py-1.5 bg-telegram-input text-telegram-text text-sm rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-telegram-accent placeholder:text-telegram-text-secondary"
              />
            </div>
            <button
              onClick={closeChatSearch}
              className="p-1.5 rounded-full hover:bg-telegram-hover text-telegram-text-secondary hover:text-telegram-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* In-chat search results dropdown */}
        {showChatSearch && (chatSearchResults.length > 0 || isChatSearching) && (
          <div className="bg-telegram-sidebar border-b border-telegram-border max-h-60 overflow-y-auto scrollbar-thin">
            {isChatSearching ? (
              <div className="flex items-center justify-center py-3">
                <div className="w-4 h-4 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-telegram-text-secondary text-xs">Searching...</span>
              </div>
            ) : (
              chatSearchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    // TODO: scroll to message if it's in the loaded messages
                    closeChatSearch()
                  }}
                  className="w-full px-4 py-2 flex items-start gap-2 text-left hover:bg-telegram-hover transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-telegram-text text-xs font-medium truncate">{result.senderName || (result.out ? 'You' : 'Unknown')}</span>
                      <span className="text-telegram-text-secondary text-[10px] flex-shrink-0 ml-2">{formatResultDate(result.date)}</span>
                    </div>
                    <p className="text-telegram-text-secondary text-xs truncate mt-0.5">
                      {result.text.length > 100 ? result.text.slice(0, 100) + '...' : result.text}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {showChatSearch && chatSearchQuery.trim().length >= 2 && !isChatSearching && chatSearchResults.length === 0 && (
          <div className="bg-telegram-sidebar border-b border-telegram-border px-4 py-3 text-center text-telegram-text-secondary text-xs">
            No messages found
          </div>
        )}

        {/* Content: forum topics list OR messages */}
        {currentDialog?.isForum && activeTopic === null ? (
          <ForumTopicsList />
        ) : (
          <>
            <MessageList />
            <MessageInput />
          </>
        )}
      </div>

      {/* Profile panel */}
      {showProfile && currentDialog && (
        <UserProfilePanel
          userId={currentDialog.id}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
