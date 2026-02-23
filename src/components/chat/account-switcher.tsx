import { Plus } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '../../stores/auth'
import { useChatsStore } from '../../stores/chats'
import type { TelegramAccount } from '../../types'

function AccountAvatar({
  account,
  isActive,
  onClick,
}: {
  account: TelegramAccount
  isActive: boolean
  onClick: () => void
}) {
  const initial = account.firstName[0] ?? '?'
  return (
    <button
      onClick={onClick}
      aria-label={`Switch to ${account.firstName}${account.username ? ` (@${account.username})` : ''}`}
      title={`${account.firstName}${account.username ? ` (@${account.username})` : ''}`}
      className={cn(
        'flex-shrink-0 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
          : 'opacity-60 hover:opacity-100',
      )}
    >
      <Avatar className="w-8 h-8">
        {account.avatar && <AvatarImage src={account.avatar} alt={account.firstName} />}
        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>
    </button>
  )
}

export function AccountSwitcher() {
  const { accounts, activeAccountId, switchAccount, startAddAccount } = useAuthStore()
  const { loadDialogs } = useChatsStore()

  if (accounts.length === 0) return null

  const handleSwitch = (id: string) => {
    void (async () => {
      await switchAccount(id)
      await loadDialogs()
    })()
  }

  const addButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void startAddAccount()}
      aria-label="Add account"
      title="Add account"
      className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-muted-foreground hover:text-foreground"
    >
      <Plus className="w-4 h-4" />
    </Button>
  )

  if (accounts.length === 1) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border">
        {accounts[0] && <AccountAvatar account={accounts[0]} isActive={true} onClick={() => {}} />}
        {addButton}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border overflow-x-auto scrollbar-none">
      {accounts.map((account) => (
        <AccountAvatar
          key={account.id}
          account={account}
          isActive={account.id === activeAccountId}
          onClick={() => handleSwitch(account.id)}
        />
      ))}
      {addButton}
    </div>
  )
}
