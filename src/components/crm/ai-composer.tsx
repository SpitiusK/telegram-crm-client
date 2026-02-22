import { useState } from 'react'
import { useChatsStore } from '../../stores/chats'
import { useCrmStore } from '../../stores/crm'
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
        <h4 className="text-telegram-text text-sm font-medium">AI Composer</h4>
        <button
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !activeChat}
          className="px-3 py-1.5 bg-telegram-accent text-white text-xs rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : '✨ Generate'}
        </button>
      </div>

      {suggestions.length === 0 && !isGenerating && (
        <p className="text-telegram-text-secondary text-xs text-center py-4">
          Click Generate to get AI message suggestions based on chat context and deal stage
        </p>
      )}

      {isGenerating && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="bg-telegram-bg rounded-lg p-3 border border-telegram-border"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{toneEmoji[s.tone] ?? '💬'}</span>
              <span className="text-telegram-text-secondary text-[11px] capitalize">{s.tone}</span>
              <span className="text-telegram-text-secondary text-[11px] ml-auto">
                {Math.round(s.confidence * 100)}%
              </span>
            </div>

            {editingIndex === i ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-telegram-input text-telegram-text text-xs rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-telegram-accent"
                rows={3}
              />
            ) : (
              <p className="text-telegram-text text-xs leading-relaxed">{s.text}</p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleUse(editingIndex === i ? editText : s.text)}
                className="flex-1 py-1.5 text-[11px] bg-telegram-accent/10 text-telegram-accent rounded hover:bg-telegram-accent/20 transition-colors"
              >
                Send
              </button>
              <button
                onClick={() => editingIndex === i ? setEditingIndex(null) : handleEdit(i, s.text)}
                className="flex-1 py-1.5 text-[11px] bg-telegram-border/50 text-telegram-text-secondary rounded hover:bg-telegram-border transition-colors"
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
