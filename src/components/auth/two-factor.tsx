import { useState } from 'react'
import { useAuthStore } from '../../stores/auth'

export function TwoFactor() {
  const { error, submit2FA } = useAuthStore()
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!password.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await submit2FA(password)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-4xl mb-2">🔐</div>
        <p className="text-telegram-text text-sm font-medium">
          Two-Factor Authentication
        </p>
        <p className="text-telegram-text-secondary text-xs mt-1">
          Enter your cloud password
        </p>
      </div>

      <input
        type="password"
        placeholder="Cloud password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
        className="w-full px-4 py-3 bg-telegram-input text-telegram-text rounded-lg border border-telegram-border focus:border-telegram-accent focus:outline-none text-sm"
        autoFocus
      />

      <button
        onClick={() => void handleSubmit()}
        disabled={!password.trim() || isSubmitting}
        className="w-full py-3 bg-telegram-accent text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Verifying...' : 'Submit'}
      </button>

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  )
}
