import { useEffect, useState } from 'react'
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

function DealCard({ deal, onDragStart }: { deal: BitrixDeal; onDragStart: (e: React.DragEvent, deal: BitrixDeal) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      className="bg-telegram-sidebar rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-telegram-hover transition-colors border border-telegram-border"
    >
      <p className="text-telegram-text text-sm font-medium truncate">{deal.TITLE}</p>
      {deal.OPPORTUNITY && Number(deal.OPPORTUNITY) > 0 && (
        <p className="text-telegram-accent text-xs mt-1">
          {Number(deal.OPPORTUNITY).toLocaleString('ru-RU')} ₽
        </p>
      )}
      <p className="text-telegram-text-secondary text-[11px] mt-1">
        {new Date(deal.DATE_CREATE).toLocaleDateString('ru-RU')}
      </p>
    </div>
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
      className={`flex-1 min-w-[200px] max-w-[280px] flex flex-col rounded-xl transition-colors ${
        isDragOver ? 'bg-telegram-accent/10' : 'bg-telegram-bg'
      }`}
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
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-telegram-border">
        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
        <span className="text-telegram-text text-xs font-medium truncate">{stage.label}</span>
        <span className="text-telegram-text-secondary text-[11px] ml-auto">{deals.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
        {deals.map((deal) => (
          <DealCard key={deal.ID} deal={deal} onDragStart={onDragStart} />
        ))}
        {deals.length === 0 && (
          <p className="text-telegram-text-secondary text-xs text-center py-4">No deals</p>
        )}
      </div>
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
      <div className="flex-1 flex items-center justify-center bg-telegram-bg">
        <div className="w-8 h-8 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-telegram-bg overflow-hidden">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-telegram-border bg-telegram-sidebar">
        <h2 className="text-telegram-text text-sm font-semibold">Pipeline</h2>
        <div className="flex items-center gap-2">
          <span className="text-telegram-text-secondary text-xs">{deals.length} deals</span>
          <button
            onClick={() => void loadDeals()}
            className="text-telegram-text-secondary hover:text-telegram-text text-xs px-2 py-1 rounded hover:bg-telegram-hover transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 flex gap-3 p-4 overflow-x-auto scrollbar-thin">
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
