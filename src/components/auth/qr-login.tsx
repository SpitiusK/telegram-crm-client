import { useEffect } from 'react'
import { useAuthStore } from '../../stores/auth'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

export function QRLogin() {
  const { qrUrl, error, requestQR } = useAuthStore()

  useEffect(() => {
    void requestQR()
  }, [requestQR])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-[200px] h-[200px] bg-white rounded-xl p-2 flex items-center justify-center overflow-hidden shadow-sm">
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
        ) : (
          <Spinner size="lg" />
        )}
      </div>

      <div className="text-center space-y-1">
        <p className="text-foreground text-sm font-medium">Scan with Telegram</p>
        <p className="text-muted-foreground text-xs">
          Open Telegram on your phone → Settings → Devices → Link Desktop Device
        </p>
      </div>

      {error && (
        <p className="text-destructive text-xs text-center">{error}</p>
      )}

      <Button
        variant="link"
        size="sm"
        onClick={() => void requestQR()}
        className="text-primary"
      >
        Refresh QR Code
      </Button>
    </div>
  )
}
