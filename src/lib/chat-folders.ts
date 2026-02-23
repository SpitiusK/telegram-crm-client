import type { TelegramDialog } from '../types'
import type { ChatFolder } from '../stores/chats'

export type { ChatFolder }

export const BUILTIN_TABS: { key: ChatFolder; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'users', label: 'Users' },
  { key: 'groups', label: 'Groups' },
  { key: 'channels', label: 'Channels' },
  { key: 'forums', label: 'Forums' },
  { key: 'bots', label: 'Bots' },
]

export function matchesFolder(dialog: TelegramDialog, folder: ChatFolder): boolean {
  switch (folder) {
    case 'all':
      return true
    case 'users':
      return dialog.isUser && !dialog.isSavedMessages
    case 'groups':
      return dialog.isGroup
    case 'channels':
      return dialog.isChannel && !dialog.isForum
    case 'forums':
      return !!dialog.isForum
    case 'bots':
      return dialog.isUser && !!dialog.username && dialog.username.toLowerCase().endsWith('bot')
    default:
      return true
  }
}
