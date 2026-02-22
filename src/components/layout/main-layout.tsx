import { useEffect } from 'react'
import { useChatsStore } from '../../stores/chats'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { ChatSidebar } from '../chat/chat-sidebar'
import { ChatView } from '../chat/chat-view'
import { CrmPanel } from '../crm/crm-panel'
import { PipelineBoard } from '../crm/pipeline-board'
import { ActivityLog } from '../crm/activity-log'

export function MainLayout() {
  const { loadDialogs, setupRealtimeUpdates } = useChatsStore()
  const { view, setView, crmPanelOpen } = useUIStore()
  const { currentUser, logout } = useAuthStore()

  useEffect(() => {
    void loadDialogs()
    const cleanup = setupRealtimeUpdates()
    return cleanup
  }, [loadDialogs, setupRealtimeUpdates])

  return (
    <div className="flex flex-col h-screen bg-telegram-bg overflow-hidden">
      {/* Top nav bar */}
      <div className="h-12 flex items-center justify-between px-4 bg-telegram-sidebar border-b border-telegram-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('chats')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === 'chats'
                ? 'bg-telegram-accent text-white'
                : 'text-telegram-text-secondary hover:text-telegram-text'
            }`}
          >
            💬 Chats
          </button>
          <button
            onClick={() => setView('pipeline')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === 'pipeline'
                ? 'bg-telegram-accent text-white'
                : 'text-telegram-text-secondary hover:text-telegram-text'
            }`}
          >
            📊 Pipeline
          </button>
          <button
            onClick={() => setView('activity')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === 'activity'
                ? 'bg-telegram-accent text-white'
                : 'text-telegram-text-secondary hover:text-telegram-text'
            }`}
          >
            📝 Activity
          </button>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && (
            <span className="text-telegram-text-secondary text-xs">
              {currentUser.firstName} {currentUser.lastName}
            </span>
          )}
          <button
            onClick={() => void logout()}
            className="text-telegram-text-secondary text-xs hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      {view === 'chats' && (
        <div className="flex flex-1 overflow-hidden">
          <ChatSidebar />
          <ChatView />
          {crmPanelOpen && <CrmPanel />}
        </div>
      )}
      {view === 'pipeline' && <PipelineBoard />}
      {view === 'activity' && <ActivityLog />}
    </div>
  )
}
