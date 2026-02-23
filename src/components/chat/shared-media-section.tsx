import { useState, useEffect } from 'react'
import { Image, Film, Link, Mic, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { telegramAPI } from '@/lib/telegram'
import type { SharedMediaCounts, SharedMediaFilter } from '../../types'

const MEDIA_CATEGORIES: { key: SharedMediaFilter; label: string; icon: typeof Image }[] = [
  { key: 'photos', label: 'Photos', icon: Image },
  { key: 'videos', label: 'Videos', icon: Film },
  { key: 'links', label: 'Links', icon: Link },
  { key: 'voice', label: 'Voice', icon: Mic },
  { key: 'documents', label: 'Files', icon: FileText },
]

interface SharedMediaSectionProps {
  chatId: string
  accountId?: string
  onOpenGallery: (filter: SharedMediaFilter) => void
}

export function SharedMediaSection({ chatId, accountId, onOpenGallery }: SharedMediaSectionProps) {
  const [counts, setCounts] = useState<SharedMediaCounts | null>(null)

  useEffect(() => {
    let cancelled = false
    setCounts(null) // eslint-disable-line react-hooks/set-state-in-effect -- reset on dep change
    void telegramAPI.getSharedMediaCounts(chatId, accountId).then((result) => {
      if (!cancelled) setCounts(result)
    }).catch(() => {
      // ignore errors — some chats may not support search counters
    })
    return () => { cancelled = true }
  }, [chatId, accountId])

  if (!counts) return null

  const hasAny = counts.photos + counts.videos + counts.links + counts.voice + counts.documents > 0
  if (!hasAny) return null

  return (
    <div className="border-t border-border px-4 py-3">
      <p className="text-muted-foreground text-xs mb-2 uppercase tracking-wide font-medium">
        Shared Media
      </p>
      <div className="space-y-0.5">
        {MEDIA_CATEGORIES.map(({ key, label, icon: Icon }) => {
          const count = counts[key]
          if (count === 0) return null
          return (
            <Button
              key={key}
              variant="ghost"
              onClick={() => onOpenGallery(key)}
              className={cn(
                'w-full h-auto flex items-center gap-3 px-2 py-2 justify-start rounded-md',
                'text-foreground hover:bg-accent',
              )}
            >
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1 text-left">{label}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
