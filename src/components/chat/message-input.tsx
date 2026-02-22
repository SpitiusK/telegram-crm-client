import { useState, useRef } from 'react'
import { useChatsStore } from '../../stores/chats'

export function MessageInput() {
  const { activeChat, sendMessage } = useChatsStore()
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (!activeChat) return null

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    void sendMessage(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`
    }
  }

  return (
    <div className="border-t border-telegram-border bg-telegram-sidebar p-3">
      <div className="flex items-end gap-2 max-w-[700px] mx-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Write a message..."
          rows={1}
          className="flex-1 bg-telegram-input text-telegram-text text-sm rounded-xl px-4 py-2.5 border-none focus:outline-none focus:ring-1 focus:ring-telegram-accent resize-none placeholder:text-telegram-text-secondary"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-telegram-accent text-white hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
