import { useEffect, useRef, useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useChatsStore } from '../../stores/chats'
import { MessageBubble } from './message-bubble'
import { MessageContextMenu } from './message-context-menu'
import { Spinner } from '@/components/ui/spinner'
import type { TelegramMessage } from '../../types'

const BOTTOM_THRESHOLD = 100
const SCROLL_SAVE_DEBOUNCE = 200

interface ContextMenuState {
  message: TelegramMessage
  x: number
  y: number
}

const TOP_THRESHOLD = 50

export function MessageList() {
  const { messages, isLoadingMessages, activeChat, scrollPositions, saveScrollPosition, setReplyingTo, setEditingMessage, deleteMessages, loadMoreMessages, hasMoreMessages, isLoadingMoreMessages } =
    useChatsStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevMessagesLenRef = useRef(0)
  const prevChatRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const checkIsAtBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    isAtBottomRef.current = true
    setShowScrollButton(false)
    setNewMessageCount(0)
  }, [])

  // Restore scroll position on chat change, or scroll to bottom if no saved position
  useEffect(() => {
    if (!activeChat || isLoadingMessages) return
    const el = scrollRef.current
    if (!el) return

    const chatChanged = prevChatRef.current !== activeChat.chatId
    prevChatRef.current = activeChat.chatId

    if (chatChanged) {
      const savedPosition = scrollPositions[activeChat.chatId]
      if (savedPosition !== undefined) {
        // Use requestAnimationFrame to ensure DOM has rendered messages
        requestAnimationFrame(() => {
          el.scrollTop = savedPosition
          isAtBottomRef.current = checkIsAtBottom()
          setShowScrollButton(!isAtBottomRef.current)
          setNewMessageCount(0)
        })
      } else {
        requestAnimationFrame(() => {
          scrollToBottom('instant')
        })
      }
      prevMessagesLenRef.current = messages.length
    }
  }, [activeChat, isLoadingMessages, scrollPositions, checkIsAtBottom, scrollToBottom, messages.length])

  // Auto-scroll on new messages only if at bottom or user sent the message
  useEffect(() => {
    if (!activeChat || isLoadingMessages) return
    if (prevChatRef.current !== activeChat.chatId) return // Skip during chat change

    const prevLen = prevMessagesLenRef.current
    const newLen = messages.length
    prevMessagesLenRef.current = newLen

    if (newLen <= prevLen) return // No new messages

    const newMessages = messages.slice(prevLen)
    const userSentMessage = newMessages.some((msg) => msg.out)

    if (isAtBottomRef.current || userSentMessage) {
      requestAnimationFrame(() => scrollToBottom('smooth'))
    } else {
      // User scrolled away — count new messages but don't scroll
      setNewMessageCount((count) => count + newMessages.length)
    }
  }, [messages, activeChat, isLoadingMessages, scrollToBottom])

  // Maintain scroll position after prepending older messages
  const prevScrollHeightRef = useRef(0)
  const wasPrependingRef = useRef(false)

  useEffect(() => {
    if (wasPrependingRef.current) {
      const el = scrollRef.current
      if (el) {
        const newScrollHeight = el.scrollHeight
        el.scrollTop = newScrollHeight - prevScrollHeightRef.current
      }
      wasPrependingRef.current = false
    }
  }, [messages])

  // Save scroll position on scroll (debounced) + detect scroll to top
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !activeChat) return

    const atBottom = checkIsAtBottom()
    isAtBottomRef.current = atBottom
    setShowScrollButton(!atBottom)

    if (atBottom) {
      setNewMessageCount(0)
    }

    // Detect scroll to top for pagination
    if (el.scrollTop < TOP_THRESHOLD && hasMoreMessages && !isLoadingMoreMessages) {
      prevScrollHeightRef.current = el.scrollHeight
      wasPrependingRef.current = true
      void loadMoreMessages()
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      saveScrollPosition(activeChat.chatId, el.scrollTop)
    }, SCROLL_SAVE_DEBOUNCE)
  }, [activeChat, checkIsAtBottom, saveScrollPosition, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, message: TelegramMessage) => {
    setContextMenu({ message, x: e.clientX, y: e.clientY })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleReply = useCallback((msg: TelegramMessage) => {
    setReplyingTo(msg)
  }, [setReplyingTo])

  const handleEdit = useCallback((msg: TelegramMessage) => {
    setEditingMessage(msg)
  }, [setEditingMessage])

  const handleDelete = useCallback((msg: TelegramMessage) => {
    void deleteMessages([msg.id])
  }, [deleteMessages])

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No messages yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto scrollbar-thin px-4 py-3"
      >
        <div className="max-w-[700px] mx-auto flex flex-col gap-1">
          {isLoadingMoreMessages && (
            <div className="flex justify-center py-2">
              <Spinner />
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onContextMenu={handleContextMenu} />
          ))}
        </div>
      </div>

      {showScrollButton && (
        <Button
          onClick={() => scrollToBottom('smooth')}
          size="icon"
          className="absolute bottom-4 right-4 shadow-lg rounded-full w-10 h-10 z-10"
          aria-label="Scroll to bottom"
        >
          {newMessageCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-1 min-w-[20px] h-5 px-1 text-[11px]"
            >
              {newMessageCount > 99 ? '99+' : newMessageCount}
            </Badge>
          )}
          <ChevronDown className="w-5 h-5" />
        </Button>
      )}

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          x={contextMenu.x}
          y={contextMenu.y}
          onReply={handleReply}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  )
}
