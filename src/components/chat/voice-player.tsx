import { useState, useRef, useCallback } from 'react'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface VoicePlayerProps {
  waveform?: number[]
  duration?: number
  isOut: boolean
}

export function VoicePlayer({ waveform, duration, isOut }: VoicePlayerProps) {
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
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isOut ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/20 hover:bg-primary/30'
        }`}
      >
        {playing ? (
          <svg width="12" height="14" viewBox="0 0 12 14" className={isOut ? 'text-white' : 'text-primary'}>
            <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            <rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="12" height="14" viewBox="0 0 12 14" className={`ml-0.5 ${isOut ? 'text-white' : 'text-primary'}`}>
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
                      ? isOut ? 'bg-white' : 'bg-primary'
                      : isOut ? 'bg-white/30' : 'bg-primary/30'
                  }`}
                  style={{ height: `${Math.max((v / 31) * 100, 8)}%` }}
                />
              )
            })
          ) : (
            <div className="w-full h-1 rounded-full relative overflow-hidden">
              <div className={`absolute inset-0 ${isOut ? 'bg-white/30' : 'bg-primary/30'}`} />
              <div
                className={`absolute inset-y-0 left-0 ${isOut ? 'bg-white' : 'bg-primary'}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
        <span className={`text-[11px] ${isOut ? 'text-white/60' : 'text-muted-foreground'}`}>
          {formatDuration(duration ?? 0)}
        </span>
      </div>
    </div>
  )
}
