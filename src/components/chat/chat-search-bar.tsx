import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search in this chat..."
            value={chatSearchQuery}
            onChange={(e) => handleChatSearchChange(e.target.value)}
            onKeyDown={handleChatSearchKeyDown}
            className="pl-10 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeChatSearch}
          aria-label="Close search"
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search results dropdown */}
      {(chatSearchResults.length > 0 || isChatSearching) && (
        <ScrollArea className="bg-popover border-b border-border max-h-60">
          {isChatSearching ? (
            <div className="flex items-center justify-center py-3">
              <Spinner size="sm" />
              <span className="ml-2 text-muted-foreground text-xs">Searching...</span>
            </div>
          ) : (
            chatSearchResults.map((result) => (
              <Button
                key={result.id}
                variant="ghost"
                onClick={() => {
                  // TODO: scroll to message if it's in the loaded messages
                  closeChatSearch()
                }}
                className="w-full h-auto px-4 py-2 flex items-start gap-2 justify-start rounded-none"
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
              </Button>
            ))
          )}
        </ScrollArea>
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
