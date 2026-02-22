import { useState, useEffect, useRef, useCallback } from 'react'

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
      className="absolute bottom-full left-0 mb-2 w-[340px] bg-telegram-sidebar border border-telegram-border rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b border-telegram-border">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full bg-telegram-input text-telegram-text text-sm rounded-lg px-3 py-1.5 border-none focus:outline-none focus:ring-1 focus:ring-telegram-accent placeholder:text-telegram-text-secondary"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-telegram-border">
          {recent.length > 0 && (
            <button
              onClick={() => setActiveTab(-1)}
              className={`flex-1 py-1.5 text-center text-lg hover:bg-telegram-hover transition-colors ${
                activeTab === -1 ? 'bg-telegram-accent/10 border-b-2 border-telegram-accent' : ''
              }`}
              title="Recent"
            >
              🕐
            </button>
          )}
          {categories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-1.5 text-center text-lg hover:bg-telegram-hover transition-colors ${
                activeTab === i ? 'bg-telegram-accent/10 border-b-2 border-telegram-accent' : ''
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="max-h-[260px] overflow-y-auto p-2">
        {search ? (
          <div className="grid grid-cols-8 gap-0.5">
            {(filteredEmojis ?? []).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl rounded-md hover:bg-telegram-hover transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : activeTab === -1 && recent.length > 0 ? (
          <>
            <p className="text-telegram-text-secondary text-xs px-1 mb-1">Recent</p>
            <div className="grid grid-cols-8 gap-0.5">
              {recent.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-md hover:bg-telegram-hover transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-telegram-text-secondary text-xs px-1 mb-1">
              {categories[activeTab]?.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {categories[activeTab]?.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-md hover:bg-telegram-hover transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
