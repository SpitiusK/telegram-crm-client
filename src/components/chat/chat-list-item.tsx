import { useState, useCallback, memo } from 'react'
import { Pin, VolumeX, Users, Megaphone, MessageSquare, Bookmark } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useChatsStore } from '../../stores/chats'
import { useUIStore } from '../../stores/ui'
import { useCrmStore } from '../../stores/crm'
import { ChatContextMenu } from './chat-context-menu'
import type { TelegramDialog } from '../../types'

interface ChatListItemProps {
  dialog: TelegramDialog
  accountColor?: string
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function getInitials(title: string): string {
  return title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

const avatarColors = [
  'bg-crm-new', 'bg-crm-contacted', 'bg-crm-testing', 'bg-crm-test-done',
  'bg-crm-agreed', 'bg-crm-paid', 'bg-crm-working', 'bg-primary',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (const char of id) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  }
  return avatarColors[Math.abs(hash) % avatarColors.length] ?? 'bg-primary'
}

function DialogAvatar({ dialog }: { dialog: TelegramDialog }) {
  if (dialog.isSavedMessages) {
    return (
      <Avatar className="w-12 h-12">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bookmark className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className="w-12 h-12">
      {dialog.avatar && <AvatarImage src={dialog.avatar} alt={dialog.title} />}
      <AvatarFallback className={cn('text-white text-sm font-medium', getAvatarColor(dialog.id))}>
        {getInitials(dialog.title)}
      </AvatarFallback>
    </Avatar>
  )
}

function ChatTypeIcon({ dialog }: { dialog: TelegramDialog }) {
  if (dialog.isGroup) {
    return <Users className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0" />
  }
  if (dialog.isChannel && dialog.isForum) {
    return <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0" />
  }
  if (dialog.isChannel) {
    return <Megaphone className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0" />
  }
  return null
}

export const ChatListItem = memo(function ChatListItem({ dialog, accountColor }: ChatListItemProps) {
  const { activeChat, setActiveChat, drafts, pinnedChats, mutedChats } = useChatsStore()
  const { toggleCrmPanel } = useUIStore()
  const { findDealByPhone } = useCrmStore()
  const isActive = activeChat?.chatId === dialog.id
  const draft = drafts[dialog.id]
  const isPinned = pinnedChats.has(dialog.id)
  const isMuted = mutedChats.has(dialog.id)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleClick = () => {
    void setActiveChat(dialog.id)
    if (dialog.phone) {
      void findDealByPhone(dialog.phone)
      toggleCrmPanel()
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'w-full h-auto flex items-center gap-3 px-2 py-1.5 justify-start rounded-none',
          isActive ? 'bg-primary/20' : '',
        )}
      >
        <div className="relative flex-shrink-0">
          <DialogAvatar dialog={dialog} />
          {accountColor && (
            <span
              className={cn('absolute top-0 right-0 w-2 h-2 rounded-full ring-2 ring-popover', accountColor)}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <ChatTypeIcon dialog={dialog} />
              <span className="text-foreground text-[14px] font-semibold truncate">
                {dialog.title}
              </span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {isPinned && (
                <Pin className="w-3 h-3 text-muted-foreground" />
              )}
              {isMuted && (
                <VolumeX className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-muted-foreground text-[12px] whitespace-nowrap">
                {formatTime(dialog.lastMessageDate)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            {draft ? (
              <span className="text-[14px] truncate">
                <span className="text-destructive font-medium">Draft: </span>
                <span className="text-muted-foreground">{draft}</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-[14px] truncate">
                {dialog.lastMessage}
              </span>
            )}
            {dialog.unreadCount > 0 && (
              <Badge
                variant="default"
                className={cn(
                  'ml-2 min-w-[20px] h-5 px-1.5 text-[11px] font-medium',
                  isMuted ? 'bg-muted-foreground hover:bg-muted-foreground' : '',
                )}
              >
                {dialog.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </Button>
      {contextMenu && (
        <ChatContextMenu
          dialog={dialog}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
        />
      )}
    </>
  )
}, (prev, next) => {
  const p = prev.dialog
  const n = next.dialog
  return p.id === n.id &&
    p.lastMessage === n.lastMessage &&
    p.lastMessageDate === n.lastMessageDate &&
    p.unreadCount === n.unreadCount &&
    p.avatar === n.avatar &&
    prev.accountColor === next.accountColor
})
