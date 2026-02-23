import { useState } from 'react'
import { Eye, EyeOff, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function SettingsApiKeys() {
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

  return (
    <Card className="bg-popover border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">
          API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-foreground text-sm block">Bitrix24 Webhook URL</label>
          <Input
            type="url"
            value={bitrixUrl}
            onChange={(e) => setBitrixUrl(e.target.value)}
            placeholder="https://your-domain.bitrix24.ru/rest/..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-foreground text-sm block">Claude API Key</label>
          <div className="relative">
            <Input
              type={showClaudeKey ? 'text' : 'password'}
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowClaudeKey((v) => !v)}
              aria-label={showClaudeKey ? 'Hide API key' : 'Show API key'}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <Button
          onClick={handleSaveKeys}
          variant={saved ? 'outline' : 'default'}
          size="sm"
          className={cn(saved && 'text-primary border-primary')}
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Saved
            </>
          ) : (
            'Save'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
