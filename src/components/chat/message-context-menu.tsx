import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      ),
      onClick: () => { onReply(message); onClose() },
      show: true,
    },
    {
      label: 'Edit',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      onClick: () => { onEdit(message); onClose() },
      show: message.out === true && !!message.text,
    },
    {
      label: 'Copy Text',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      ),
      onClick: handleCopy,
      show: !!message.text,
    },
    {
      label: 'Delete',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      onClick: () => { onDelete(message); onClose() },
      show: message.out === true,
    },
  ]

  const visibleItems = items.filter((i) => i.show)

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-telegram-sidebar border border-telegram-border rounded-xl shadow-xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {visibleItems.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
            item.label === 'Delete'
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-telegram-text hover:bg-telegram-accent/10'
          }`}
        >
          <span className="opacity-70">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  )
}
