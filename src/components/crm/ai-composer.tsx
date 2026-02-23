import { useState } from 'react'
import { Send, Pencil, X, Sparkles, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useChatsStore } from '../../stores/chats'
import { useCrmStore } from '../../stores/crm'
import type { AIMessageSuggestion } from '../../types'

const toneEmoji: Record<string, string> = {
  professional: '\u{1F454}',
  friendly: '\u{1F60A}',
  urgent: '\u{26A1}',
}

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

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground text-sm font-semibold">AI Composer</h4>
        <Button
          size="sm"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !activeChat}
          className="text-xs h-7 px-3"
        >
          {isGenerating ? 'Generating...' : <><Sparkles className="w-4 h-4 mr-1" />Generate</>}
        </Button>
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
          <Card key={i}>
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-1.5 text-xs font-normal">
                <span>{toneEmoji[s.tone] ?? <MessageCircle className="w-4 h-4" />}</span>
                <Badge variant="secondary" className="capitalize text-[10px] font-normal">
                  {s.tone}
                </Badge>
                <span className="text-muted-foreground text-[11px] ml-auto">
                  {Math.round(s.confidence * 100)}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {editingIndex === i ? (
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-xs resize-none min-h-[60px]"
                  rows={3}
                />
              ) : (
                <p className="text-foreground text-xs leading-relaxed">{s.text}</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-[11px] gap-1"
                  onClick={() => handleUse(editingIndex === i ? editText : s.text)}
                >
                  <Send className="h-3 w-3" />
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[11px] gap-1"
                  onClick={() =>
                    editingIndex === i ? setEditingIndex(null) : handleEdit(i, s.text)
                  }
                >
                  {editingIndex === i ? (
                    <>
                      <X className="h-3 w-3" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3 w-3" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
