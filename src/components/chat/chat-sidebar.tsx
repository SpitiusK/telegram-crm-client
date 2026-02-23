import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Search, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ACCOUNT_COLORS, ACCOUNT_RING_COLORS } from '@/lib/constants'
import { BUILTIN_TABS, matchesFolder } from '@/lib/chat-folders'
import type { ChatFolder } from '@/lib/chat-folders'
import { useChatsStore } from '../../stores/chats'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import type { SearchResult } from '../../types'
import { ChatListItem } from './chat-list-item'
import { AccountSwitcher } from './account-switcher'
import { SearchResultItem } from './search-results'
import { Spinner } from '../ui/spinner'

function FolderTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 px-3 py-2 text-xs font-medium h-auto rounded-none relative',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {isActive && <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />}
    </Button>
  )
}

interface ChatSidebarProps {
  width?: number
}

export function ChatSidebar({ width }: ChatSidebarProps) {
  const {
    dialogs, isLoadingDialogs, activeFolder, setActiveFolder, pinnedChats,
    searchResults, isSearching, searchMessages, clearSearch, setActiveChat,
    contactSearchResults, isSearchingContacts, searchContacts,
    userFolders, archivedDialogs, isLoadingArchive, loadArchivedDialogs,
  } = useChatsStore()
  const { setShowSettings } = useUIStore()
  const { accounts } = useAuthStore()
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const triggerSearch = useCallback((query: string) => {
    if (query.trim().length >= 3) {
      void searchMessages(query.trim())
      void searchContacts(query.trim())
    } else {
      clearSearch()
    }
  }, [searchMessages, searchContacts, clearSearch])

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
    void setActiveChat(result.chatId, result.accountId)
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
    const bgMap = new Map<string, string>()
    const ringMap = new Map<string, string>()
    accounts.forEach((acc, i) => {
      const bgClass = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]
      const ringClass = ACCOUNT_RING_COLORS[i % ACCOUNT_RING_COLORS.length]
      if (bgClass) bgMap.set(acc.id, bgClass)
      if (ringClass) ringMap.set(acc.id, ringClass)
    })
    return { bgMap, ringMap }
  }, [accounts])

  const deduplicatedContacts = useMemo(() => {
    const dialogIds = new Set(filtered.map((d) => d.id))
    return contactSearchResults.filter((c) => !dialogIds.has(c.id))
  }, [contactSearchResults, filtered])

  const hasSearchQuery = search.trim().length >= 3
  const showContactResults = hasSearchQuery && (deduplicatedContacts.length > 0 || isSearchingContacts)
  const showSearchResults = hasSearchQuery && (searchResults.length > 0 || isSearching)

  return (
    <div
      style={width ? { width, minWidth: width } : undefined}
      className={cn('bg-popover flex flex-col border-r border-border', !width && 'w-[280px] min-w-[280px]')}
    >
      <AccountSwitcher />

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="sidebar-search"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10 pr-8 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setSearch(''); clearSearch() }}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
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
      <ScrollArea className="flex-1">
        {isLoadingDialogs || (activeFolder === 'archive' && isLoadingArchive) ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : filtered.length === 0 && !showSearchResults ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {search ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          <>
            {filtered.map((dialog) => (
              <ChatListItem key={dialog.id} dialog={dialog} accountColor={accountColorMap && dialog.accountId ? accountColorMap.bgMap.get(dialog.accountId) : undefined} accountRingColor={accountColorMap && dialog.accountId ? accountColorMap.ringMap.get(dialog.accountId) : undefined} />
            ))}
            {showContactResults && (
              <div className="border-t border-border">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">People & Groups</div>
                {isSearchingContacts ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" />
                    <span className="ml-2 text-muted-foreground text-xs">Searching...</span>
                  </div>
                ) : (
                  deduplicatedContacts.map((contact) => (
                    <ChatListItem key={`contact-${contact.id}`} dialog={contact} accountColor={accountColorMap && contact.accountId ? accountColorMap.bgMap.get(contact.accountId) : undefined} accountRingColor={accountColorMap && contact.accountId ? accountColorMap.ringMap.get(contact.accountId) : undefined} />
                  ))
                )}
              </div>
            )}
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
                      accountColor={accountColorMap && result.accountId ? accountColorMap.bgMap.get(result.accountId) : undefined}
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
      </ScrollArea>

      {/* Settings */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 w-full justify-start px-3 py-2 text-sm text-muted-foreground"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </div>
  )
}
