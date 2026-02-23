import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useChatsStore } from '../../stores/chats'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import type { ChatFolder } from '../../stores/chats'
import type { TelegramDialog, SearchResult } from '../../types'
import { ChatListItem } from './chat-list-item'
import { AccountSwitcher } from './account-switcher'
import { SearchResultItem } from './search-results'
import { Spinner } from '../ui/spinner'

const ACCOUNT_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

const BUILTIN_TABS: { key: ChatFolder; label: string }[] = [
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
    default:
      return true
  }
}

function FolderTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors relative ${
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      {isActive && <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />}
    </button>
  )
}

export function ChatSidebar() {
  const {
    dialogs, isLoadingDialogs, activeFolder, setActiveFolder, pinnedChats,
    searchResults, isSearching, searchMessages, clearSearch, setActiveChat,
    userFolders, archivedDialogs, isLoadingArchive, loadArchivedDialogs,
  } = useChatsStore()
  const { setShowSettings } = useUIStore()
  const { accounts } = useAuthStore()
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, triggerSearch])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (!value.trim()) clearSearch()
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      triggerSearch(search)
    }
    if (e.key === 'Escape') { setSearch(''); clearSearch() }
  }

  const handleResultClick = (result: SearchResult) => {
    void setActiveChat(result.chatId)
    setSearch('')
    clearSearch()
  }

  const filtered = useMemo(() => {
    if (activeFolder === 'archive') {
      const q = search.toLowerCase()
      return search.trim() ? archivedDialogs.filter((d) => d.title.toLowerCase().includes(q)) : archivedDialogs
    }

    let result = dialogs

    if (activeFolder.startsWith('folder:')) {
      const folderId = Number(activeFolder.slice(7))
      const folder = userFolders.find((f) => f.id === folderId)
      if (folder) {
        const peerSet = new Set(folder.includePeers)
        result = result.filter((d) => peerSet.has(d.id))
      }
    } else if (activeFolder !== 'all') {
      result = result.filter((d) => matchesFolder(d, activeFolder))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.title.toLowerCase().includes(q))
    }

    return [...result].sort((a, b) => {
      const aPinned = pinnedChats.has(a.id)
      const bPinned = pinnedChats.has(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return b.lastMessageDate - a.lastMessageDate
    })
  }, [dialogs, archivedDialogs, search, activeFolder, pinnedChats, userFolders])

  const accountColorMap = useMemo(() => {
    if (accounts.length <= 1) return null
    const map = new Map<string, string>()
    accounts.forEach((acc, i) => {
      const color = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]
      if (color) map.set(acc.id, color)
    })
    return map
  }, [accounts])

  const hasSearchQuery = search.trim().length >= 3
  const showSearchResults = hasSearchQuery && (searchResults.length > 0 || isSearching)

  return (
    <div className="w-[280px] min-w-[280px] bg-popover flex flex-col border-r border-border">
      <AccountSwitcher />

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="sidebar-search"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-8 py-2 bg-muted text-foreground text-sm rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); clearSearch() }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-border">
        {BUILTIN_TABS.map((tab) => (
          <FolderTab key={tab.key} label={tab.label} isActive={activeFolder === tab.key} onClick={() => setActiveFolder(tab.key)} />
        ))}
        {userFolders.map((folder) => {
          const key: ChatFolder = `folder:${folder.id}`
          const label = folder.emoji ? `${folder.emoji} ${folder.title}` : folder.title
          return <FolderTab key={key} label={label} isActive={activeFolder === key} onClick={() => setActiveFolder(key)} />
        })}
        <FolderTab label="Archive" isActive={activeFolder === 'archive'} onClick={() => { setActiveFolder('archive'); void loadArchivedDialogs() }} />
      </div>

      {/* Dialog list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoadingDialogs || (activeFolder === 'archive' && isLoadingArchive) ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : filtered.length === 0 && !showSearchResults ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {search ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          <>
            {filtered.map((dialog) => (
              <ChatListItem key={dialog.id} dialog={dialog} accountColor={accountColorMap && dialog.accountId ? accountColorMap.get(dialog.accountId) : undefined} />
            ))}
            {showSearchResults && (
              <div className="border-t border-border">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Messages</div>
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" />
                    <span className="ml-2 text-muted-foreground text-xs">Searching...</span>
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <SearchResultItem
                      key={`${result.chatId}-${result.id}`}
                      result={result}
                      query={search}
                      onClick={() => handleResultClick(result)}
                      accountColor={accountColorMap && result.accountId ? accountColorMap.get(result.accountId) : undefined}
                    />
                  ))
                )}
              </div>
            )}
            {hasSearchQuery && !isSearching && searchResults.length === 0 && filtered.length > 0 && (
              <div className="border-t border-border px-3 py-3 text-center text-muted-foreground text-xs">
                No messages found for &ldquo;{search.trim()}&rdquo;
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
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
