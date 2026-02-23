import { Send, Check, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmojiPicker } from './emoji-picker'
import { InputReplyPreview } from './input-reply-preview'
import { AttachmentMenu } from './attachment-menu'
import { Spinner } from '@/components/ui/spinner'
import { useMessageInput } from '@/hooks/use-message-input'

export function MessageInput() {
  const {
    activeChat,
    accounts,
    activeAccount,
    text,
    showEmoji,
    showAttachMenu,
    sendingPhoto,
    replyingTo,
    editingMessage,
    isEditing,
    textareaRef,
    setShowEmoji,
    setShowAttachMenu,
    handleTextChange,
    handleSend,
    handleCancel,
    handleKeyDown,
    handleInput,
    handleEmojiSelect,
    handlePaste,
    handlePhotoAttach,
    handleDocAttach,
  } = useMessageInput()

  if (!activeChat) return null

  return (
    <div className="border-t border-border bg-popover p-3">
      <div className="max-w-[700px] mx-auto">
        {/* Account indicator */}
        {accounts.length > 1 && activeAccount && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-muted-foreground text-[11px]">
              Replying as <span className="text-primary font-medium">{activeAccount.firstName}</span>
            </span>
          </div>
        )}

        {/* Sending photo indicator */}
        {sendingPhoto && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <Spinner size="sm" />
            <span className="text-muted-foreground text-xs">Sending photo...</span>
          </div>
        )}

        <InputReplyPreview
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          onCancel={handleCancel}
        />

        <div className="flex items-end gap-2">
          {/* Emoji button + picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false) }}
              aria-label="Emoji picker"
              title="Emoji"
              className="rounded-full w-10 h-10 text-muted-foreground"
            >
              <Smile className="w-5 h-5" />
            </Button>
            {showEmoji && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>

          <AttachmentMenu
            isOpen={showAttachMenu}
            onToggle={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false) }}
            onPhotoAttach={handlePhotoAttach}
            onDocAttach={handleDocAttach}
          />

          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder="Write a message..."
            rows={1}
            className="flex-1 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary resize-none rounded-xl px-4 py-2.5 min-h-0"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim()}
            size="icon"
            aria-label={isEditing ? 'Save edit' : 'Send message'}
            className="rounded-full w-10 h-10 shrink-0"
          >
            {isEditing ? (
              <Check className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
