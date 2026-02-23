import { MessageSquare, FileText, Zap, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'

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

type LucideIcon = React.ComponentType<{ className?: string }>

const actionIcons: Record<string, LucideIcon> = {
  message_sent: MessageSquare,
  deal_updated: FileText,
  ai_generated: Zap,
  login: LogIn,
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
  const Icon = actionIcons[entry.actionType] ?? MessageSquare
  const colorClass = actionColors[entry.actionType] ?? 'text-muted-foreground'
  const label = actionLabels[entry.actionType] ?? entry.actionType

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors">
      {/* Icon */}
      <div className={cn('mt-0.5 flex-shrink-0', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-xs font-medium">{label}</span>
          <span className="text-muted-foreground text-[11px]">
            {entry.entityType}:{entry.entityId}
          </span>
        </div>
        {entry.details && (
          <p className="text-muted-foreground text-[11px] mt-0.5 truncate">
            {entry.details}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-muted-foreground text-[11px] flex-shrink-0 mt-0.5">
        {formatTimestamp(entry.createdAt)}
      </span>
    </div>
  )
}

export type { ActivityLogEntryData }
