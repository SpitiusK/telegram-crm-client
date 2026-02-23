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
  return (
    <div className="h-14 px-4 flex items-center border-b border-border bg-popover">
      {/* Back button for topic view */}
      {dialog?.isForum && activeTopic !== null && (
        <button
          onClick={onBackToTopics}
          className="mr-2 p-1.5 rounded-full hover:bg-accent transition-colors"
          aria-label="Back to topics"
          title="Back to topics"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <button
        onClick={onToggleProfile}
        className="flex items-center flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
      >
        {dialog?.avatar ? (
          <img src={dialog.avatar} alt="" className="w-9 h-9 rounded-full object-cover mr-3" />
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-sm font-semibold truncate">
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
          <p className="text-muted-foreground text-xs">
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
      <button
        onClick={onToggleChatSearch}
        className={`p-2 rounded-full transition-colors ${
          showChatSearch
            ? 'bg-primary/20 text-primary'
            : 'hover:bg-accent text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Search in chat"
        title="Search in chat"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </div>
  )
}
