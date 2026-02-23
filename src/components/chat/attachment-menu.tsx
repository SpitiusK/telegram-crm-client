import { useRef, useEffect } from 'react'

interface AttachmentMenuProps {
  isOpen: boolean
  onToggle: () => void
  onPhotoAttach: () => void
  onDocAttach: () => void
}

export function AttachmentMenu({ isOpen, onToggle, onPhotoAttach, onDocAttach }: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggle()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onToggle])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={onToggle}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground"
        aria-label="Attach file"
        title="Attach"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <button
            onClick={onPhotoAttach}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Photo / Video
          </button>
          <button
            onClick={onDocAttach}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Document
          </button>
        </div>
      )}
    </div>
  )
}
