import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SearchResult } from '../../types'

export function formatSearchDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-primary/30 text-foreground font-medium">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SearchResultItem({
  result,
  query,
  onClick,
  accountColor,
}: {
  result: SearchResult
  query: string
  onClick: () => void
  accountColor?: string
}) {
  const snippet = result.text.length > 80 ? result.text.slice(0, 80) + '...' : result.text
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="w-full h-auto px-3 py-2.5 flex flex-col gap-0.5 items-stretch justify-start rounded-none"
    >
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm font-medium truncate flex items-center gap-1.5">
          {accountColor && (
            <span
              className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', accountColor)}
            />
          )}
          {result.chatTitle || result.senderName || 'Chat'}
        </span>
        <span className="text-muted-foreground text-[10px] flex-shrink-0 ml-2">
          {formatSearchDate(result.date)}
        </span>
      </div>
      {result.chatTitle && result.senderName && (
        <span className="text-muted-foreground text-xs truncate text-left">{result.senderName}</span>
      )}
      <span className="text-muted-foreground text-xs truncate text-left">
        {highlightMatch(snippet, query)}
      </span>
    </Button>
  )
}
