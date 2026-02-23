import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { useChatsStore } from '../../stores/chats'
import { useAuthStore } from '../../stores/auth'
import { ACCOUNT_TEXT_COLORS, ACCOUNT_BG_LIGHT_COLORS } from '@/lib/constants'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { UserProfilePanel } from './user-profile-panel'
import { ForumTopicsList } from './forum-topics-list'
import { ChatHeader } from './chat-header'
import { ChatSearchBar } from './chat-search-bar'

export function ChatView() {
  const { activeChat, dialogs, activeTopic, forumTopics, clearActiveTopic, typingUsers } = useChatsStore()
  const accountDialogs = useChatsStore((s) =>
    s.activeChat ? s.accountStates[s.activeChat.accountId]?.dialogs : undefined
  )
  const accounts = useAuthStore((s) => s.accounts)
  const activeAccount = activeChat
    ? accounts.find((a) => a.id === activeChat.accountId)
    : undefined
  const accountIndex = activeAccount
    ? accounts.findIndex((a) => a.id === activeAccount.id)
    : -1
  const accountBadgeBg = accountIndex >= 0
    ? ACCOUNT_BG_LIGHT_COLORS[accountIndex % ACCOUNT_BG_LIGHT_COLORS.length]
    : undefined
  const accountBadgeText = accountIndex >= 0
    ? ACCOUNT_TEXT_COLORS[accountIndex % ACCOUNT_TEXT_COLORS.length]
    : undefined
  const [showProfile, setShowProfile] = useState(false)
  const [showChatSearch, setShowChatSearch] = useState(false)
  const [now, setNow] = useState(Date.now)

  const typingEntries = activeChat ? (typingUsers[activeChat.chatId] ?? []) : []
  const hasTypingEntries = typingEntries.length > 0

  useEffect(() => {
    if (!hasTypingEntries) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasTypingEntries])

  const isTyping = typingEntries.some((e) => now - e.timestamp < 5000)

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Select a chat to start messaging</p>
        </div>
      </div>
    )
  }

  const currentDialog = accountDialogs?.find((d) => d.id === activeChat.chatId)
    ?? dialogs.find((d) => d.id === activeChat.chatId)

  const handleToggleChatSearch = () => {
    setShowChatSearch((prev) => !prev)
  }

  const handleCloseChatSearch = () => {
    setShowChatSearch(false)
  }

  return (
    <div className="flex-1 flex min-w-0">
      <div className="flex-1 flex flex-col bg-background min-w-0">
        <ChatHeader
          dialog={currentDialog}
          activeAccount={activeAccount}
          multiAccount={accounts.length > 1}
          activeTopic={activeTopic}
          forumTopics={forumTopics}
          isTyping={isTyping}
          showChatSearch={showChatSearch}
          accountBadgeBg={accountBadgeBg}
          accountBadgeText={accountBadgeText}
          onBackToTopics={clearActiveTopic}
          onToggleProfile={() => setShowProfile((prev) => !prev)}
          onToggleChatSearch={handleToggleChatSearch}
        />

        <ChatSearchBar
          chatId={activeChat.chatId}
          accountId={activeChat.accountId}
          isVisible={showChatSearch}
          onClose={handleCloseChatSearch}
        />

        {/* Content: forum topics list OR messages */}
        {currentDialog?.isForum && activeTopic === null ? (
          <ForumTopicsList />
        ) : (
          <>
            <MessageList />
            <MessageInput />
          </>
        )}
      </div>

      {/* Profile panel */}
      {showProfile && currentDialog && (
        <UserProfilePanel
          userId={currentDialog.id}
          accountId={activeChat.accountId}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
