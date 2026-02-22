import { useState } from 'react'
import { useChatsStore } from '../../stores/chats'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { UserProfilePanel } from './user-profile-panel'

export function ChatView() {
  const { activeChat, dialogs } = useChatsStore()
  const [showProfile, setShowProfile] = useState(false)

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-telegram-bg">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-telegram-text-secondary text-lg">Select a chat to start messaging</p>
        </div>
      </div>
    )
  }

  const currentDialog = dialogs.find((d) => d.id === activeChat)

  return (
    <div className="flex-1 flex min-w-0">
      <div className="flex-1 flex flex-col bg-telegram-bg min-w-0">
        {/* Chat header — click to open profile */}
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="h-14 px-4 flex items-center border-b border-telegram-border bg-telegram-sidebar hover:bg-telegram-hover transition-colors text-left"
        >
          {currentDialog?.avatar ? (
            <img src={currentDialog.avatar} alt="" className="w-9 h-9 rounded-full object-cover mr-3" />
          ) : null}
          <div>
            <h2 className="text-telegram-text text-sm font-semibold">
              {currentDialog?.title ?? 'Chat'}
            </h2>
            <p className="text-telegram-text-secondary text-xs">
              {currentDialog?.username ? `@${currentDialog.username}` : (
                currentDialog?.isGroup ? 'group' :
                currentDialog?.isChannel ? 'channel' :
                currentDialog?.isUser ? 'user' : ''
              )}
            </p>
          </div>
        </button>

        {/* Messages */}
        <MessageList />

        {/* Input */}
        <MessageInput />
      </div>

      {/* Profile panel */}
      {showProfile && currentDialog && (
        <UserProfilePanel
          userId={currentDialog.id}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
