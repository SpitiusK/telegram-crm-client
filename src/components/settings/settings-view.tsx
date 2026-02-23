import { ArrowLeft, LogOut } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { SettingsAccounts } from './settings-accounts'
import { SettingsApiKeys } from './settings-api-keys'

export function SettingsView() {
  const { theme, setTheme, setShowSettings } = useUIStore()
  const { currentUser, logout } = useAuthStore()

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border bg-popover shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(false)}
          aria-label="Go back"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-medium text-foreground">Settings</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-xl mx-auto w-full p-6 space-y-6">
          {/* Profile */}
          <Card className="bg-popover border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
                    {currentUser?.firstName?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">
                    {currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Unknown'}
                  </p>
                  {currentUser?.username && (
                    <p className="text-muted-foreground text-sm truncate">@{currentUser.username}</p>
                  )}
                  {currentUser?.phone && (
                    <p className="text-muted-foreground text-sm">+{currentUser.phone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <SettingsAccounts />

          {/* Appearance */}
          <Card className="bg-popover border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">Theme</span>
                <div className="flex rounded-md overflow-hidden border border-border">
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className={cn(
                      'px-4 py-1.5 text-sm rounded-none border-0',
                      theme !== 'dark' && 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className={cn(
                      'px-4 py-1.5 text-sm rounded-none border-0',
                      theme !== 'light' && 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Light
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <SettingsApiKeys />

          {/* About */}
          <Card className="bg-popover border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">App</span>
                <span className="text-foreground">Telegram CRM Client</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground">0.1.0</span>
              </div>
              <Separator className="bg-border" />
              <Button
                variant="destructive"
                onClick={() => void logout()}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
