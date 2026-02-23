import { useState } from 'react'
import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import type { TelegramAccount } from '../../types'

export function SettingsView() {
  const { theme, setTheme, setShowSettings } = useUIStore()
  const { currentUser, accounts, activeAccountId, logout, removeAccount, startAddAccount } = useAuthStore()

  const [bitrixUrl, setBitrixUrl] = useState(() => localStorage.getItem('bitrix-webhook-url') ?? '')
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem('claude-api-key') ?? '')
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveKeys = () => {
    localStorage.setItem('bitrix-webhook-url', bitrixUrl)
    localStorage.setItem('claude-api-key', claudeKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = () => {
    void logout()
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border bg-popover shrink-0">
        <button
          onClick={() => setShowSettings(false)}
          aria-label="Go back"
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium text-foreground">Settings</h1>
      </div>

      <div className="max-w-xl mx-auto w-full p-6 space-y-8">
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Profile</h2>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-popover">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-semibold text-primary shrink-0">
              {currentUser?.firstName?.[0] ?? '?'}
            </div>
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
        </section>

        {/* Accounts Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Accounts</h2>
          <div className="p-4 rounded-lg bg-popover space-y-2">
            {accounts.map((account: TelegramAccount) => (
              <div key={account.id} className="flex items-center gap-3 py-2">
                {account.avatar ? (
                  <img src={account.avatar} alt={account.firstName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {account.firstName[0] ?? '?'}
                  </div>
                )}
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
                  <button
                    onClick={() => void removeAccount(account.id)}
                    aria-label={`Remove account ${account.firstName}`}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => { setShowSettings(false); void startAddAccount() }}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-primary hover:bg-accent rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Account
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Appearance</h2>
          <div className="p-4 rounded-lg bg-popover space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm">Theme</span>
              <div className="flex rounded-md overflow-hidden border border-border">
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-4 py-1.5 text-sm transition-colors ${
                    theme === 'dark'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`px-4 py-1.5 text-sm transition-colors ${
                    theme === 'light'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">API Keys</h2>
          <div className="p-4 rounded-lg bg-popover space-y-4">
            <div className="space-y-1.5">
              <label className="text-foreground text-sm block">Bitrix24 Webhook URL</label>
              <input
                type="url"
                value={bitrixUrl}
                onChange={(e) => setBitrixUrl(e.target.value)}
                placeholder="https://your-domain.bitrix24.ru/rest/..."
                className="w-full px-3 py-2 bg-muted text-foreground text-sm rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-foreground text-sm block">Claude API Key</label>
              <div className="relative">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 pr-10 bg-muted text-foreground text-sm rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey((v) => !v)}
                  aria-label={showClaudeKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showClaudeKey ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={handleSaveKeys}
              className="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/80 transition-colors"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </section>

        {/* About */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">About</h2>
          <div className="p-4 rounded-lg bg-popover space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">App</span>
              <span className="text-foreground">Telegram CRM Client</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground">0.1.0</span>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-destructive text-sm rounded-md border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
