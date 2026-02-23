import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
    <Card className={cn('transition-colors hover:bg-accent cursor-pointer')}>
      <CardContent className="p-3 space-y-1.5">
        <p className="text-foreground text-sm font-medium truncate">{deal.TITLE}</p>
        {amount > 0 && (
          <Badge variant="secondary" className="text-xs font-normal text-primary">
            {amount.toLocaleString('ru-RU')} {deal.CURRENCY_ID}
          </Badge>
        )}
        <p className="text-muted-foreground text-xs">
          {days === 0 ? 'Today' : `${days}d ago`}
        </p>
      </CardContent>
    </Card>
  )
}
