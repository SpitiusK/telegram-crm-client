import { memo } from 'react'
import type { TelegramMessage } from '@/types'
import { LazyMedia } from '@/components/chat/lazy-media'
import { renderFormattedText } from '@/components/chat/formatted-text'
import { LinkPreviewCard } from '@/components/chat/link-preview-card'
import { MessageMediaRenderer } from '@/components/chat/message-media'

interface MessageBubbleProps {
  message: TelegramMessage
  onContextMenu?: (e: React.MouseEvent, message: TelegramMessage) => void
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export const MessageBubble = memo(function MessageBubble({ message, onContextMenu }: MessageBubbleProps) {
  const isOut = message.out

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu?.(e, message)
  }

  // Sticker-only messages: no bubble background
  const isStickerOnly = message.media?.type === 'sticker' && !message.text

  if (isStickerOnly) {
    return (
      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[65%]" onContextMenu={handleContextMenu}>
          {!isOut && message.senderName && (
            <p className="text-primary text-xs font-medium mb-0.5 px-1">
              {message.senderName}
            </p>
          )}
          {message.media?.url ? (
            <LazyMedia width={200} height={200}>
              <img
                src={message.media.url}
                alt="Sticker"
                loading="lazy"
                className="max-w-[200px] max-h-[200px]"
              />
            </LazyMedia>
          ) : (
            <div className="w-[150px] h-[150px] rounded-lg bg-black/10 flex items-center justify-center text-muted-foreground text-xs">
              Sticker
            </div>
          )}
          <p className={`text-[11px] mt-0.5 text-right ${isOut ? 'text-white/60' : 'text-muted-foreground'}`}>
            {formatTime(message.date)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        onContextMenu={handleContextMenu}
        className={`max-w-[65%] px-3 py-1.5 rounded-xl text-sm ${
          isOut
            ? 'bg-telegram-message-out text-white rounded-br-sm'
            : 'bg-card text-foreground rounded-bl-sm'
        }`}
      >
        {!isOut && message.senderName && (
          <p className="text-primary text-xs font-medium mb-0.5">
            {message.senderName}
          </p>
        )}

        {message.forwardedFrom && (
          <p className={`text-xs italic mb-1 ${isOut ? 'text-white/70' : 'text-muted-foreground'}`}>
            Forwarded from {message.forwardedFrom}
          </p>
        )}

        {message.replyToMessage && (
          <div
            className={`border-l-2 border-primary pl-2 py-0.5 mb-1 rounded-r-sm ${
              isOut ? 'bg-white/10' : 'bg-black/5'
            }`}
          >
            <p className="text-primary text-xs font-medium leading-tight">
              {message.replyToMessage.senderName}
            </p>
            <p className={`text-xs truncate leading-tight ${isOut ? 'text-white/70' : 'text-muted-foreground'}`}>
              {message.replyToMessage.text}
            </p>
          </div>
        )}

        {message.text && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {renderFormattedText(message.text, message.entities)}
          </p>
        )}

        {message.linkPreview && (
          <LinkPreviewCard preview={message.linkPreview} isOut={isOut} />
        )}

        {message.media && (
          <MessageMediaRenderer media={message.media} isOut={isOut} />
        )}

        <p className={`text-[11px] mt-0.5 text-right ${isOut ? 'text-white/60' : 'text-muted-foreground'}`}>
          {message.isEdited && (
            <span className="mr-1">edited</span>
          )}
          {formatTime(message.date)}
        </p>
      </div>
    </div>
  )
})
