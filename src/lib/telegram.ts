import type { TelegramDialog, TelegramMessage, TelegramUser, TelegramAccount, UserProfile, VerifyCodeResult, SendMessageResult, ForumTopic, SearchResult, DialogFilter } from '../types'

const api = () => window.electronAPI.telegram

export const telegramAPI = {
  // Auth methods (no accountId)
  connect: () => api().connect(),
  getQRUrl: () => api().getQRUrl(),
  loginWithPhone: (phone: string) => api().loginWithPhone(phone),
  verifyCode: (phone: string, code: string, hash: string): Promise<VerifyCodeResult> => api().verifyCode(phone, code, hash),
  submit2FA: (password: string) => api().submit2FA(password),
  checkPassword: (password: string) => api().checkPassword(password),
  isAuthorized: () => api().isAuthorized(),
  // Data methods (optional accountId as last param)
  getMe: (accountId?: string): Promise<TelegramUser | null> => api().getMe(accountId),
  getDialogs: (limit?: number, accountId?: string): Promise<TelegramDialog[]> => api().getDialogs(limit, accountId),
  getMessages: (chatId: string, limit?: number, offsetId?: number, accountId?: string): Promise<TelegramMessage[]> => api().getMessages(chatId, limit, offsetId, accountId),
  sendMessage: (chatId: string, text: string, replyTo?: number, accountId?: string): Promise<SendMessageResult> => api().sendMessage(chatId, text, replyTo, accountId),
  pickFile: (options?: { mediaOnly?: boolean }): Promise<string | null> => api().pickFile(options),
  sendFile: (chatId: string, filePath: string, caption?: string, replyTo?: number, accountId?: string): Promise<SendMessageResult> => api().sendFile(chatId, filePath, caption, replyTo, accountId),
  sendPhoto: (chatId: string, base64Data: string, caption?: string, replyTo?: number, accountId?: string): Promise<SendMessageResult> => api().sendPhoto(chatId, base64Data, caption, replyTo, accountId),
  searchMessages: (query: string, chatId?: string, limit?: number, accountId?: string): Promise<SearchResult[]> => api().searchMessages(query, chatId, limit, accountId),
  setTyping: (chatId: string, accountId?: string): Promise<void> => api().setTyping(chatId, accountId),
  editMessage: (chatId: string, messageId: number, text: string, accountId?: string): Promise<void> => api().editMessage(chatId, messageId, text, accountId),
  deleteMessages: (chatId: string, messageIds: number[], revoke?: boolean, accountId?: string): Promise<void> => api().deleteMessages(chatId, messageIds, revoke, accountId),
  getUserInfo: (userId: string, accountId?: string): Promise<UserProfile | null> => api().getUserInfo(userId, accountId),
  markRead: (chatId: string, accountId?: string) => api().markRead(chatId, accountId),
  getForumTopics: (chatId: string, accountId?: string): Promise<ForumTopic[]> => api().getForumTopics(chatId, accountId),
  getTopicMessages: (chatId: string, topicId: number, limit?: number, accountId?: string): Promise<TelegramMessage[]> => api().getTopicMessages(chatId, topicId, limit, accountId),
  sendTopicMessage: (chatId: string, topicId: number, text: string, accountId?: string): Promise<SendMessageResult> => api().sendTopicMessage(chatId, topicId, text, accountId),
  getDialogFilters: (accountId?: string): Promise<DialogFilter[]> => api().getDialogFilters(accountId),
  getArchivedDialogs: (limit?: number, accountId?: string): Promise<TelegramDialog[]> => api().getArchivedDialogs(limit, accountId),
  // Settings / account management (no accountId)
  setNotificationSettings: (settings: { mutedChats: string[] }): Promise<void> => api().setNotificationSettings(settings),
  logout: () => api().logout(),
  getAccounts: (): Promise<TelegramAccount[]> => api().getAccounts(),
  switchAccount: (accountId: string): Promise<boolean> => api().switchAccount(accountId),
  addAccount: (): Promise<void> => api().addAccount(),
  removeAccount: (accountId: string): Promise<void> => api().removeAccount(accountId),
  cancelAddAccount: (): Promise<void> => api().cancelAddAccount(),
  // Event listeners
  onNotificationClick: (cb: (chatId: string) => void) => api().onNotificationClick(cb),
  onUpdate: (cb: (event: string, data: unknown) => void) => api().onUpdate(cb),
}
