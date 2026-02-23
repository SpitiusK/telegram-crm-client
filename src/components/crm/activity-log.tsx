import { useState, useEffect, useCallback } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { ActivityLogEntry } from './activity-log-entry'
import type { ActivityLogEntryData } from './activity-log-entry'

const FILTER_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'message_sent', label: '💬 Messages' },
  { key: 'deal_updated', label: '📋 Deals' },
  { key: 'ai_generated', label: '✨ AI' },
  { key: 'login', label: '🔑 Auth' },
] as const

export function ActivityLog() {
  const [entries, setEntries] = useState<ActivityLogEntryData[]>([])
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load from SQLite via IPC
      const raw = await window.electronAPI.db.getCachedMessages('__activity_log__')
      // Parse activity entries from cached format
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
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                filter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
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
      </div>
    </div>
  )
}
