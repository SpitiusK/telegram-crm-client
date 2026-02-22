import { useState, useRef, useCallback, memo, type ReactNode } from 'react'
import type { TelegramMessage, MessageEntity, LinkPreview } from '../../types'
import { ImageLightbox } from './image-lightbox'
import { LazyMedia } from './lazy-media'

interface MessageBubbleProps {
  message: TelegramMessage
  onContextMenu?: (e: React.MouseEvent, message: TelegramMessage) => void
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VoicePlayer({ waveform, duration, isOut }: { waveform?: number[]; duration?: number; isOut: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const togglePlay = useCallback(() => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setPlaying(false)
    } else {
      setPlaying(true)
      setProgress(0)
      const totalMs = (duration ?? 1) * 1000
      const step = 50
      let elapsed = 0
      intervalRef.current = setInterval(() => {
        elapsed += step
        setProgress(Math.min(elapsed / totalMs, 1))
        if (elapsed >= totalMs) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
          setPlaying(false)
          setProgress(0)
        }
      }, step)
    }
  }, [playing, duration])

  const bars = waveform && waveform.length > 0 ? waveform : null
  const totalBars = bars ? bars.length : 40

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isOut ? 'bg-white/20 hover:bg-white/30' : 'bg-telegram-accent/20 hover:bg-telegram-accent/30'
        }`}
      >
        {playing ? (
          <svg width="12" height="14" viewBox="0 0 12 14" className={isOut ? 'text-white' : 'text-telegram-accent'}>
            <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            <rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="12" height="14" viewBox="0 0 12 14" className={`ml-0.5 ${isOut ? 'text-white' : 'text-telegram-accent'}`}>
            <path d="M1 1.5v11l10-5.5z" fill="currentColor" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-px h-5">
          {bars ? (
            bars.map((v, i) => {
              const filled = i / totalBars < progress
              return (
                <div
                  key={i}
                  className={`w-[2px] rounded-full transition-colors ${
                    filled
                      ? isOut ? 'bg-white' : 'bg-telegram-accent'
                      : isOut ? 'bg-white/30' : 'bg-telegram-accent/30'
                  }`}
                  style={{ height: `${Math.max((v / 31) * 100, 8)}%` }}
                />
              )
            })
          ) : (
            <div className="w-full h-1 rounded-full relative overflow-hidden">
              <div className={`absolute inset-0 ${isOut ? 'bg-white/30' : 'bg-telegram-accent/30'}`} />
              <div
                className={`absolute inset-y-0 left-0 ${isOut ? 'bg-white' : 'bg-telegram-accent'}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
        <span className={`text-[11px] ${isOut ? 'text-white/60' : 'text-telegram-text-secondary'}`}>
          {formatDuration(duration ?? 0)}
        </span>
      </div>
    </div>
  )
}

function VideoNotePlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (playing) {
      vid.pause()
      setPlaying(false)
    } else {
      vid.play().catch(() => { /* ignore autoplay block */ })
      setPlaying(true)
    }
  }, [playing])

  const handleEnded = useCallback(() => setPlaying(false), [])

  return (
    <div
      className="relative w-[240px] h-[240px] rounded-full overflow-hidden cursor-pointer bg-black"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
        onEnded={handleEnded}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <svg width="40" height="40" viewBox="0 0 40 40" className="text-white">
            <path d="M14 10v20l16-10z" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  )
}

function renderFormattedText(text: string, entities?: MessageEntity[]): ReactNode {
  if (!entities || entities.length === 0) {
    return text
  }

  const sorted = [...entities].sort((a, b) => a.offset - b.offset)
  const parts: ReactNode[] = []
  let cursor = 0

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!
    // Add plain text before this entity
    if (e.offset > cursor) {
      parts.push(text.slice(cursor, e.offset))
    }

    const segment = text.slice(e.offset, e.offset + e.length)

    switch (e.type) {
      case 'bold':
        parts.push(<strong key={i}>{segment}</strong>)
        break
      case 'italic':
        parts.push(<em key={i}>{segment}</em>)
        break
      case 'code':
        parts.push(
          <code key={i} className="bg-black/20 px-1 rounded font-mono text-sm">
            {segment}
          </code>
        )
        break
      case 'pre':
        parts.push(
          <pre key={i} className="bg-black/20 p-2 rounded font-mono text-sm overflow-x-auto my-1">
            {segment}
          </pre>
        )
        break
      case 'underline':
        parts.push(<u key={i}>{segment}</u>)
        break
      case 'strike':
        parts.push(<s key={i}>{segment}</s>)
        break
      case 'spoiler':
        parts.push(
          <span
            key={i}
            className="bg-telegram-text text-telegram-text hover:bg-transparent transition-colors rounded px-0.5 cursor-pointer"
          >
            {segment}
          </span>
        )
        break
      case 'url':
        parts.push(
          <a
            key={i}
            href={segment}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            {segment}
          </a>
        )
        break
      case 'textUrl':
        parts.push(
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            {segment}
          </a>
        )
        break
      case 'mention':
        parts.push(
          <span key={i} className="text-telegram-accent cursor-pointer">
            {segment}
          </span>
        )
        break
      case 'hashtag':
        parts.push(
          <span key={i} className="text-telegram-accent">
            {segment}
          </span>
        )
        break
    }

    cursor = e.offset + e.length
  }

  // Add remaining plain text
  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return parts
}

function LinkPreviewCard({ preview, isOut }: { preview: LinkPreview; isOut: boolean }) {
  const handleClick = () => {
    window.open(preview.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={handleClick}
      className={`mt-1 border-l-2 border-telegram-accent pl-2 py-1 cursor-pointer rounded-r-sm ${
        isOut ? 'bg-white/10 hover:bg-white/15' : 'bg-black/5 hover:bg-black/10'
      }`}
    >
      {preview.siteName && (
        <p className="text-telegram-accent text-[11px] font-medium leading-tight">
          {preview.siteName}
        </p>
      )}
      {preview.title && (
        <p className={`text-sm font-semibold leading-snug ${isOut ? 'text-white' : 'text-telegram-text'}`}>
          {preview.title}
        </p>
      )}
      {preview.description && (
        <p className={`text-xs leading-snug line-clamp-2 mt-0.5 ${isOut ? 'text-white/80' : 'text-telegram-text-secondary'}`}>
          {preview.description}
        </p>
      )}
      {preview.photo && (
        <img
          src={preview.photo}
          alt=""
          loading="lazy"
          className="mt-1 rounded max-w-full max-h-[200px] object-cover"
        />
      )}
    </div>
  )
}

export const MessageBubble = memo(function MessageBubble({ message, onContextMenu }: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
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
            <p className="text-telegram-accent text-xs font-medium mb-0.5 px-1">
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
            <div className="w-[150px] h-[150px] rounded-lg bg-black/10 flex items-center justify-center text-telegram-text-secondary text-xs">
              Sticker
            </div>
          )}
          <p className={`text-[11px] mt-0.5 text-right ${isOut ? 'text-white/60' : 'text-telegram-text-secondary'}`}>
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
            : 'bg-telegram-message text-telegram-text rounded-bl-sm'
        }`}
      >
        {!isOut && message.senderName && (
          <p className="text-telegram-accent text-xs font-medium mb-0.5">
            {message.senderName}
          </p>
        )}

        {message.forwardedFrom && (
          <p className={`text-xs italic mb-1 ${isOut ? 'text-white/70' : 'text-telegram-text-secondary'}`}>
            Forwarded from {message.forwardedFrom}
          </p>
        )}

        {message.replyToMessage && (
          <div
            className={`border-l-2 border-telegram-accent pl-2 py-0.5 mb-1 rounded-r-sm ${
              isOut ? 'bg-white/10' : 'bg-black/5'
            }`}
          >
            <p className="text-telegram-accent text-xs font-medium leading-tight">
              {message.replyToMessage.senderName}
            </p>
            <p className={`text-xs truncate leading-tight ${isOut ? 'text-white/70' : 'text-telegram-text-secondary'}`}>
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
          <div className="mt-1">
            {message.media.type === 'photo' && message.media.url && (
              <>
                <LazyMedia width={300} height={200}>
                  <img
                    src={message.media.url}
                    alt=""
                    loading="lazy"
                    className="rounded-lg max-w-[300px] cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                  />
                </LazyMedia>
                {lightboxOpen && (
                  <ImageLightbox
                    src={message.media.url}
                    onClose={() => setLightboxOpen(false)}
                  />
                )}
              </>
            )}

            {message.media.type === 'sticker' && message.media.url && (
              <LazyMedia width={200} height={200}>
                <img
                  src={message.media.url}
                  alt="Sticker"
                  loading="lazy"
                  className="max-w-[200px] max-h-[200px]"
                />
              </LazyMedia>
            )}

            {message.media.type === 'gif' && message.media.url && (
              <LazyMedia width={300} height={200}>
                <div className="relative rounded-lg overflow-hidden max-w-[300px]">
                  <video
                    src={message.media.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="rounded-lg max-w-[300px]"
                  />
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    GIF
                  </span>
                </div>
              </LazyMedia>
            )}

            {message.media.type === 'voice' && (
              <VoicePlayer
                waveform={message.media.waveform}
                duration={message.media.duration}
                isOut={isOut}
              />
            )}

            {message.media.type === 'videoNote' && message.media.url && (
              <LazyMedia width={240} height={240} className="rounded-full">
                <VideoNotePlayer url={message.media.url} />
              </LazyMedia>
            )}
            {message.media.type === 'videoNote' && !message.media.url && (
              <div className="w-[240px] h-[240px] rounded-full bg-black/20 flex items-center justify-center">
                <div className="text-center">
                  <svg width="40" height="40" viewBox="0 0 40 40" className={isOut ? 'text-white/40' : 'text-telegram-text-secondary'}>
                    <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M16 12v16l12-8z" fill="currentColor" />
                  </svg>
                  {message.media.duration !== undefined && (
                    <span className={`text-xs ${isOut ? 'text-white/60' : 'text-telegram-text-secondary'}`}>
                      {formatDuration(message.media.duration)}
                    </span>
                  )}
                </div>
              </div>
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
          {message.isEdited && (
            <span className="mr-1">edited</span>
          )}
          {formatTime(message.date)}
        </p>
      </div>
    </div>
  )
}
)
