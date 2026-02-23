import { useCrmStore } from '../../stores/crm'
import { useUIStore } from '../../stores/ui'
import { DealInfo } from './deal-info'
import { AiComposer } from './ai-composer'

export function CrmPanel() {
  const { currentDeal, currentContact } = useCrmStore()
  const { toggleCrmPanel } = useUIStore()

  return (
    <div className="w-[320px] min-w-[320px] bg-popover border-l border-border flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <h3 className="text-foreground text-sm font-semibold">CRM Panel</h3>
        <button
          onClick={toggleCrmPanel}
          aria-label="Close CRM panel"
          className="text-muted-foreground hover:text-foreground transition-colors"
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
            <div className="border-t border-border">
              <AiComposer />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-muted-foreground text-sm text-center">
              No deal linked to this contact
            </p>
            <p className="text-muted-foreground text-xs text-center mt-1">
              Select a chat with a known contact to see CRM data
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
