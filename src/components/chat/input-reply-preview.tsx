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
    <button
      onClick={onCancel}
      aria-label={isEditing ? 'Cancel edit' : 'Cancel reply'}
      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10 text-muted-foreground"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )

  if (isEditing && editingMessage) {
    return (
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
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
