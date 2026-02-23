import { X, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCrmPanel}
          aria-label="Close CRM panel"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {currentDeal ? (
          <>
            <DealInfo deal={currentDeal} contact={currentContact} />
            <Separator />
            <AiComposer />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] px-4">
            <ClipboardList className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm text-center">
              No deal linked to this contact
            </p>
            <p className="text-muted-foreground text-xs text-center mt-1">
              Select a chat with a known contact to see CRM data
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
