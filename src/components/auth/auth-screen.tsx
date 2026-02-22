import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { QRLogin } from './qr-login'
import { PhoneLogin } from './phone-login'
import { TwoFactor } from './two-factor'

export function AuthScreen() {
  const { authMode, setAuthMode } = useUIStore()
  const { step, isAddingAccount, cancelAddAccount } = useAuthStore()

  return (
    <div className="flex items-center justify-center h-screen bg-telegram-bg">
      <div className="w-[380px] bg-telegram-sidebar rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-telegram-text text-center mb-2">
          {isAddingAccount ? 'Add Account' : 'Telegram CRM'}
        </h1>
        <p className="text-telegram-text-secondary text-center text-sm mb-6">
          {step === '2fa_pending'
            ? 'Enter your cloud password'
            : isAddingAccount
              ? 'Sign in to add another account'
              : 'Sign in to your Telegram account'}
        </p>

        {step === '2fa_pending' ? (
          <TwoFactor />
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex mb-6 bg-telegram-bg rounded-lg p-1">
              <button
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                  authMode === 'qr'
                    ? 'bg-telegram-accent text-white'
                    : 'text-telegram-text-secondary hover:text-telegram-text'
                }`}
                onClick={() => setAuthMode('qr')}
              >
                QR Code
              </button>
              <button
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                  authMode === 'phone'
                    ? 'bg-telegram-accent text-white'
                    : 'text-telegram-text-secondary hover:text-telegram-text'
                }`}
                onClick={() => setAuthMode('phone')}
              >
                Phone Number
              </button>
            </div>

            {authMode === 'qr' ? <QRLogin /> : <PhoneLogin />}
          </>
        )}

        {isAddingAccount && (
          <button
            onClick={() => void cancelAddAccount()}
            className="w-full mt-4 py-2 text-sm text-telegram-text-secondary hover:text-telegram-text transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
