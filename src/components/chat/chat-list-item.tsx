import { useState, useCallback, memo } from 'react'
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
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (const char of id) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  }
  return avatarColors[Math.abs(hash) % avatarColors.length] ?? 'bg-blue-500'
}

function Avatar({ dialog }: { dialog: TelegramDialog }) {
  // Saved Messages — bookmark icon
  if (dialog.isSavedMessages) {
    return (
      <div className="w-[48px] h-[48px] min-w-[48px] rounded-full bg-telegram-accent flex items-center justify-center">
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
        </svg>
      </div>
    )
  }

  // Real avatar photo
  if (dialog.avatar) {
    return (
      <img
        src={dialog.avatar}
        alt=""
        className="w-[48px] h-[48px] min-w-[48px] rounded-full object-cover"
      />
    )
  }

  // Initials fallback
  return (
    <div className={`w-[48px] h-[48px] min-w-[48px] rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(dialog.id)}`}>
      {getInitials(dialog.title)}
    </div>
  )
}

function ChatTypeIcon({ dialog }: { dialog: TelegramDialog }) {
  if (dialog.isGroup) {
    return (
      <svg className="w-3.5 h-3.5 text-telegram-text-secondary mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    )
  }
  if (dialog.isChannel && dialog.isForum) {
    return (
      <svg className="w-3.5 h-3.5 text-telegram-text-secondary mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-4H6V8h12v2z" />
      </svg>
    )
  }
  if (dialog.isChannel) {
    return (
      <svg className="w-3.5 h-3.5 text-telegram-text-secondary mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
      </svg>
    )
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
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          isActive ? 'bg-telegram-accent/20' : 'hover:bg-telegram-hover'
        }`}
      >
        <div className="relative flex-shrink-0">
          <Avatar dialog={dialog} />
          {accountColor && (
            <span
              className="absolute top-0 right-0 w-2 h-2 rounded-full ring-2 ring-telegram-sidebar"
              style={{ backgroundColor: accountColor }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <ChatTypeIcon dialog={dialog} />
              <span className="text-telegram-text text-sm font-medium truncate">
                {dialog.title}
              </span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {isPinned && (
                <svg className="w-3 h-3 text-telegram-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
              {isMuted && (
                <svg className="w-3 h-3 text-telegram-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
              <span className="text-telegram-text-secondary text-xs whitespace-nowrap">
                {formatTime(dialog.lastMessageDate)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            {draft ? (
              <span className="text-xs truncate">
                <span className="text-red-500 font-medium">Draft: </span>
                <span className="text-telegram-text-secondary">{draft}</span>
              </span>
            ) : (
              <span className="text-telegram-text-secondary text-xs truncate">
                {dialog.lastMessage}
              </span>
            )}
            {dialog.unreadCount > 0 && (
              <span className={`ml-2 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-white text-[11px] font-medium ${
                isMuted ? 'bg-telegram-text-secondary' : 'bg-telegram-accent'
              }`}>
                {dialog.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
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
