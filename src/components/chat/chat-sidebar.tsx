import { useState, useMemo } from 'react'
import { useChatsStore } from '../../stores/chats'
import { ChatListItem } from './chat-list-item'

export function ChatSidebar() {
  const { dialogs, isLoadingDialogs } = useChatsStore()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return dialogs
    const q = search.toLowerCase()
    return dialogs.filter((d) => d.title.toLowerCase().includes(q))
  }, [dialogs, search])

  return (
    <div className="w-[280px] min-w-[280px] bg-telegram-sidebar flex flex-col border-r border-telegram-border">
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
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-telegram-input text-telegram-text text-sm rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-telegram-accent placeholder:text-telegram-text-secondary"
          />
        </div>
      </div>

      {/* Dialog list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoadingDialogs ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-telegram-text-secondary text-sm">
            {search ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          filtered.map((dialog) => (
            <ChatListItem key={dialog.id} dialog={dialog} />
          ))
        )}
      </div>
    </div>
  )
}
