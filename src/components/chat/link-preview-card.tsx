import type { LinkPreview } from '@/types'

interface LinkPreviewCardProps {
  preview: LinkPreview
  isOut: boolean
}

export function LinkPreviewCard({ preview, isOut }: LinkPreviewCardProps) {
  const handleClick = () => {
    window.open(preview.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={handleClick}
      className={`mt-1 border-l-2 border-primary pl-2 py-1 cursor-pointer rounded-r-sm ${
        isOut ? 'bg-white/10 hover:bg-white/15' : 'bg-black/5 hover:bg-black/10'
      }`}
    >
      {preview.siteName && (
        <p className="text-primary text-[11px] font-medium leading-tight">
          {preview.siteName}
        </p>
      )}
      {preview.title && (
        <p className={`text-sm font-semibold leading-snug ${isOut ? 'text-white' : 'text-foreground'}`}>
          {preview.title}
        </p>
      )}
      {preview.description && (
        <p className={`text-xs leading-snug line-clamp-2 mt-0.5 ${isOut ? 'text-white/80' : 'text-muted-foreground'}`}>
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
