import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

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
      <div className="text-center space-y-1">
        <div className="flex justify-center mb-2">
          <LockKeyhole className="w-10 h-10 text-primary" />
        </div>
        <p className="text-foreground text-sm font-medium">
          Two-Factor Authentication
        </p>
        <p className="text-muted-foreground text-xs">
          Enter your cloud password
        </p>
      </div>

      <Input
        type="password"
        placeholder="Cloud password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
        autoFocus
      />

      <Button
        onClick={() => void handleSubmit()}
        disabled={!password.trim() || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? <Spinner size="sm" /> : 'Submit'}
      </Button>

      {error && (
        <p className="text-destructive text-xs text-center">{error}</p>
      )}
    </div>
  )
}
