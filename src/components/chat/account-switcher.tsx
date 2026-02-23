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
      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
        isActive
          ? 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
          : 'opacity-60 hover:opacity-100'
      }`}
    >
      {account.avatar ? (
        <img src={account.avatar} alt={account.firstName} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
          {initial}
        </span>
      )}
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
    <button
      onClick={() => void startAddAccount()}
      aria-label="Add account"
      title="Add account"
      className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
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
