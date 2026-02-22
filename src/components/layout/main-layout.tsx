import { useEffect } from 'react'
import { useChatsStore } from '../../stores/chats'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { ChatSidebar } from '../chat/chat-sidebar'
import { ChatView } from '../chat/chat-view'
import { CrmPanel } from '../crm/crm-panel'
import { PipelineBoard } from '../crm/pipeline-board'
import { ActivityLog } from '../crm/activity-log'
import { SettingsView } from '../settings/settings-view'

export function MainLayout() {
  const { loadDialogs, setupRealtimeUpdates } = useChatsStore()
  const { view, setView, crmPanelOpen, showSettings, setShowSettings } = useUIStore()
  const { currentUser } = useAuthStore()

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
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-md text-telegram-text-secondary hover:text-telegram-text hover:bg-telegram-hover transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      {showSettings ? (
        <div className="flex flex-1 overflow-hidden">
          <SettingsView />
        </div>
      ) : (
        <>
          {view === 'chats' && (
            <div className="flex flex-1 overflow-hidden">
              <ChatSidebar />
              <ChatView />
              {crmPanelOpen && <CrmPanel />}
            </div>
          )}
          {view === 'pipeline' && <PipelineBoard />}
          {view === 'activity' && <ActivityLog />}
        </>
      )}
    </div>
  )
}
