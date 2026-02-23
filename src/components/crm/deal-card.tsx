import type { BitrixDeal } from '../../types'

interface DealCardProps {
  deal: BitrixDeal
}

function daysSince(dateString: string): number {
  const created = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function DealCard({ deal }: DealCardProps) {
  const days = daysSince(deal.DATE_CREATE)
  const amount = Number(deal.OPPORTUNITY)

  return (
    <div className="bg-card rounded-lg p-3">
      <p className="text-foreground text-sm font-medium truncate">
        {deal.TITLE}
      </p>

      {amount > 0 && (
        <p className="text-primary text-xs mt-1">
          {amount.toLocaleString('ru-RU')} {deal.CURRENCY_ID}
        </p>
      )}

      <p className="text-muted-foreground text-xs mt-1">
        {days === 0 ? 'Today' : `${days}d ago`}
      </p>
    </div>
  )
}
