import { useState, useMemo } from 'react'
import { ChevronsLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useChatsStore } from '../../stores/chats'
import type { ChatFolder } from '../../stores/chats'
import type { TelegramDialog } from '../../types'
import { ChatListItem } from './chat-list-item'
import { Spinner } from '@/components/ui/spinner'

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
  accountColorClass: string
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function AccountColumn({
  accountId,
  accountName,
  accountColorClass,
  isCollapsed,
  onToggleCollapse,
}: AccountColumnProps) {
  const [activeFolder, setActiveFolder] = useState<ChatFolder>('all')

  const { getAccountState, pinnedChats, isLoadingDialogs, userFolders } = useChatsStore()
  const accountState = getAccountState(accountId)
  const dialogs = accountState.dialogs

  const totalUnread = useMemo(
    () => dialogs.reduce((sum, d) => sum + d.unreadCount, 0),
    [dialogs],
  )

  const initial = accountName[0]?.toUpperCase() ?? '?'

  const filtered = useMemo(() => {
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

    result = [...result].sort((a, b) => {
      const aPinned = pinnedChats.has(a.id)
      const bPinned = pinnedChats.has(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return b.lastMessageDate - a.lastMessageDate
    })

    return result
  }, [dialogs, activeFolder, pinnedChats, userFolders])

  // Collapsed: thin strip with avatar initial + unread count
  if (isCollapsed) {
    return (
      <div className="w-12 min-w-[48px] bg-popover flex flex-col items-center border-r border-border">
        <Button
          variant="ghost"
          onClick={onToggleCollapse}
          aria-label={`Expand ${accountName}`}
          title={`Expand ${accountName}`}
          className="w-full h-auto flex flex-col items-center gap-1 py-3 rounded-none"
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className={cn('text-white text-xs font-semibold', accountColorClass)}>
              {initial}
            </AvatarFallback>
          </Avatar>
          {totalUnread > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-medium">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </div>
    )
  }

  // Expanded: full column with header, folder tabs, dialog list
  return (
    <div className="w-[260px] min-w-[200px] flex-1 max-w-[320px] bg-popover flex flex-col border-r border-border">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarFallback className={cn('text-white text-xs font-semibold', accountColorClass)}>
            {initial}
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground text-sm font-medium truncate flex-1">
          {accountName}
        </span>
        {totalUnread > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label="Collapse"
          title="Collapse"
          className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Folder tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-border">
        {BUILTIN_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => setActiveFolder(tab.key)}
            className={cn(
              'flex-shrink-0 px-3 py-2 text-xs font-medium h-auto rounded-none relative',
              activeFolder === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {activeFolder === tab.key && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />
            )}
          </Button>
        ))}
        {userFolders.map((folder) => {
          const key: ChatFolder = `folder:${folder.id}`
          const label = folder.emoji ? `${folder.emoji} ${folder.title}` : folder.title
          return (
            <Button
              key={key}
              variant="ghost"
              onClick={() => setActiveFolder(key)}
              className={cn(
                'flex-shrink-0 px-3 py-2 text-xs font-medium h-auto rounded-none relative',
                activeFolder === key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {activeFolder === key && (
                <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          )
        })}
      </div>

      {/* Dialog list */}
      <ScrollArea className="flex-1">
        {isLoadingDialogs ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
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
      </ScrollArea>
    </div>
  )
}
