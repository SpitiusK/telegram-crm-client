import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useChatsStore } from '../../stores/chats'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import type { ChatFolder } from '../../stores/chats'
import type { TelegramDialog, TelegramAccount, SearchResult } from '../../types'
import { ChatListItem } from './chat-list-item'

const FOLDER_TABS: { key: ChatFolder; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'users', label: 'Users' },
  { key: 'groups', label: 'Groups' },
  { key: 'channels', label: 'Channels' },
  { key: 'forums', label: 'Forums' },
  { key: 'bots', label: 'Bots' },
]

function matchesFolder(dialog: TelegramDialog, folder: ChatFolder): boolean {
  switch (folder) {
    case 'all':
      return true
    case 'users':
      return dialog.isUser && !dialog.isSavedMessages
    case 'groups':
      return dialog.isGroup
    case 'channels':
      return dialog.isChannel && !dialog.isForum
    case 'forums':
      return !!dialog.isForum
    case 'bots':
      return dialog.isUser && !!dialog.username && dialog.username.toLowerCase().endsWith('bot')
  }
}

function formatSearchDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-telegram-accent/30 text-telegram-text font-medium">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

function AccountAvatar({ account, isActive, onClick }: { account: TelegramAccount; isActive: boolean; onClick: () => void }) {
  const initial = account.firstName[0] ?? '?'
  return (
    <button
      onClick={onClick}
      title={`${account.firstName}${account.username ? ` (@${account.username})` : ''}`}
      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
        isActive
          ? 'ring-2 ring-telegram-accent ring-offset-1 ring-offset-telegram-sidebar'
          : 'opacity-60 hover:opacity-100'
      }`}
    >
      {account.avatar ? (
        <img src={account.avatar} alt={account.firstName} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-telegram-accent/20 text-telegram-accent flex items-center justify-center">
          {initial}
        </span>
      )}
    </button>
  )
}

function AccountSwitcher() {
  const { accounts, activeAccountId, switchAccount, startAddAccount } = useAuthStore()
  const { loadDialogs } = useChatsStore()

  if (accounts.length <= 1 && accounts.length > 0) {
    // Single account — show minimal strip with just "+" button
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-telegram-border">
        <AccountAvatar
          account={accounts[0]!}
          isActive={true}
          onClick={() => { /* already active */ }}
        />
        <button
          onClick={() => void startAddAccount()}
          title="Add account"
          className="flex-shrink-0 w-8 h-8 rounded-full bg-telegram-hover flex items-center justify-center text-telegram-text-secondary hover:text-telegram-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    )
  }

  if (accounts.length === 0) return null

  const handleSwitch = (id: string) => {
    void (async () => {
      await switchAccount(id)
      await loadDialogs()
    })()
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-telegram-border overflow-x-auto scrollbar-none">
      {accounts.map((account) => (
        <AccountAvatar
          key={account.id}
          account={account}
          isActive={account.id === activeAccountId}
          onClick={() => handleSwitch(account.id)}
        />
      ))}
      <button
        onClick={() => void startAddAccount()}
        title="Add account"
        className="flex-shrink-0 w-8 h-8 rounded-full bg-telegram-hover flex items-center justify-center text-telegram-text-secondary hover:text-telegram-text transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

function SearchResultItem({ result, query, onClick }: { result: SearchResult; query: string; onClick: () => void }) {
  const snippet = result.text.length > 80 ? result.text.slice(0, 80) + '...' : result.text
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2.5 flex flex-col gap-0.5 text-left hover:bg-telegram-hover transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-telegram-text text-sm font-medium truncate">
          {result.chatTitle || result.senderName || 'Chat'}
        </span>
        <span className="text-telegram-text-secondary text-[10px] flex-shrink-0 ml-2">
          {formatSearchDate(result.date)}
        </span>
      </div>
      {result.chatTitle && result.senderName && (
        <span className="text-telegram-text-secondary text-xs truncate">{result.senderName}</span>
      )}
      <span className="text-telegram-text-secondary text-xs truncate">
        {highlightMatch(snippet, query)}
      </span>
    </button>
  )
}

export function ChatSidebar() {
  const { dialogs, isLoadingDialogs, activeFolder, setActiveFolder, pinnedChats, searchResults, isSearching, searchMessages, clearSearch, setActiveChat } = useChatsStore()
  const { setShowSettings } = useUIStore()
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const triggerSearch = useCallback((query: string) => {
    if (query.trim().length >= 3) {
      void searchMessages(query.trim())
    } else {
      clearSearch()
    }
  }, [searchMessages, clearSearch])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => triggerSearch(search), 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, triggerSearch])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (!value.trim()) {
      clearSearch()
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      triggerSearch(search)
    }
    if (e.key === 'Escape') {
      setSearch('')
      clearSearch()
    }
  }

  const handleResultClick = (result: SearchResult) => {
    void setActiveChat(result.chatId)
    setSearch('')
    clearSearch()
  }

  const filtered = useMemo(() => {
    let result = dialogs
    if (activeFolder !== 'all') {
      result = result.filter((d) => matchesFolder(d, activeFolder))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.title.toLowerCase().includes(q))
    }
    // Sort pinned chats first, then by date
    result = [...result].sort((a, b) => {
      const aPinned = pinnedChats.has(a.id)
      const bPinned = pinnedChats.has(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return b.lastMessageDate - a.lastMessageDate
    })
    return result
  }, [dialogs, search, activeFolder, pinnedChats])

  const hasSearchQuery = search.trim().length >= 3
  const showSearchResults = hasSearchQuery && (searchResults.length > 0 || isSearching)

  return (
    <div className="w-[280px] min-w-[280px] bg-telegram-sidebar flex flex-col border-r border-telegram-border">
      {/* Account switcher */}
      <AccountSwitcher />

      {/* Header */}
      <div className="p-3 border-b border-telegram-border">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-telegram-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="sidebar-search"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-8 py-2 bg-telegram-input text-telegram-text text-sm rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-telegram-accent placeholder:text-telegram-text-secondary"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); clearSearch() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-telegram-text-secondary hover:text-telegram-text"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-telegram-border">
        {FOLDER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFolder(tab.key)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors relative ${
              activeFolder === tab.key
                ? 'text-telegram-accent'
                : 'text-telegram-text-secondary hover:text-telegram-text'
            }`}
          >
            {tab.label}
            {activeFolder === tab.key && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-telegram-accent rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Dialog list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoadingDialogs ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 && !showSearchResults ? (
          <div className="text-center py-8 text-telegram-text-secondary text-sm">
            {search ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          <>
            {filtered.map((dialog) => (
              <ChatListItem key={dialog.id} dialog={dialog} />
            ))}

            {/* Global message search results */}
            {showSearchResults && (
              <div className="border-t border-telegram-border">
                <div className="px-3 py-2 text-xs font-medium text-telegram-text-secondary uppercase tracking-wide">
                  Messages
                </div>
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-telegram-text-secondary text-xs">Searching...</span>
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <SearchResultItem
                      key={`${result.chatId}-${result.id}`}
                      result={result}
                      query={search}
                      onClick={() => handleResultClick(result)}
                    />
                  ))
                )}
              </div>
            )}

            {hasSearchQuery && !isSearching && searchResults.length === 0 && filtered.length > 0 && (
              <div className="border-t border-telegram-border px-3 py-3 text-center text-telegram-text-secondary text-xs">
                No messages found for &ldquo;{search.trim()}&rdquo;
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings button */}
      <div className="p-2 border-t border-telegram-border">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-telegram-text-secondary hover:text-telegram-text hover:bg-telegram-hover rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  )
}
