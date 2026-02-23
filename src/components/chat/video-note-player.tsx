import { useState, useRef, useCallback } from 'react'
import { Play } from 'lucide-react'

interface VideoNotePlayerProps {
  url: string
}

export function VideoNotePlayer({ url }: VideoNotePlayerProps) {
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
          <Play className="w-10 h-10 text-white" />
        </div>
      )}
    </div>
  )
}
