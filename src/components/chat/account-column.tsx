import { useState, useMemo } from 'react'
import { useChatsStore } from '../../stores/chats'
import type { ChatFolder } from '../../stores/chats'
import type { TelegramDialog } from '../../types'
import { ChatListItem } from './chat-list-item'

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

interface AccountColumnProps {
  accountId: string
  accountName: string
  accountColor: string
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function AccountColumn({
  accountId,
  accountName,
  accountColor,
  isCollapsed,
  onToggleCollapse,
}: AccountColumnProps) {
  const [activeFolder, setActiveFolder] = useState<ChatFolder>('all')

  const { getAccountState, pinnedChats, isLoadingDialogs } = useChatsStore()
  const accountState = getAccountState(accountId)
  const dialogs = accountState.dialogs

  const totalUnread = useMemo(
    () => dialogs.reduce((sum, d) => sum + d.unreadCount, 0),
    [dialogs],
  )

  const initial = accountName[0]?.toUpperCase() ?? '?'

  const filtered = useMemo(() => {
    let result = dialogs

    if (activeFolder !== 'all') {
      result = result.filter((d) => matchesFolder(d, activeFolder))
    }

    result = [...result].sort((a, b) => {
      const aPinned = pinnedChats.has(a.id)
      const bPinned = pinnedChats.has(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return b.lastMessageDate - a.lastMessageDate
    })

    return result
  }, [dialogs, activeFolder, pinnedChats])

  // Collapsed: thin strip with avatar initial + unread count
  if (isCollapsed) {
    return (
      <div className="w-12 min-w-[48px] bg-telegram-sidebar flex flex-col items-center border-r border-telegram-border">
        <button
          onClick={onToggleCollapse}
          title={`Expand ${accountName}`}
          className="w-full flex flex-col items-center gap-1 py-3 hover:bg-telegram-hover transition-colors"
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ backgroundColor: accountColor }}
          >
            {initial}
          </span>
          {totalUnread > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-telegram-accent flex items-center justify-center text-white text-[10px] font-medium">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      </div>
    )
  }

  // Expanded: full column with header, folder tabs, dialog list
  return (
    <div className="w-[260px] min-w-[200px] flex-1 max-w-[320px] bg-telegram-sidebar flex flex-col border-r border-telegram-border">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-telegram-border">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: accountColor }}
        >
          {initial}
        </span>
        <span className="text-telegram-text text-sm font-medium truncate flex-1">
          {accountName}
        </span>
        {totalUnread > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-telegram-accent flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          title="Collapse"
          className="p-1 rounded hover:bg-telegram-hover text-telegram-text-secondary hover:text-telegram-text transition-colors flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Folder tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-telegram-border">
        {BUILTIN_TABS.map((tab) => (
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-telegram-text-secondary text-sm">
            No chats
          </div>
        ) : (
          filtered.map((dialog) => (
            <ChatListItem
              key={dialog.id}
              dialog={dialog}
            />
          ))
        )}
      </div>
    </div>
  )
}
