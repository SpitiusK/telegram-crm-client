import { useEffect } from 'react'
import { useChatsStore } from '../stores/chats'
import { useUIStore } from '../stores/ui'

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Escape: always works, even in inputs
      if (e.key === 'Escape') {
        const ui = useUIStore.getState()
        const chats = useChatsStore.getState()

        if (ui.showSettings) {
          e.preventDefault()
          ui.setShowSettings(false)
          return
        }
        if (ui.showChatSearch) {
          e.preventDefault()
          ui.setShowChatSearch(false)
          return
        }
        if (chats.editingMessage) {
          e.preventDefault()
          chats.setEditingMessage(null)
          return
        }
        if (chats.replyingTo) {
          e.preventDefault()
          chats.setReplyingTo(null)
          return
        }
        // Blur any focused element
        if (document.activeElement instanceof HTMLElement) {
          e.preventDefault()
          document.activeElement.blur()
        }
        return
      }

      // All other shortcuts: skip if user is typing in an input/textarea
      if (isInputFocused()) return

      // Ctrl+K or Ctrl+F: focus sidebar search
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (key === 'k' || key === 'f')) {
        e.preventDefault()
        const input = document.getElementById('sidebar-search')
        if (input) input.focus()
        return
      }

      // Ctrl+Shift+F: toggle in-chat search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'f') {
        e.preventDefault()
        useUIStore.getState().toggleChatSearch()
        return
      }

      // Alt+Up / Alt+Down: navigate between chats
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        const chats = useChatsStore.getState()
        const { dialogs, activeChat } = chats
        if (dialogs.length === 0) return
        const currentIndex = activeChat
          ? dialogs.findIndex((d) => d.id === activeChat.chatId)
          : -1
        let nextIndex: number
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex <= 0 ? dialogs.length - 1 : currentIndex - 1
        } else {
          nextIndex = currentIndex >= dialogs.length - 1 ? 0 : currentIndex + 1
        }
        const nextDialog = dialogs[nextIndex]
        if (nextDialog) {
          void chats.setActiveChat(nextDialog.id)
        }
        return
      }

      // Ctrl+E: toggle emoji picker
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'e') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('toggle-emoji-picker'))
        return
      }

      // Ctrl+Shift+M: toggle mute on current chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'm') {
        e.preventDefault()
        const { activeChat, toggleMute } = useChatsStore.getState()
        if (activeChat) toggleMute(activeChat.chatId)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
