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
            <button
              onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false) }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Emoji picker"
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

          <AttachmentMenu
            isOpen={showAttachMenu}
            onToggle={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false) }}
            onPhotoAttach={handlePhotoAttach}
            onDocAttach={handleDocAttach}
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder="Write a message..."
            rows={1}
            className="flex-1 bg-muted text-foreground text-sm rounded-xl px-4 py-2.5 border-none focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            aria-label={isEditing ? 'Save edit' : 'Send message'}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
