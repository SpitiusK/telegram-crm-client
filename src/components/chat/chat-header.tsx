import { ChevronLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { TelegramDialog, TelegramAccount, ForumTopic } from '@/types'

interface ChatHeaderProps {
  dialog: TelegramDialog | undefined
  activeAccount: TelegramAccount | undefined
  multiAccount: boolean
  activeTopic: number | null
  forumTopics: ForumTopic[]
  isTyping: boolean
  showChatSearch: boolean
  onBackToTopics: () => void
  onToggleProfile: () => void
  onToggleChatSearch: () => void
}

export function ChatHeader({
  dialog,
  activeAccount,
  multiAccount,
  activeTopic,
  forumTopics,
  isTyping,
  showChatSearch,
  onBackToTopics,
  onToggleProfile,
  onToggleChatSearch,
}: ChatHeaderProps) {
  const initials = dialog?.title
    ? dialog.title.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
    : '?'

  return (
    <div className="h-14 px-4 flex items-center border-b border-border bg-popover">
      {/* Back button for topic view */}
      {dialog?.isForum && activeTopic !== null && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBackToTopics}
          aria-label="Back to topics"
          title="Back to topics"
          className="mr-2 rounded-full"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Button>
      )}
      <button
        onClick={onToggleProfile}
        className="flex items-center flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
      >
        <Avatar className="w-9 h-9 mr-3 shrink-0">
          {dialog?.avatar && <AvatarImage src={dialog.avatar} alt={dialog.title ?? ''} />}
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-[14px] font-semibold truncate">
              {dialog?.isForum && activeTopic !== null
                ? forumTopics.find((t) => t.id === activeTopic)?.title ?? 'Topic'
                : dialog?.title ?? 'Chat'}
            </h2>
            {multiAccount && activeAccount && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary shrink-0">
                {activeAccount.firstName}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-[12px]">
            {isTyping ? (
              <span className="text-primary">
                typing
                <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-pulse" style={{ animationDelay: '300ms' }}>.</span>
                <span className="animate-pulse" style={{ animationDelay: '600ms' }}>.</span>
              </span>
            ) : dialog?.isForum && activeTopic === null
              ? `${forumTopics.length} topics`
              : dialog?.username ? `@${dialog.username}` : (
                dialog?.isGroup ? 'group' :
                dialog?.isChannel ? 'channel' :
                dialog?.isUser ? 'user' : ''
              )}
          </p>
        </div>
      </button>

      {/* Search button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleChatSearch}
        aria-label="Search in chat"
        title="Search in chat"
        className={cn(
          'rounded-full',
          showChatSearch
            ? 'bg-primary/20 text-primary hover:bg-primary/30'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Search className="w-5 h-5" />
      </Button>
    </div>
  )
}
