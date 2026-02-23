import { useChatsStore } from '../../stores/chats'
import type { ForumTopic } from '../../types'
import { Spinner } from '@/components/ui/spinner'

const TOPIC_COLORS: Record<number, string> = {
  0x6FB9F0: '#6FB9F0',
  0xFFD67E: '#FFD67E',
  0xCB86DB: '#CB86DB',
  0x8EEE98: '#8EEE98',
  0xFF93B2: '#FF93B2',
  0xFB6F5F: '#FB6F5F',
}

function getTopicColor(iconColor: number): string {
  return TOPIC_COLORS[iconColor] ?? '#6FB9F0'
}

function formatDate(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function TopicItem({ topic }: { topic: ForumTopic }) {
  const setActiveTopic = useChatsStore((s) => s.setActiveTopic)

  return (
    <button
      onClick={() => setActiveTopic(topic.id)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: getTopicColor(topic.iconColor) }}
      >
        {topic.iconEmojiId ? '💬' : '#'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-foreground truncate">
            {topic.title}
          </span>
          {(topic.lastMessageDate ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {formatDate(topic.lastMessageDate ?? 0)}
            </span>
          )}
        </div>
        {topic.lastMessage && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {topic.lastMessage}
          </p>
        )}
      </div>
      {topic.unreadCount > 0 && (
        <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0">
          {topic.unreadCount}
        </span>
      )}
    </button>
  )
}

export function ForumTopicsList() {
  const { forumTopics, isLoadingTopics } = useChatsStore()

  if (isLoadingTopics) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (forumTopics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No topics found</p>
      </div>
    )
  }

  // Sort: pinned first, then by last message date
  const sorted = [...forumTopics].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (b.lastMessageDate ?? 0) - (a.lastMessageDate ?? 0)
  })

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="divide-y divide-border">
        {sorted.map((topic) => (
          <TopicItem key={topic.id} topic={topic} />
        ))}
      </div>
    </div>
  )
}
