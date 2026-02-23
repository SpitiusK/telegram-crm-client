import { Phone, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { BitrixDeal, BitrixContact } from '../../types'

interface DealInfoProps {
  deal: BitrixDeal
  contact: BitrixContact | null
}

const stageColors: Record<string, string> = {
  NEW: 'bg-crm-new',
  PREPARATION: 'bg-crm-contacted',
  PREPAYMENT_INVOICE: 'bg-crm-testing',
  EXECUTING: 'bg-crm-test-done',
  FINAL_INVOICE: 'bg-crm-agreed',
  WON: 'bg-crm-paid',
}

const stageLabels: Record<string, string> = {
  NEW: 'Новая регистрация',
  PREPARATION: 'Связался после регистрации',
  PREPAYMENT_INVOICE: 'На тесте',
  EXECUTING: 'Тест закончен',
  FINAL_INVOICE: 'Получили согласие',
  WON: 'Оплата',
}

export function DealInfo({ deal, contact }: DealInfoProps) {
  const stageColor = stageColors[deal.STAGE_ID] ?? 'bg-muted'
  const stageLabel = stageLabels[deal.STAGE_ID] ?? deal.STAGE_ID

  return (
    <div className="p-4 space-y-3">
      {/* Deal title */}
      <div>
        <h4 className="text-foreground font-semibold text-sm">{deal.TITLE}</h4>
        <p className="text-muted-foreground text-xs mt-0.5">ID: {deal.ID}</p>
      </div>

      <Separator />

      {/* Stage */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs text-primary font-semibold">Stage</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', stageColor)} />
            <Badge variant="secondary" className="text-xs font-normal">
              {stageLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Amount */}
      {deal.OPPORTUNITY && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-primary font-semibold">Amount</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <p className="text-foreground text-sm font-medium">
              {Number(deal.OPPORTUNITY).toLocaleString('ru-RU')} {deal.CURRENCY_ID}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      {contact && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-primary font-semibold">Contact</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3 space-y-1.5">
            <p className="text-foreground text-sm">
              {contact.NAME} {contact.LAST_NAME}
            </p>
            {contact.PHONE.length > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span>{contact.PHONE[0]?.VALUE}</span>
              </div>
            )}
            {contact.EMAIL.length > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span>{contact.EMAIL[0]?.VALUE}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {deal.COMMENTS && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-primary font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <p className="text-foreground text-xs leading-relaxed bg-background rounded p-2">
              {deal.COMMENTS}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <Button variant="outline" size="sm" className="w-full text-xs" asChild>
        <a
          href={`https://booster-rf.bitrix24.ru/crm/deal/details/${deal.ID}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Bitrix24
        </a>
      </Button>
    </div>
  )
}
