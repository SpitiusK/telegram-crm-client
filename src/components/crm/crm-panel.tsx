import { useCrmStore } from '../../stores/crm'
import { useUIStore } from '../../stores/ui'
import { DealInfo } from './deal-info'
import { AiComposer } from './ai-composer'

export function CrmPanel() {
  const { currentDeal, currentContact } = useCrmStore()
  const { toggleCrmPanel } = useUIStore()

  return (
    <div className="w-[320px] min-w-[320px] bg-telegram-sidebar border-l border-telegram-border flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-telegram-border">
        <h3 className="text-telegram-text text-sm font-semibold">CRM Panel</h3>
        <button
          onClick={toggleCrmPanel}
          className="text-telegram-text-secondary hover:text-telegram-text transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {currentDeal ? (
          <>
            <DealInfo deal={currentDeal} contact={currentContact} />
            <div className="border-t border-telegram-border">
              <AiComposer />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-telegram-text-secondary text-sm text-center">
              No deal linked to this contact
            </p>
            <p className="text-telegram-text-secondary text-xs text-center mt-1">
              Select a chat with a known contact to see CRM data
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
