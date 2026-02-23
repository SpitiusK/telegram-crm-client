import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const RECENT_KEY = 'emoji-picker-recent'
const MAX_RECENT = 20

interface EmojiCategory {
  icon: string
  label: string
  emojis: string[]
}

const categories: EmojiCategory[] = [
  {
    icon: '😀',
    label: 'Smileys',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢',
      '🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏',
      '😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷',
      '🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','🥸','😎',
      '🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳',
      '🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱',
      '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠',
      '🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻',
      '👽','👾','🤖','🎃',
    ],
  },
  {
    icon: '👋',
    label: 'Gestures',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌',
      '🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉',
      '👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛',
      '🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','💪','🦾',
      '🖤','💅','🫂','🙇','💁','🙅','🙆','🤷','🤦','🙋',
    ],
  },
  {
    icon: '❤️',
    label: 'Hearts',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💝','💘',
      '💟','♥️','🫀','💋','💌','💐','🌹','🥀','💍','💎',
    ],
  },
  {
    icon: '🐱',
    label: 'Animals',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨',
      '🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒',
      '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗',
      '🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪲',
    ],
  },
  {
    icon: '🍎',
    label: 'Food',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈',
      '🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🫛',
      '🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🧄','🧅','🥔',
      '🍞','🥐','🥖','🫓','🥨','🥯','🧇','🍕','🍔','🍟',
      '🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕',
    ],
  },
  {
    icon: '⚽',
    label: 'Objects',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
      '🎮','🕹️','🎲','🧩','🎯','🎳','🎭','🎨','🎬','🎤',
      '🎧','🎼','🎹','🥁','🎷','🎺','🪗','🎸','🎻','🪕',
      '💻','📱','📲','⌚','📷','📹','💡','🔦','🔋','🔌',
      '🚗','🚕','🚙','🚌','🏍️','✈️','🚀','🛸','⛵','🚢',
      '🏠','🏢','🏭','🗼','🗽','⛪','🕌','🌍','🌎','🌏',
      '⭐','🌟','💫','✨','🔥','💧','🌈','☀️','🌙','⚡',
    ],
  },
]

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
        return parsed as string[]
      }
    }
  } catch {
    // ignore
  }
  return []
}

function saveRecent(recent: string[]): void {
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSelect = useCallback((emoji: string) => {
    // Update recent
    setRecent((prev) => {
      const updated = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENT)
      saveRecent(updated)
      return updated
    })
    onSelect(emoji)
  }, [onSelect])

  // Filter emojis by search (match against category label as simple heuristic)
  const filteredEmojis = search
    ? categories
        .filter((c) => c.label.toLowerCase().includes(search.toLowerCase()))
        .flatMap((c) => c.emojis)
    : null

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-[340px] bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b border-border">
        <Input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary h-8 text-sm"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-border">
          {recent.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setActiveTab(-1)}
              className={cn(
                'flex-1 py-1.5 text-center text-lg h-auto rounded-none',
                activeTab === -1 ? 'bg-primary/10 border-b-2 border-primary' : '',
              )}
              aria-label="Recent emojis"
              title="Recent"
            >
              {'\u{1F550}'}
            </Button>
          )}
          {categories.map((cat, i) => (
            <Button
              key={cat.label}
              variant="ghost"
              onClick={() => setActiveTab(i)}
              className={cn(
                'flex-1 py-1.5 text-center text-lg h-auto rounded-none',
                activeTab === i ? 'bg-primary/10 border-b-2 border-primary' : '',
              )}
              title={cat.label}
            >
              {cat.icon}
            </Button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <ScrollArea className="max-h-[260px]">
      <div className="p-2">
        {search ? (
          <div className="grid grid-cols-8 gap-0.5">
            {(filteredEmojis ?? []).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl rounded-md hover:bg-accent transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : activeTab === -1 && recent.length > 0 ? (
          <>
            <p className="text-muted-foreground text-xs px-1 mb-1">Recent</p>
            <div className="grid grid-cols-8 gap-0.5">
              {recent.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-md hover:bg-accent transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-xs px-1 mb-1">
              {categories[activeTab]?.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {categories[activeTab]?.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-md hover:bg-accent transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      </ScrollArea>
    </div>
  )
}
