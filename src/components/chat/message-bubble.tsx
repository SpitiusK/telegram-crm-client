import type { TelegramMessage } from '../../types'

interface MessageBubbleProps {
  message: TelegramMessage
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOut = message.out

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[65%] px-3 py-1.5 rounded-xl text-sm ${
          isOut
            ? 'bg-telegram-message-out text-white rounded-br-sm'
            : 'bg-telegram-message text-telegram-text rounded-bl-sm'
        }`}
      >
        {!isOut && message.senderName && (
          <p className="text-telegram-accent text-xs font-medium mb-0.5">
            {message.senderName}
          </p>
        )}

        {message.text && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
        )}

        {message.media && (
          <div className="mt-1">
            {message.media.type === 'photo' && message.media.url && (
              <img src={message.media.url} alt="" className="rounded-lg max-w-full" />
            )}
            {message.media.type === 'document' && (
              <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm truncate">{message.media.fileName ?? 'Document'}</p>
                  {message.media.size !== undefined && (
                    <p className="text-xs text-telegram-text-secondary">
                      {(message.media.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <p className={`text-[11px] mt-0.5 text-right ${isOut ? 'text-white/60' : 'text-telegram-text-secondary'}`}>
          {formatTime(message.date)}
        </p>
      </div>
    </div>
  )
}
