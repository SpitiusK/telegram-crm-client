import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useCrmStore } from '../../stores/crm'
import type { BitrixDeal } from '../../types'

interface PipelineStage {
  id: string
  label: string
  color: string
}

const STAGES: PipelineStage[] = [
  { id: 'NEW', label: 'Новая регистрация', color: 'bg-crm-new' },
  { id: 'PREPARATION', label: 'Связался', color: 'bg-crm-contacted' },
  { id: 'PREPAYMENT_INVOICE', label: 'На тесте', color: 'bg-crm-testing' },
  { id: 'EXECUTING', label: 'Тест закончен', color: 'bg-crm-test-done' },
  { id: 'FINAL_INVOICE', label: 'Согласие на оплату', color: 'bg-crm-agreed' },
  { id: 'WON', label: 'Оплата', color: 'bg-crm-paid' },
]

function PipelineDealCard({
  deal,
  onDragStart,
}: {
  deal: BitrixDeal
  onDragStart: (e: React.DragEvent, deal: BitrixDeal) => void
}) {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      className="cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
    >
      <CardContent className="p-3 space-y-1">
        <p className="text-foreground text-sm font-medium truncate">{deal.TITLE}</p>
        {deal.OPPORTUNITY && Number(deal.OPPORTUNITY) > 0 && (
          <Badge variant="secondary" className="text-xs font-normal text-primary">
            {Number(deal.OPPORTUNITY).toLocaleString('ru-RU')} ₽
          </Badge>
        )}
        <p className="text-muted-foreground text-[11px]">
          {new Date(deal.DATE_CREATE).toLocaleDateString('ru-RU')}
        </p>
      </CardContent>
    </Card>
  )
}

function StageColumn({
  stage,
  deals,
  onDragStart,
  onDrop,
}: {
  stage: PipelineStage
  deals: BitrixDeal[]
  onDragStart: (e: React.DragEvent, deal: BitrixDeal) => void
  onDrop: (stageId: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className={cn(
        'flex-1 min-w-[200px] max-w-[280px] flex flex-col rounded-xl transition-colors',
        isDragOver ? 'bg-primary/10' : 'bg-background'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        onDrop(stage.id)
      }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', stage.color)} />
        <span className="text-foreground text-xs font-medium truncate">{stage.label}</span>
        <Badge variant="secondary" className="text-[11px] ml-auto px-1.5 py-0 h-5">
          {deals.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {deals.map((deal) => (
            <PipelineDealCard key={deal.ID} deal={deal} onDragStart={onDragStart} />
          ))}
          {deals.length === 0 && (
            <p className="text-muted-foreground text-xs text-center py-4">No deals</p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function PipelineView() {
  const { deals, loadDeals, updateDeal, isLoading } = useCrmStore()
  const [draggedDeal, setDraggedDeal] = useState<BitrixDeal | null>(null)

  useEffect(() => {
    void loadDeals()
  }, [loadDeals])

  const handleDragStart = (_e: React.DragEvent, deal: BitrixDeal) => {
    setDraggedDeal(deal)
  }

  const handleDrop = (stageId: string) => {
    if (draggedDeal && draggedDeal.STAGE_ID !== stageId) {
      void updateDeal(draggedDeal.ID, { STAGE_ID: stageId } as Partial<BitrixDeal>)
    }
    setDraggedDeal(null)
  }

  const dealsByStage = (stageId: string): BitrixDeal[] =>
    deals.filter((d) => d.STAGE_ID === stageId)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border bg-popover">
        <h2 className="text-foreground text-sm font-semibold">Pipeline</h2>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{deals.length} deals</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadDeals()}
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage(stage.id)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}
