import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ResizeHandleProps {
  onResize: (width: number) => void
  min?: number
  max?: number
}

export function ResizeHandle({ onResize, min = 200, max = 500 }: ResizeHandleProps) {
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX

      // Read the sidebar width from the previous sibling
      const handle = e.currentTarget as HTMLElement
      const sidebar = handle.previousElementSibling as HTMLElement | null
      startWidth.current = sidebar ? sidebar.getBoundingClientRect().width : 280

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const delta = ev.clientX - startX.current
        const newWidth = Math.round(Math.min(max, Math.max(min, startWidth.current + delta)))
        onResize(newWidth)
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [onResize, min, max],
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'w-1 cursor-col-resize flex-shrink-0 relative group',
        'hover:bg-primary/30 active:bg-primary/50 transition-colors',
      )}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}
