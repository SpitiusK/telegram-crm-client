import { useState, useRef, useCallback, useEffect } from 'react'
import { telegramAPI } from '@/lib/telegram'
import { Spinner } from '@/components/ui/spinner'
import type { SearchResult } from '@/types'

function formatResultDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface ChatSearchBarProps {
  chatId: string
  accountId?: string
  isVisible: boolean
  onClose: () => void
}

export function ChatSearchBar({ chatId, accountId, isVisible, onClose }: ChatSearchBarProps) {
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState<SearchResult[]>([])
  const [isChatSearching, setIsChatSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Reset search when switching chats
  useEffect(() => {
    setChatSearchQuery('')
    setChatSearchResults([])
  }, [chatId])

  // Focus search input when opened
  useEffect(() => {
    if (isVisible) {
      searchInputRef.current?.focus()
    }
  }, [isVisible])

  const performChatSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setChatSearchResults([])
      return
    }
    setIsChatSearching(true)
    try {
      const results = await telegramAPI.searchMessages(query.trim(), chatId, 20, accountId)
      setChatSearchResults(results)
    } catch {
      setChatSearchResults([])
    } finally {
      setIsChatSearching(false)
    }
  }, [chatId, accountId])

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
      setChatSearchQuery('')
      setChatSearchResults([])
      onClose()
    }
  }

  const closeChatSearch = () => {
    setChatSearchQuery('')
    setChatSearchResults([])
    onClose()
  }

  if (!isVisible) return null

  return (
    <>
      {/* Search bar */}
      <div className="px-4 py-2 bg-popover border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
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
            className="w-full pl-10 pr-3 py-1.5 bg-muted text-foreground text-sm rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={closeChatSearch}
          aria-label="Close search"
          className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search results dropdown */}
      {(chatSearchResults.length > 0 || isChatSearching) && (
        <div className="bg-popover border-b border-border max-h-60 overflow-y-auto scrollbar-thin">
          {isChatSearching ? (
            <div className="flex items-center justify-center py-3">
              <Spinner size="sm" />
              <span className="ml-2 text-muted-foreground text-xs">Searching...</span>
            </div>
          ) : (
            chatSearchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  // TODO: scroll to message if it's in the loaded messages
                  closeChatSearch()
                }}
                className="w-full px-4 py-2 flex items-start gap-2 text-left hover:bg-accent transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-medium truncate">{result.senderName || (result.out ? 'You' : 'Unknown')}</span>
                    <span className="text-muted-foreground text-[10px] flex-shrink-0 ml-2">{formatResultDate(result.date)}</span>
                  </div>
                  <p className="text-muted-foreground text-xs truncate mt-0.5">
                    {result.text.length > 100 ? result.text.slice(0, 100) + '...' : result.text}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* No results message */}
      {chatSearchQuery.trim().length >= 2 && !isChatSearching && chatSearchResults.length === 0 && (
        <div className="bg-popover border-b border-border px-4 py-3 text-center text-muted-foreground text-xs">
          No messages found
        </div>
      )}
    </>
  )
}
