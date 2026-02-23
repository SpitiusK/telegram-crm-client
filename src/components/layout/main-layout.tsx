import { useEffect, useCallback, useState } from 'react'
import { MessageSquare, BarChart2, ClipboardList, Columns2, Settings } from 'lucide-react'
import { telegramAPI } from '../../lib/telegram'
import { useChatsStore } from '../../stores/chats'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { ChatSidebar } from '../chat/chat-sidebar'
import { MultiAccountColumns } from '../chat/multi-account-columns'
import { ChatView } from '../chat/chat-view'
import { CrmPanel } from '../crm/crm-panel'
import { PipelineBoard } from '../crm/pipeline-board'
import { ActivityLog } from '../crm/activity-log'
import { SettingsView } from '../settings/settings-view'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LayoutMode = 'single' | 'columns'

const LAYOUT_MODE_KEY = 'telegram-crm-layout-mode'

function loadLayoutMode(): LayoutMode {
  const stored = localStorage.getItem(LAYOUT_MODE_KEY)
  if (stored === 'columns') return 'columns'
  return 'single'
}

export function MainLayout() {
  const { loadDialogs, loadAllAccountDialogs, loadUserFolders, setupRealtimeUpdates } = useChatsStore()
  const { view, setView, crmPanelOpen, showSettings, setShowSettings } = useUIStore()
  const { currentUser, accounts } = useAuthStore()
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(loadLayoutMode)

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode((prev) => {
      const next: LayoutMode = prev === 'single' ? 'columns' : 'single'
      localStorage.setItem(LAYOUT_MODE_KEY, next)
      return next
    })
  }, [])

  const showColumns = layoutMode === 'columns' && accounts.length > 1

  useEffect(() => {
    if (accounts.length > 1) {
      void telegramAPI.connectAll().then(() => loadAllAccountDialogs())
    } else {
      void loadDialogs()
    }
    void loadUserFolders()
    const cleanup = setupRealtimeUpdates()
    return cleanup
  }, [accounts.length, loadDialogs, loadAllAccountDialogs, loadUserFolders, setupRealtimeUpdates])

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top nav bar */}
      <div className="h-12 flex items-center justify-between px-4 bg-popover border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant={view === 'chats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('chats')}
            className={cn(
              'gap-1.5',
              view !== 'chats' && 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chats
          </Button>
          <Button
            variant={view === 'pipeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('pipeline')}
            className={cn(
              'gap-1.5',
              view !== 'pipeline' && 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Pipeline
          </Button>
          <Button
            variant={view === 'activity' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('activity')}
            className={cn(
              'gap-1.5',
              view !== 'activity' && 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Activity
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLayoutMode}
              aria-label={layoutMode === 'columns' ? 'Switch to single sidebar' : 'Switch to multi-column layout'}
              title={layoutMode === 'columns' ? 'Switch to single sidebar' : 'Switch to multi-column layout'}
              className={cn(
                'h-8 w-8',
                showColumns
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Columns2 className="w-4 h-4" />
            </Button>
          )}
          {currentUser && (
            <span className="text-muted-foreground text-xs">
              {currentUser.firstName} {currentUser.lastName}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            title="Settings"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4" />
          </Button>
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
              {showColumns ? <MultiAccountColumns /> : <ChatSidebar />}
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
