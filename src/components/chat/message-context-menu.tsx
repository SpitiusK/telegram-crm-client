import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Reply, Pencil, Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TelegramMessage } from '../../types'

interface MessageContextMenuProps {
  message: TelegramMessage
  x: number
  y: number
  onReply: (msg: TelegramMessage) => void
  onEdit: (msg: TelegramMessage) => void
  onDelete: (msg: TelegramMessage) => void
  onClose: () => void
}

interface MenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  show: boolean
  danger?: boolean
}

export function MessageContextMenu({ message, x, y, onReply, onEdit, onDelete, onClose }: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handleKeyDown, handleClickOutside])

  // Adjust position to stay within viewport
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const rect = menu.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 8}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 8}px`
    }
  }, [])

  const handleCopy = () => {
    if (message.text) {
      void navigator.clipboard.writeText(message.text)
    }
    onClose()
  }

  const items: MenuItem[] = [
    {
      label: 'Reply',
      icon: <Reply className="w-4 h-4" />,
      onClick: () => { onReply(message); onClose() },
      show: true,
    },
    {
      label: 'Edit',
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => { onEdit(message); onClose() },
      show: message.out === true && !!message.text,
    },
    {
      label: 'Copy Text',
      icon: <Copy className="w-4 h-4" />,
      onClick: handleCopy,
      show: !!message.text,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => { onDelete(message); onClose() },
      show: message.out === true,
      danger: true,
    },
  ]

  const visibleItems = items.filter((i) => i.show)

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-xl shadow-xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {visibleItems.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          onClick={item.onClick}
          className={cn(
            'w-full justify-start gap-3 px-3 py-2 h-auto text-sm rounded-none',
            item.danger
              ? 'text-destructive hover:bg-destructive/10'
              : 'text-foreground hover:bg-primary/10',
          )}
        >
          <span className="opacity-70">{item.icon}</span>
          {item.label}
        </Button>
      ))}
    </div>,
    document.body
  )
}
