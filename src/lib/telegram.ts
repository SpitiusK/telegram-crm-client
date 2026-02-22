import type { TelegramDialog, TelegramMessage, TelegramUser, UserProfile, VerifyCodeResult, SendMessageResult } from '../types'

const api = () => window.electronAPI.telegram

export const telegramAPI = {
  connect: () => api().connect(),
  getQRUrl: () => api().getQRUrl(),
  loginWithPhone: (phone: string) => api().loginWithPhone(phone),
  verifyCode: (phone: string, code: string, hash: string): Promise<VerifyCodeResult> => api().verifyCode(phone, code, hash),
  submit2FA: (password: string) => api().submit2FA(password),
  checkPassword: (password: string) => api().checkPassword(password),
  isAuthorized: () => api().isAuthorized(),
  getMe: (): Promise<TelegramUser | null> => api().getMe(),
  getDialogs: (limit?: number): Promise<TelegramDialog[]> => api().getDialogs(limit),
  getMessages: (chatId: string, limit?: number): Promise<TelegramMessage[]> => api().getMessages(chatId, limit),
  sendMessage: (chatId: string, text: string): Promise<SendMessageResult> => api().sendMessage(chatId, text),
  getUserInfo: (userId: string): Promise<UserProfile | null> => api().getUserInfo(userId),
  markRead: (chatId: string) => api().markRead(chatId),
  logout: () => api().logout(),
  onUpdate: (cb: (event: string, data: unknown) => void) => api().onUpdate(cb),
}
