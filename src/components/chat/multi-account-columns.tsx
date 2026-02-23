import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../../stores/auth'
import { useChatsStore } from '../../stores/chats'
import { ACCOUNT_COLORS, ACCOUNT_RING_COLORS } from '@/lib/constants'
import { AccountColumn } from './account-column'
import { ChatSidebar } from './chat-sidebar'
import type { TelegramAccount, SearchResult } from '../../types'

const COLLAPSED_KEY = 'telegram-crm-collapsed-columns'

function loadCollapsedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>
      }
    }
  } catch {
    // ignore
  }
  return {}
}

function persistCollapsedState(state: Record<string, boolean>): void {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(state))
}

export function MultiAccountColumns() {
  const { accounts } = useAuthStore()
  const { searchResults, isSearching, searchMessages, clearSearch } = useChatsStore()
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(loadCollapsedState)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const isMulti = accounts.length > 1

  const triggerSearch = useCallback((query: string) => {
    if (query.trim().length >= 3) {
      void searchMessages(query.trim())
    } else {
      clearSearch()
    }
  }, [searchMessages, clearSearch])

  useEffect(() => {
    if (!isMulti) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => triggerSearch(search), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, triggerSearch, isMulti])

  const hasSearchQuery = search.trim().length >= 3

  const resultsByAccount = useMemo(() => {
    if (!hasSearchQuery || !isMulti) return null
    return accounts.reduce<Record<string, SearchResult[]>>((acc, account) => {
      acc[account.id] = searchResults.filter((r) => r.accountId === account.id)
      return acc
    }, {})
  }, [hasSearchQuery, isMulti, accounts, searchResults])

  // If only 1 account (or none), just render ChatSidebar
  if (!isMulti) {
    return <ChatSidebar />
  }

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

  const toggleCollapse = (accountId: string) => {
    setCollapsedState((prev) => {
      const next = { ...prev, [accountId]: !prev[accountId] }
      persistCollapsedState(next)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cross-account search bar */}
      <div className="p-3 border-b border-border bg-popover">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search across all accounts"
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

      {/* Columns */}
      <div className="flex flex-row flex-1 min-h-0">
        {accounts.map((account: TelegramAccount, index: number) => {
          const colorClass = ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? 'bg-account-1'
          const ringClass = ACCOUNT_RING_COLORS[index % ACCOUNT_RING_COLORS.length]
          return (
            <AccountColumn
              key={account.id}
              accountId={account.id}
              accountName={account.firstName || account.phone}
              accountColorClass={colorClass}
              accountRingColorClass={ringClass}
              isCollapsed={!!collapsedState[account.id]}
              onToggleCollapse={() => toggleCollapse(account.id)}
              searchResults={resultsByAccount ? resultsByAccount[account.id] : undefined}
              isSearching={hasSearchQuery ? isSearching : undefined}
              searchQuery={hasSearchQuery ? search : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
