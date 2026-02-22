import { useState } from 'react'
import { useAuthStore } from '../../stores/auth'

export function PhoneLogin() {
  const { phoneCodeHash, error, loginWithPhone, verifyCode } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')

  const handleSendCode = () => {
    if (phone.trim()) {
      void loginWithPhone(phone.trim())
    }
  }

  const handleVerify = () => {
    if (code.trim()) {
      void verifyCode(phone.trim(), code.trim())
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!phoneCodeHash ? (
        <>
          <input
            type="tel"
            placeholder="+7 999 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
            className="w-full px-4 py-3 bg-telegram-input text-telegram-text rounded-lg border border-telegram-border focus:border-telegram-accent focus:outline-none text-sm"
          />
          <button
            onClick={handleSendCode}
            disabled={!phone.trim()}
            className="w-full py-3 bg-telegram-accent text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Code
          </button>
        </>
      ) : (
        <>
          <p className="text-telegram-text-secondary text-sm text-center">
            Code sent to <span className="text-telegram-text">{phone}</span>
          </p>
          <input
            type="text"
            placeholder="12345"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            maxLength={6}
            className="w-full px-4 py-3 bg-telegram-input text-telegram-text rounded-lg border border-telegram-border focus:border-telegram-accent focus:outline-none text-sm text-center tracking-[0.5em] text-lg"
          />
          <button
            onClick={handleVerify}
            disabled={!code.trim()}
            className="w-full py-3 bg-telegram-accent text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verify
          </button>
        </>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  )
}
