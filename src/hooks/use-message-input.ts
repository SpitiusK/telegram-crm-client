import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatsStore } from '@/stores/chats'
import { useAuthStore } from '@/stores/auth'
import { telegramAPI } from '@/lib/telegram'

export function useMessageInput() {
  const {
    activeChat, sendMessage, sendFile, sendPhoto, replyingTo, editingMessage,
    setReplyingTo, setEditingMessage, saveDraft, getDraft, clearDraft,
  } = useChatsStore()
  const accounts = useAuthStore((s) => s.accounts)
  const activeAccount = activeChat
    ? accounts.find((a) => a.id === activeChat.accountId)
    : undefined

  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [sendingPhoto, setSendingPhoto] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastTypingSent = useRef(0)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevChatRef = useRef<string | null>(null)

  // Load draft when chat changes
  useEffect(() => {
    if (!activeChat) return

    if (prevChatRef.current && prevChatRef.current !== activeChat.chatId) {
      saveDraft(prevChatRef.current, text)
    }

    const draft = getDraft(activeChat.chatId)
    setText(draft)
    prevChatRef.current = activeChat.chatId

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      if (draft) {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
      }
    }
  }, [activeChat]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill input when entering edit mode
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

  // Clear draft timer on unmount
  useEffect(() => {
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
    }
  }, [])

  const handleTextChange = useCallback((value: string) => {
    setText(value)
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      if (activeChat) saveDraft(activeChat.chatId, value)
    }, 500)
    if (activeChat && Date.now() - lastTypingSent.current > 5000) {
      lastTypingSent.current = Date.now()
      void telegramAPI.setTyping(activeChat.chatId, activeChat.accountId).catch(() => {/* ignore */})
    }
  }, [activeChat, saveDraft])

  const handleSend = useCallback(() => {
    if (!activeChat) return
    const trimmed = text.trim()
    if (!trimmed) return
    void sendMessage(trimmed)
    setText('')
    clearDraft(activeChat.chatId)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [activeChat, text, sendMessage, clearDraft])

  const handleCancel = useCallback(() => {
    if (!activeChat) return
    if (editingMessage) {
      setEditingMessage(null)
      setText(getDraft(activeChat.chatId))
    } else {
      setReplyingTo(null)
    }
  }, [activeChat, editingMessage, setEditingMessage, setReplyingTo, getDraft])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && (replyingTo || editingMessage)) {
      e.preventDefault()
      handleCancel()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [replyingTo, editingMessage, handleCancel, handleSend])

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`
    }
  }, [])

  const handleEmojiSelect = useCallback((emoji: string) => {
    const el = textareaRef.current
    if (el) {
      const start = el.selectionStart
      const end = el.selectionEnd
      const newText = text.slice(0, start) + emoji + text.slice(end)
      setText(newText)
      handleTextChange(newText)
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
  }, [text, handleTextChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
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
  }, [sendPhoto])

  const handlePhotoAttach = useCallback(async () => {
    setShowAttachMenu(false)
    const filePath = await telegramAPI.pickFile({ mediaOnly: true })
    if (!filePath) return
    setSendingPhoto(true)
    try {
      await sendFile(filePath)
    } finally {
      setSendingPhoto(false)
    }
  }, [sendFile])

  const handleDocAttach = useCallback(async () => {
    setShowAttachMenu(false)
    const filePath = await telegramAPI.pickFile()
    if (!filePath) return
    setSendingPhoto(true)
    try {
      await sendFile(filePath)
    } finally {
      setSendingPhoto(false)
    }
  }, [sendFile])

  return {
    // state
    activeChat,
    accounts,
    activeAccount,
    text,
    showEmoji,
    showAttachMenu,
    sendingPhoto,
    replyingTo,
    editingMessage,
    isEditing: editingMessage !== null,
    // refs
    textareaRef,
    // setters
    setShowEmoji,
    setShowAttachMenu,
    // handlers
    handleTextChange,
    handleSend,
    handleCancel,
    handleKeyDown,
    handleInput,
    handleEmojiSelect,
    handlePaste,
    handlePhotoAttach,
    handleDocAttach,
  }
}
