import { UserPlus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TelegramAccount } from '../../types'

export function SettingsAccounts() {
  const { accounts, activeAccountId, removeAccount, startAddAccount } = useAuthStore()
  const { setShowSettings } = useUIStore()

  return (
    <Card className="bg-popover border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">
          Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.map((account: TelegramAccount) => (
          <div key={account.id} className="flex items-center gap-3 py-1">
            <Avatar className="h-10 w-10 shrink-0">
              {account.avatar && <AvatarImage src={account.avatar} alt={account.firstName} />}
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                {account.firstName[0] ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium truncate">
                {account.firstName}
                {account.id === activeAccountId && (
                  <span className="ml-1.5 text-primary text-xs font-normal">(active)</span>
                )}
              </p>
              {account.username && (
                <p className="text-muted-foreground text-xs truncate">@{account.username}</p>
              )}
            </div>
            {accounts.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void removeAccount(account.id)}
                aria-label={`Remove account ${account.firstName}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={() => { setShowSettings(false); void startAddAccount() }}
          className="flex items-center gap-2 w-full text-primary justify-start px-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Account
        </Button>
      </CardContent>
    </Card>
  )
}
