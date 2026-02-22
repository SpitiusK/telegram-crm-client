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
    <div className="flex-1 flex flex-col bg-telegram-bg overflow-y-auto">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-telegram-border bg-telegram-sidebar shrink-0">
        <button
          onClick={() => setShowSettings(false)}
          className="p-1.5 rounded-md hover:bg-telegram-hover text-telegram-text-secondary hover:text-telegram-text transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium text-telegram-text">Settings</h1>
      </div>

      <div className="max-w-xl mx-auto w-full p-6 space-y-8">
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-telegram-accent uppercase tracking-wider">Profile</h2>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-telegram-sidebar">
            <div className="w-16 h-16 rounded-full bg-telegram-accent/20 flex items-center justify-center text-2xl font-semibold text-telegram-accent shrink-0">
              {currentUser?.firstName?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-telegram-text font-medium truncate">
                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Unknown'}
              </p>
              {currentUser?.username && (
                <p className="text-telegram-text-secondary text-sm truncate">@{currentUser.username}</p>
              )}
              {currentUser?.phone && (
                <p className="text-telegram-text-secondary text-sm">+{currentUser.phone}</p>
              )}
            </div>
          </div>
        </section>

        {/* Accounts Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-telegram-accent uppercase tracking-wider">Accounts</h2>
          <div className="p-4 rounded-lg bg-telegram-sidebar space-y-2">
            {accounts.map((account: TelegramAccount) => (
              <div key={account.id} className="flex items-center gap-3 py-2">
                {account.avatar ? (
                  <img src={account.avatar} alt={account.firstName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-telegram-accent/20 flex items-center justify-center text-sm font-semibold text-telegram-accent shrink-0">
                    {account.firstName[0] ?? '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-telegram-text text-sm font-medium truncate">
                    {account.firstName}
                    {account.id === activeAccountId && (
                      <span className="ml-1.5 text-telegram-accent text-xs font-normal">(active)</span>
                    )}
                  </p>
                  {account.username && (
                    <p className="text-telegram-text-secondary text-xs truncate">@{account.username}</p>
                  )}
                </div>
                {accounts.length > 1 && (
                  <button
                    onClick={() => void removeAccount(account.id)}
                    className="p-1.5 text-telegram-text-secondary hover:text-red-400 transition-colors shrink-0"
                    title="Remove account"
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
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-telegram-accent hover:bg-telegram-hover rounded-md transition-colors"
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
          <h2 className="text-sm font-semibold text-telegram-accent uppercase tracking-wider">Appearance</h2>
          <div className="p-4 rounded-lg bg-telegram-sidebar space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-telegram-text text-sm">Theme</span>
              <div className="flex rounded-md overflow-hidden border border-telegram-border">
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-4 py-1.5 text-sm transition-colors ${
                    theme === 'dark'
                      ? 'bg-telegram-accent text-white'
                      : 'bg-telegram-input text-telegram-text-secondary hover:text-telegram-text'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`px-4 py-1.5 text-sm transition-colors ${
                    theme === 'light'
                      ? 'bg-telegram-accent text-white'
                      : 'bg-telegram-input text-telegram-text-secondary hover:text-telegram-text'
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
          <h2 className="text-sm font-semibold text-telegram-accent uppercase tracking-wider">API Keys</h2>
          <div className="p-4 rounded-lg bg-telegram-sidebar space-y-4">
            <div className="space-y-1.5">
              <label className="text-telegram-text text-sm block">Bitrix24 Webhook URL</label>
              <input
                type="url"
                value={bitrixUrl}
                onChange={(e) => setBitrixUrl(e.target.value)}
                placeholder="https://your-domain.bitrix24.ru/rest/..."
                className="w-full px-3 py-2 bg-telegram-input text-telegram-text text-sm rounded-md border border-telegram-border focus:outline-none focus:ring-1 focus:ring-telegram-accent placeholder:text-telegram-text-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-telegram-text text-sm block">Claude API Key</label>
              <div className="relative">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 pr-10 bg-telegram-input text-telegram-text text-sm rounded-md border border-telegram-border focus:outline-none focus:ring-1 focus:ring-telegram-accent placeholder:text-telegram-text-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-telegram-text-secondary hover:text-telegram-text p-1"
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
              className="px-4 py-2 bg-telegram-accent text-white text-sm rounded-md hover:bg-telegram-accent/80 transition-colors"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </section>

        {/* About */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-telegram-accent uppercase tracking-wider">About</h2>
          <div className="p-4 rounded-lg bg-telegram-sidebar space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-telegram-text-secondary">App</span>
              <span className="text-telegram-text">Telegram CRM Client</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-telegram-text-secondary">Version</span>
              <span className="text-telegram-text">0.1.0</span>
            </div>
            <div className="border-t border-telegram-border pt-3 mt-3">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-red-400 text-sm rounded-md border border-red-400/30 hover:bg-red-400/10 transition-colors"
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
