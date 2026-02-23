import { useUIStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { QRLogin } from './qr-login'
import { PhoneLogin } from './phone-login'
import { TwoFactor } from './two-factor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function AuthScreen() {
  const { authMode, setAuthMode } = useUIStore()
  const { step, isAddingAccount, cancelAddAccount } = useAuthStore()

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Card className="w-[400px] shadow-2xl border-border bg-popover">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">
            {isAddingAccount ? 'Add Account' : 'Telegram CRM'}
          </CardTitle>
          <CardDescription>
            {step === '2fa_pending'
              ? 'Enter your cloud password'
              : isAddingAccount
                ? 'Sign in to add another account'
                : 'Sign in to your Telegram account'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {step === '2fa_pending' ? (
            <TwoFactor />
          ) : (
            <Tabs
              value={authMode}
              onValueChange={(v) => setAuthMode(v as 'qr' | 'phone')}
            >
              <TabsList className="w-full mb-6">
                <TabsTrigger value="qr" className="flex-1">QR Code</TabsTrigger>
                <TabsTrigger value="phone" className="flex-1">Phone Number</TabsTrigger>
              </TabsList>
              <TabsContent value="qr">
                <QRLogin />
              </TabsContent>
              <TabsContent value="phone">
                <PhoneLogin />
              </TabsContent>
            </Tabs>
          )}

          {isAddingAccount && (
            <Button
              variant="ghost"
              onClick={() => void cancelAddAccount()}
              className="w-full mt-4 text-muted-foreground"
            >
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
