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
    <div className="p-4 space-y-4">
      {/* Deal title */}
      <div>
        <h4 className="text-foreground font-medium text-sm">{deal.TITLE}</h4>
        <p className="text-muted-foreground text-xs mt-0.5">ID: {deal.ID}</p>
      </div>

      {/* Stage */}
      <div>
        <p className="text-muted-foreground text-xs mb-1.5">Stage</p>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stageColor}`} />
          <span className="text-foreground text-sm">{stageLabel}</span>
        </div>
      </div>

      {/* Amount */}
      {deal.OPPORTUNITY && (
        <div>
          <p className="text-muted-foreground text-xs mb-1">Amount</p>
          <p className="text-foreground text-sm font-medium">
            {Number(deal.OPPORTUNITY).toLocaleString('ru-RU')} {deal.CURRENCY_ID}
          </p>
        </div>
      )}

      {/* Contact */}
      {contact && (
        <div>
          <p className="text-muted-foreground text-xs mb-1">Contact</p>
          <p className="text-foreground text-sm">
            {contact.NAME} {contact.LAST_NAME}
          </p>
          {contact.PHONE.length > 0 && (
            <p className="text-muted-foreground text-xs mt-0.5">
              📞 {contact.PHONE[0]?.VALUE}
            </p>
          )}
          {contact.EMAIL.length > 0 && (
            <p className="text-muted-foreground text-xs mt-0.5">
              ✉️ {contact.EMAIL[0]?.VALUE}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {deal.COMMENTS && (
        <div>
          <p className="text-muted-foreground text-xs mb-1">Notes</p>
          <p className="text-foreground text-xs bg-background rounded-lg p-2">
            {deal.COMMENTS}
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <a
          href={`https://booster-rf.bitrix24.ru/crm/deal/details/${deal.ID}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-center text-xs text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
        >
          Open in Bitrix24
        </a>
      </div>
    </div>
  )
}
