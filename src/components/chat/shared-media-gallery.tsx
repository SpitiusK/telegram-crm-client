import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { telegramAPI } from '@/lib/telegram'
import type { SharedMediaItem, SharedMediaFilter } from '../../types'

const FILTER_LABELS: Record<SharedMediaFilter, string> = {
  photos: 'Photos', videos: 'Videos', links: 'Links', voice: 'Voice Messages', documents: 'Files',
}

const PAGE_SIZE = 20

interface SharedMediaGalleryProps {
  chatId: string
  filter: SharedMediaFilter
  accountId?: string
  onClose: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SharedMediaGallery({ chatId, filter, accountId, onClose }: SharedMediaGalleryProps) {
  const [items, setItems] = useState<SharedMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  const loadMore = useCallback(async (offset: number) => {
    try {
      const batch = await telegramAPI.getSharedMedia(chatId, filter, PAGE_SIZE, offset, accountId)
      if (batch.length < PAGE_SIZE) setHasMore(false)
      setItems((prev) => offset === 0 ? batch : [...prev, ...batch])
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [chatId, filter, accountId])

  useEffect(() => {
    setItems([])
    setHasMore(true)
    setIsLoading(true)
    void loadMore(0)
  }, [loadMore])

  const handleLoadMore = () => {
    if (!hasMore || isLoading) return
    setIsLoading(true)
    void loadMore(items.length)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-foreground text-sm font-semibold">{FILTER_LABELS[filter]}</span>
      </div>
      <ScrollArea className="flex-1">
        {filter === 'photos' || filter === 'videos' ? (
          <GridView items={items} filter={filter} />
        ) : filter === 'links' ? (
          <LinkList items={items} />
        ) : filter === 'voice' ? (
          <VoiceList items={items} />
        ) : (
          <DocumentList items={items} />
        )}
        {isLoading && <div className="flex items-center justify-center py-6"><Spinner size="sm" /></div>}
        {!isLoading && hasMore && items.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <Button variant="ghost" onClick={handleLoadMore} className="text-primary text-sm">Load more</Button>
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No {FILTER_LABELS[filter].toLowerCase()} found</div>
        )}
      </ScrollArea>
    </div>
  )
}

function GridView({ items, filter }: { items: SharedMediaItem[]; filter: SharedMediaFilter }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {items.map((item) => (
        <div key={item.id} className="aspect-square bg-muted rounded-sm overflow-hidden relative">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              {filter === 'photos' ? 'Photo' : 'Video'}
            </div>
          )}
          {filter === 'videos' && item.duration !== undefined && (
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
              {formatDuration(item.duration)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function LinkList({ items }: { items: SharedMediaItem[] }) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="px-4 py-3">
          {item.linkSiteName && <p className="text-muted-foreground text-[10px] uppercase tracking-wide mb-0.5">{item.linkSiteName}</p>}
          {item.linkTitle && <p className="text-foreground text-sm font-medium leading-tight mb-0.5">{item.linkTitle}</p>}
          {item.linkDescription && <p className="text-muted-foreground text-xs line-clamp-2 mb-1">{item.linkDescription}</p>}
          {item.url && <p className="text-primary text-xs truncate">{item.url}</p>}
          <p className="text-muted-foreground text-[10px] mt-1">{formatDate(item.date)}</p>
        </div>
      ))}
    </div>
  )
}

function VoiceList({ items }: { items: SharedMediaItem[] }) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm">{item.duration !== undefined ? formatDuration(item.duration) : 'Voice message'}</p>
            <p className="text-muted-foreground text-xs">{formatDate(item.date)}{item.size ? ` \u00b7 ${formatSize(item.size)}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function DocumentList({ items }: { items: SharedMediaItem[] }) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="px-4 py-3">
          <p className="text-foreground text-sm truncate">{item.fileName ?? 'File'}</p>
          <p className="text-muted-foreground text-xs">{formatDate(item.date)}{item.size ? ` \u00b7 ${formatSize(item.size)}` : ''}{item.mimeType ? ` \u00b7 ${item.mimeType}` : ''}</p>
        </div>
      ))}
    </div>
  )
}
