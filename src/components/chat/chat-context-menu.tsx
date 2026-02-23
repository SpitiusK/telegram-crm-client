import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Pin, VolumeX, Volume2, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
      icon: <Pin className="w-4 h-4" />,
      onClick: handlePin,
      danger: false,
    },
    {
      label: isMuted ? 'Unmute' : 'Mute',
      icon: isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />,
      onClick: handleMute,
      danger: false,
    },
    {
      label: 'Mark as Read',
      icon: <Check className="w-4 h-4" />,
      onClick: handleMarkRead,
      danger: false,
    },
    {
      label: 'Delete Chat',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      danger: true,
    },
  ]

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: pos.left, top: pos.top }}
    >
      {items.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          onClick={item.onClick}
          className={cn(
            'w-full justify-start gap-3 px-3 py-2 h-auto text-sm rounded-none',
            item.danger
              ? 'text-destructive hover:bg-destructive/10'
              : 'text-foreground',
          )}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </div>,
    document.body
  )
}
