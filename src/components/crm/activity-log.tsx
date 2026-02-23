import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { ActivityLogEntry } from './activity-log-entry'
import type { ActivityLogEntryData } from './activity-log-entry'

const FILTER_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'message_sent', label: 'Messages' },
  { key: 'deal_updated', label: 'Deals' },
  { key: 'ai_generated', label: 'AI' },
  { key: 'login', label: 'Auth' },
] as const

export function ActivityLog() {
  const [entries, setEntries] = useState<ActivityLogEntryData[]>([])
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const raw = await window.electronAPI.db.getCachedMessages('__activity_log__')
      const parsed: ActivityLogEntryData[] = raw.map((r) => {
        try {
          const data = JSON.parse(r.text) as {
            actionType?: string
            entityType?: string
            entityId?: string
            details?: string
          }
          return {
            id: r.id,
            actionType: data.actionType ?? 'unknown',
            entityType: data.entityType ?? '',
            entityId: data.entityId ?? '',
            details: data.details ?? '',
            createdAt: new Date(r.date * 1000).toISOString(),
          }
        } catch {
          return {
            id: r.id,
            actionType: 'unknown',
            entityType: '',
            entityId: '',
            details: r.text,
            createdAt: new Date(r.date * 1000).toISOString(),
          }
        }
      })
      setEntries(parsed.reverse())
    } catch {
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.actionType === filter)

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-popover">
        <h2 className="text-foreground text-sm font-semibold mb-2">Activity Log</h2>
        <div className="flex gap-1 flex-wrap">
          {FILTER_TYPES.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'ghost'}
              onClick={() => setFilter(f.key)}
              className={cn(
                'h-6 px-2.5 text-xs',
                filter !== f.key && 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No activity yet
          </div>
        ) : (
          filtered.map((entry) => (
            <ActivityLogEntry key={entry.id} entry={entry} />
          ))
        )}
      </ScrollArea>
    </div>
  )
}
