import { useEffect } from 'react'
import { useAuthStore } from '../../stores/auth'
import { Spinner } from '@/components/ui/spinner'

export function QRLogin() {
  const { qrUrl, error, requestQR } = useAuthStore()

  useEffect(() => {
    void requestQR()
  }, [requestQR])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-[200px] h-[200px] bg-white rounded-lg flex items-center justify-center overflow-hidden">
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" className="w-full h-full" />
        ) : (
          <Spinner size="lg" />
        )}
      </div>

      <div className="text-center">
        <p className="text-foreground text-sm font-medium">Scan with Telegram</p>
        <p className="text-muted-foreground text-xs mt-1">
          Open Telegram on your phone → Settings → Devices → Link Desktop Device
        </p>
      </div>

      {error && (
        <p className="text-destructive text-xs text-center">{error}</p>
      )}

      <button
        onClick={() => void requestQR()}
        className="text-primary text-sm hover:underline"
      >
        Refresh QR Code
      </button>
    </div>
  )
}
