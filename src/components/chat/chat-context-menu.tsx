import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useChatsStore } from '../../stores/chats'
import { telegramAPI } from '../../lib/telegram'
import type { TelegramDialog } from '../../types'

interface ChatContextMenuProps {
  dialog: TelegramDialog
  x: number
  y: number
  onClose: () => void
}

export function ChatContextMenu({ dialog, x, y, onClose }: ChatContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { pinnedChats, mutedChats, togglePin, toggleMute, removeDialog } = useChatsStore()

  const isPinned = pinnedChats.has(dialog.id)
  const isMuted = mutedChats.has(dialog.id)

  // Viewport-aware positioning
  const getPosition = useCallback(() => {
    const menuWidth = 200
    const menuHeight = 180
    const px = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : x
    const py = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 8 : y
    return { left: Math.max(8, px), top: Math.max(8, py) }
  }, [x, y])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const pos = getPosition()

  const handlePin = () => {
    togglePin(dialog.id)
    onClose()
  }

  const handleMute = () => {
    toggleMute(dialog.id)
    onClose()
  }

  const handleMarkRead = () => {
    void telegramAPI.markRead(dialog.id)
    useChatsStore.setState((state) => ({
      dialogs: state.dialogs.map((d) =>
        d.id === dialog.id ? { ...d, unreadCount: 0 } : d
      ),
    }))
    onClose()
  }

  const handleDelete = () => {
    removeDialog(dialog.id)
    onClose()
  }

  const items = [
    {
      label: isPinned ? 'Unpin' : 'Pin',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      onClick: handlePin,
    },
    {
      label: isMuted ? 'Unmute' : 'Mute',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMuted ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-8.536a5 5 0 000 7.072M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          )}
        </svg>
      ),
      onClick: handleMute,
    },
    {
      label: 'Mark as Read',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      onClick: handleMarkRead,
    },
    {
      label: 'Delete Chat',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: handleDelete,
      danger: true,
    },
  ]

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-telegram-sidebar border border-telegram-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: pos.left, top: pos.top }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
            item.danger
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-telegram-text hover:bg-telegram-hover'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  )
}
