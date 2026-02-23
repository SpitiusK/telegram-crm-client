import { useState } from 'react'
import { useAuthStore } from '../../stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
          <Input
            type="tel"
            placeholder="+7 999 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
          />
          <Button
            onClick={handleSendCode}
            disabled={!phone.trim()}
            className="w-full"
          >
            Send Code
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm text-center">
            Code sent to <span className="text-foreground">{phone}</span>
          </p>
          <Input
            type="text"
            placeholder="12345"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            maxLength={6}
            className="text-center tracking-[0.5em] text-lg"
          />
          <Button
            onClick={handleVerify}
            disabled={!code.trim()}
            className="w-full"
          >
            Verify
          </Button>
        </>
      )}

      {error && (
        <p className="text-destructive text-xs text-center">{error}</p>
      )}
    </div>
  )
}
