import { useState } from 'react'
import type { MessageMedia } from '@/types'
import { ImageLightbox } from '@/components/chat/image-lightbox'
import { LazyMedia } from '@/components/chat/lazy-media'
import { VoicePlayer } from '@/components/chat/voice-player'
import { VideoNotePlayer } from '@/components/chat/video-note-player'

interface MessageMediaProps {
  media: MessageMedia
  isOut: boolean
}

export function MessageMediaRenderer({ media, isOut }: MessageMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="mt-1">
      {media.type === 'photo' && media.url && (
        <>
          <LazyMedia width={300} height={200}>
            <img
              src={media.url}
              alt=""
              loading="lazy"
              className="rounded-lg max-w-[300px] cursor-pointer"
              onClick={() => setLightboxOpen(true)}
            />
          </LazyMedia>
          {lightboxOpen && (
            <ImageLightbox src={media.url} onClose={() => setLightboxOpen(false)} />
          )}
        </>
      )}

      {media.type === 'sticker' && media.url && (
        <LazyMedia width={200} height={200}>
          <img
            src={media.url}
            alt="Sticker"
            loading="lazy"
            className="max-w-[200px] max-h-[200px]"
          />
        </LazyMedia>
      )}

      {media.type === 'gif' && media.url && (
        <LazyMedia width={300} height={200}>
          <div className="relative rounded-lg overflow-hidden max-w-[300px]">
            <video
              src={media.url}
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

      {media.type === 'voice' && (
        <VoicePlayer waveform={media.waveform} duration={media.duration} isOut={isOut} />
      )}

      {media.type === 'videoNote' && media.url && (
        <LazyMedia width={240} height={240} className="rounded-full">
          <VideoNotePlayer url={media.url} />
        </LazyMedia>
      )}
      {media.type === 'videoNote' && !media.url && (
        <div className="w-[240px] h-[240px] rounded-full bg-black/20 flex items-center justify-center">
          <div className="text-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              className={isOut ? 'text-white/40' : 'text-muted-foreground'}
            >
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M16 12v16l12-8z" fill="currentColor" />
            </svg>
            {media.duration !== undefined && (
              <span className={`text-xs ${isOut ? 'text-white/60' : 'text-muted-foreground'}`}>
                {media.duration}s
              </span>
            )}
          </div>
        </div>
      )}

      {media.type === 'document' && (
        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
          <span className="text-2xl">📄</span>
          <div>
            <p className="text-sm truncate">{media.fileName ?? 'Document'}</p>
            {media.size !== undefined && (
              <p className="text-xs text-muted-foreground">
                {(media.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
