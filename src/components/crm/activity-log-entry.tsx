interface ActivityLogEntryData {
  id: number
  actionType: string
  entityType: string
  entityId: string
  details: string
  createdAt: string
}

interface ActivityLogEntryProps {
  entry: ActivityLogEntryData
}

const actionIcons: Record<string, string> = {
  message_sent: 'M4 4h16v12H5.17L4 17.17V4z',
  deal_updated: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  ai_generated: 'M13 10V3L4 14h7v7l9-11h-7z',
  login: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
}

const actionColors: Record<string, string> = {
  message_sent: 'text-telegram-accent',
  deal_updated: 'text-crm-contacted',
  ai_generated: 'text-crm-testing',
  login: 'text-crm-agreed',
}

const actionLabels: Record<string, string> = {
  message_sent: 'Message sent',
  deal_updated: 'Deal updated',
  ai_generated: 'AI generated',
  login: 'Login',
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  if (isToday) {
    return time
  }

  const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  return `${dateStr} ${time}`
}

export function ActivityLogEntry({ entry }: ActivityLogEntryProps) {
  const iconPath = actionIcons[entry.actionType] ?? actionIcons['message_sent']
  const colorClass = actionColors[entry.actionType] ?? 'text-telegram-text-secondary'
  const label = actionLabels[entry.actionType] ?? entry.actionType

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-telegram-hover transition-colors">
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-telegram-text text-xs font-medium">{label}</span>
          <span className="text-telegram-text-secondary text-[11px]">
            {entry.entityType}:{entry.entityId}
          </span>
        </div>
        {entry.details && (
          <p className="text-telegram-text-secondary text-[11px] mt-0.5 truncate">
            {entry.details}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-telegram-text-secondary text-[11px] flex-shrink-0 mt-0.5">
        {formatTimestamp(entry.createdAt)}
      </span>
    </div>
  )
}

export type { ActivityLogEntryData }
