import { X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TelegramMessage } from '@/types'

interface InputReplyPreviewProps {
  replyingTo: TelegramMessage | null
  editingMessage: TelegramMessage | null
  onCancel: () => void
}

export function InputReplyPreview({ replyingTo, editingMessage, onCancel }: InputReplyPreviewProps) {
  const isEditing = editingMessage !== null

  if (!replyingTo && !editingMessage) return null

  const cancelButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onCancel}
      aria-label={isEditing ? 'Cancel edit' : 'Cancel reply'}
      className="shrink-0 w-6 h-6 rounded-full hover:bg-primary/10 text-muted-foreground"
    >
      <X className="w-3.5 h-3.5" />
    </Button>
  )

  if (isEditing && editingMessage) {
    return (
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Pencil className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium leading-tight">
              Editing
            </p>
            <p className="text-muted-foreground text-xs truncate leading-tight">
              {editingMessage.text}
            </p>
          </div>
        </div>
        {cancelButton}
      </div>
    )
  }

  if (!replyingTo) return null

  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="w-0.5 h-8 bg-primary rounded-full shrink-0" />
        <div className="min-w-0">
          <p className="text-primary text-xs font-medium leading-tight">
            {replyingTo.senderName}
          </p>
          <p className="text-muted-foreground text-xs truncate leading-tight">
            {replyingTo.text || 'Media'}
          </p>
        </div>
      </div>
      {cancelButton}
    </div>
  )
}
