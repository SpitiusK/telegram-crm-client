import { useEffect } from 'react'
import { useCrmStore } from '../../stores/crm'
import { Spinner } from '@/components/ui/spinner'
import type { BitrixDeal } from '../../types'
import { DealCard } from './deal-card'

interface PipelineStage {
  stageId: string
  label: string
}

const PIPELINE_STAGES: PipelineStage[] = [
  { stageId: 'NEW', label: 'Новая' },
  { stageId: 'PREPARATION', label: 'Связался' },
  { stageId: 'PREPAYMENT_INVOICE', label: 'На тесте' },
  { stageId: 'EXECUTING', label: 'Тест закончен' },
  { stageId: 'FINAL_INVOICE', label: 'Согласие' },
  { stageId: 'WON', label: 'Оплата' },
]

function groupDealsByStage(deals: BitrixDeal[]): Record<string, BitrixDeal[]> {
  const grouped: Record<string, BitrixDeal[]> = {}
  for (const stage of PIPELINE_STAGES) {
    grouped[stage.stageId] = []
  }
  for (const deal of deals) {
    const bucket = grouped[deal.STAGE_ID]
    if (bucket) {
      bucket.push(deal)
    }
  }
  return grouped
}

export function PipelineBoard() {
  const { deals, loadDeals, isLoading } = useCrmStore()

  useEffect(() => {
    void loadDeals()
  }, [loadDeals])

  const grouped = groupDealsByStage(deals)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="h-12 px-4 flex items-center border-b border-border bg-popover">
        <h2 className="text-foreground text-sm font-semibold">Pipeline</h2>
        <span className="text-muted-foreground text-xs ml-auto">
          {deals.length} deals
        </span>
      </div>

      <div className="flex-1 flex gap-2 p-3 overflow-x-auto">
        {PIPELINE_STAGES.map((stage) => {
          const stageDeals = grouped[stage.stageId] ?? []
          return (
            <div
              key={stage.stageId}
              className="min-w-[220px] max-w-[260px] flex-shrink-0 flex flex-col bg-popover rounded-lg"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-foreground text-xs font-medium truncate">
                  {stage.label}
                </span>
                <span className="text-muted-foreground text-xs ml-2">
                  {stageDeals.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {stageDeals.map((deal) => (
                  <DealCard key={deal.ID} deal={deal} />
                ))}
                {stageDeals.length === 0 && (
                  <p className="text-muted-foreground text-xs text-center py-4">
                    No deals
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
