import { useState } from 'react'
import { useChatsStore } from '../../stores/chats'
import { useCrmStore } from '../../stores/crm'
import { Spinner } from '@/components/ui/spinner'
import type { AIMessageSuggestion } from '../../types'

export function AiComposer() {
  const { messages, activeChat, sendMessage } = useChatsStore()
  const { currentDeal } = useCrmStore()
  const [suggestions, setSuggestions] = useState<AIMessageSuggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const handleGenerate = async () => {
    if (!activeChat) return
    setIsGenerating(true)
    try {
      const result = await window.electronAPI.claude.generateMessage(
        'CRM operator composing a reply to a client',
        messages,
        currentDeal ?? undefined
      )
      setSuggestions(result)
    } catch (err) {
      console.error('AI generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUse = (text: string) => {
    void sendMessage(text)
    setSuggestions([])
    setEditingIndex(null)
  }

  const handleEdit = (index: number, text: string) => {
    setEditingIndex(index)
    setEditText(text)
  }

  const toneEmoji: Record<string, string> = {
    professional: '👔',
    friendly: '😊',
    urgent: '⚡',
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-foreground text-sm font-medium">AI Composer</h4>
        <button
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !activeChat}
          className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : '✨ Generate'}
        </button>
      </div>

      {suggestions.length === 0 && !isGenerating && (
        <p className="text-muted-foreground text-xs text-center py-4">
          Click Generate to get AI message suggestions based on chat context and deal stage
        </p>
      )}

      {isGenerating && (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      )}

      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="bg-background rounded-lg p-3 border border-border"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{toneEmoji[s.tone] ?? '💬'}</span>
              <span className="text-muted-foreground text-[11px] capitalize">{s.tone}</span>
              <span className="text-muted-foreground text-[11px] ml-auto">
                {Math.round(s.confidence * 100)}%
              </span>
            </div>

            {editingIndex === i ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-muted text-foreground text-xs rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
              />
            ) : (
              <p className="text-foreground text-xs leading-relaxed">{s.text}</p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleUse(editingIndex === i ? editText : s.text)}
                className="flex-1 py-1.5 text-[11px] bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
              >
                Send
              </button>
              <button
                onClick={() => editingIndex === i ? setEditingIndex(null) : handleEdit(i, s.text)}
                className="flex-1 py-1.5 text-[11px] bg-border/50 text-muted-foreground rounded hover:bg-border transition-colors"
              >
                {editingIndex === i ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
