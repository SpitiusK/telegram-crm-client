import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatsStore } from '../../stores/chats'
import { EmojiPicker } from './emoji-picker'
import { telegramAPI } from '../../lib/telegram'

export function MessageInput() {
  const {
    activeChat, sendMessage, sendFile, sendPhoto, replyingTo, editingMessage,
    setReplyingTo, setEditingMessage, saveDraft, getDraft, clearDraft,
  } = useChatsStore()
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [sendingPhoto, setSendingPhoto] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const lastTypingSent = useRef(0)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevChatRef = useRef<string | null>(null)

  // Load draft when chat changes
  useEffect(() => {
    if (!activeChat) return

    // Save draft for previous chat
    if (prevChatRef.current && prevChatRef.current !== activeChat) {
      saveDraft(prevChatRef.current, text)
    }

    // Load draft for new chat
    const draft = getDraft(activeChat)
    setText(draft)
    prevChatRef.current = activeChat

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      if (draft) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
      }
    }
  }, [activeChat]) // eslint-disable-line react-hooks/exhaustive-deps

  // When entering edit mode, pre-fill input with message text
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text)
      textareaRef.current?.focus()
    }
  }, [editingMessage])

  // Focus textarea when reply mode activates
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus()
    }
  }, [replyingTo])

  // Toggle emoji picker via global keyboard shortcut
  useEffect(() => {
    const toggle = () => setShowEmoji((prev) => !prev)
    window.addEventListener('toggle-emoji-picker', toggle)
    return () => window.removeEventListener('toggle-emoji-picker', toggle)
  }, [])

  // Close attachment menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return
    const handler = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAttachMenu])

  // Save draft on unmount
  useEffect(() => {
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
    }
  }, [])

  const handleTextChange = useCallback((value: string) => {
    setText(value)

    // Debounced draft save
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      if (activeChat) saveDraft(activeChat, value)
    }, 500)

    // Typing indicator (max once per 5s)
    if (activeChat && Date.now() - lastTypingSent.current > 5000) {
      lastTypingSent.current = Date.now()
      void telegramAPI.setTyping(activeChat).catch(() => {/* ignore */})
    }
  }, [activeChat, saveDraft])

  if (!activeChat) return null

  const isEditing = editingMessage !== null

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    void sendMessage(trimmed)
    setText('')
    clearDraft(activeChat)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleCancel = () => {
    if (isEditing) {
      setEditingMessage(null)
      setText(getDraft(activeChat))
    } else {
      setReplyingTo(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && (replyingTo || editingMessage)) {
      e.preventDefault()
      handleCancel()
      return
    }
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

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current
    if (el) {
      const start = el.selectionStart
      const end = el.selectionEnd
      const newText = text.slice(0, start) + emoji + text.slice(end)
      setText(newText)
      handleTextChange(newText)
      // Restore cursor position after emoji
      requestAnimationFrame(() => {
        el.selectionStart = start + emoji.length
        el.selectionEnd = start + emoji.length
        el.focus()
      })
    } else {
      const newText = text + emoji
      setText(newText)
      handleTextChange(newText)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item && item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        setSendingPhoto(true)
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result
          if (typeof result === 'string') {
            const base64 = result.split(',')[1]
            if (base64) {
              void sendPhoto(base64).finally(() => setSendingPhoto(false))
            } else {
              setSendingPhoto(false)
            }
          } else {
            setSendingPhoto(false)
          }
        }
        reader.onerror = () => setSendingPhoto(false)
        reader.readAsDataURL(file)
        return
      }
    }
  }

  const handlePhotoAttach = async () => {
    setShowAttachMenu(false)
    const filePath = await telegramAPI.pickFile({ mediaOnly: true })
    if (!filePath) return
    setSendingPhoto(true)
    try {
      await sendFile(filePath)
    } finally {
      setSendingPhoto(false)
    }
  }

  const handleDocAttach = async () => {
    setShowAttachMenu(false)
    const filePath = await telegramAPI.pickFile()
    if (!filePath) return
    setSendingPhoto(true)
    try {
      await sendFile(filePath)
    } finally {
      setSendingPhoto(false)
    }
  }

  return (
    <div className="border-t border-telegram-border bg-telegram-sidebar p-3">
      <div className="max-w-[700px] mx-auto">
        {/* Sending photo indicator */}
        {sendingPhoto && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-4 h-4 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-telegram-text-secondary text-xs">Sending photo...</span>
          </div>
        )}

        {/* Reply preview */}
        {replyingTo && !isEditing && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="w-0.5 h-8 bg-telegram-accent rounded-full shrink-0" />
              <div className="min-w-0">
                <p className="text-telegram-accent text-xs font-medium leading-tight">
                  {replyingTo.senderName}
                </p>
                <p className="text-telegram-text-secondary text-xs truncate leading-tight">
                  {replyingTo.text || 'Media'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-telegram-accent/10 text-telegram-text-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Edit preview */}
        {isEditing && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-telegram-accent shrink-0">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <div className="min-w-0">
                <p className="text-telegram-accent text-xs font-medium leading-tight">
                  Editing
                </p>
                <p className="text-telegram-text-secondary text-xs truncate leading-tight">
                  {editingMessage.text}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-telegram-accent/10 text-telegram-text-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Emoji button + picker */}
          <div className="relative">
            <button
              onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false) }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-telegram-hover transition-colors text-telegram-text-secondary"
              title="Emoji"
            >
              <span className="text-xl">😊</span>
            </button>
            {showEmoji && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>

          {/* Attachment button + menu */}
          <div className="relative" ref={attachMenuRef}>
            <button
              onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false) }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-telegram-hover transition-colors text-telegram-text-secondary"
              title="Attach"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-telegram-sidebar border border-telegram-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
                <button
                  onClick={handlePhotoAttach}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-telegram-text hover:bg-telegram-hover transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Photo / Video
                </button>
                <button
                  onClick={handleDocAttach}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-telegram-text hover:bg-telegram-hover transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Document
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder="Write a message..."
            rows={1}
            className="flex-1 bg-telegram-input text-telegram-text text-sm rounded-xl px-4 py-2.5 border-none focus:outline-none focus:ring-1 focus:ring-telegram-accent resize-none placeholder:text-telegram-text-secondary"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-telegram-accent text-white hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isEditing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
