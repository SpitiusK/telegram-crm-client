import { useState } from 'react'
import { useAuthStore } from '../../stores/auth'
import { ACCOUNT_COLORS } from '@/lib/constants'
import { AccountColumn } from './account-column'
import { ChatSidebar } from './chat-sidebar'
import type { TelegramAccount } from '../../types'

const COLLAPSED_KEY = 'telegram-crm-collapsed-columns'

function loadCollapsedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>
      }
    }
  } catch {
    // ignore
  }
  return {}
}

function persistCollapsedState(state: Record<string, boolean>): void {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(state))
}

export function MultiAccountColumns() {
  const { accounts } = useAuthStore()
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(loadCollapsedState)

  // If only 1 account (or none), just render ChatSidebar
  if (accounts.length <= 1) {
    return <ChatSidebar />
  }

  const toggleCollapse = (accountId: string) => {
    setCollapsedState((prev) => {
      const next = { ...prev, [accountId]: !prev[accountId] }
      persistCollapsedState(next)
      return next
    })
  }

  return (
    <div className="flex flex-row h-full">
      {accounts.map((account: TelegramAccount, index: number) => (
        <AccountColumn
          key={account.id}
          accountId={account.id}
          accountName={account.firstName || account.phone}
          accountColorClass={ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]!}
          isCollapsed={!!collapsedState[account.id]}
          onToggleCollapse={() => toggleCollapse(account.id)}
        />
      ))}
    </div>
  )
}
