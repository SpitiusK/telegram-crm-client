import { create } from 'zustand'
import { telegramAPI } from '../lib/telegram'
import type { TelegramUser } from '../types'

type AuthStep = 'idle' | 'loading' | 'qr_pending' | 'code_pending' | '2fa_pending' | 'authenticated' | 'error'

interface AuthState {
  step: AuthStep
  isAuthorized: boolean
  isLoading: boolean
  needs2FA: boolean
  qrUrl: string | null
  phoneCodeHash: string | null
  error: string | null
  currentUser: TelegramUser | null
  checkAuth: () => Promise<void>
  requestQR: () => Promise<void>
  loginWithPhone: (phone: string) => Promise<void>
  verifyCode: (phone: string, code: string) => Promise<void>
  submit2FA: (password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  step: 'loading',
  isAuthorized: false,
  isLoading: true,
  needs2FA: false,
  qrUrl: null,
  phoneCodeHash: null,
  error: null,
  currentUser: null,

  checkAuth: async () => {
    try {
      const authorized = await telegramAPI.isAuthorized()
      if (authorized) {
        const me = await telegramAPI.getMe()
        set({ isAuthorized: true, isLoading: false, step: 'authenticated', currentUser: me })
      } else {
        set({ isAuthorized: false, isLoading: false, step: 'idle' })
      }
    } catch {
      set({ isAuthorized: false, isLoading: false, step: 'idle' })
    }
  },

  requestQR: async () => {
    set({ error: null, step: 'qr_pending' })
    try {
      await telegramAPI.connect()

      // Listen for auth events
      telegramAPI.onUpdate((event, data) => {
        if (event === 'qrCode') {
          set({ qrUrl: data as string })
        }
        if (event === 'authorized') {
          void (async () => {
            const me = await telegramAPI.getMe()
            set({ isAuthorized: true, qrUrl: null, step: 'authenticated', currentUser: me })
          })()
        }
        if (event === '2fa_required') {
          set({ step: '2fa_pending', needs2FA: true, qrUrl: null })
        }
        if (event === 'auth_error') {
          const errorData = data as { message?: string }
          set({ error: errorData.message ?? 'Auth failed', step: 'error' })
        }
      })

      const qrUrl = await telegramAPI.getQRUrl()
      set({ qrUrl })
    } catch (err) {
      set({ error: (err as Error).message, step: 'error' })
    }
  },

  loginWithPhone: async (phone: string) => {
    set({ error: null })
    try {
      await telegramAPI.connect()
      const result = await telegramAPI.loginWithPhone(phone)
      set({ phoneCodeHash: result.phoneCodeHash, step: 'code_pending' })
    } catch (err) {
      set({ error: (err as Error).message, step: 'error' })
    }
  },

  verifyCode: async (phone: string, code: string) => {
    const { phoneCodeHash } = get()
    if (!phoneCodeHash) return
    try {
      const result = await telegramAPI.verifyCode(phone, code, phoneCodeHash)
      if (result.success) {
        const me = await telegramAPI.getMe()
        set({ isAuthorized: true, step: 'authenticated', currentUser: me })
      } else if (result.needs2FA) {
        set({ step: '2fa_pending', needs2FA: true })
      } else {
        set({ error: result.error ?? 'Invalid code', step: 'error' })
      }
    } catch (err) {
      set({ error: (err as Error).message, step: 'error' })
    }
  },

  submit2FA: async (password: string) => {
    set({ error: null })
    try {
      const success = await telegramAPI.checkPassword(password)
      if (success) {
        const me = await telegramAPI.getMe()
        set({ isAuthorized: true, needs2FA: false, step: 'authenticated', currentUser: me })
      } else {
        set({ error: 'Incorrect password' })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  logout: async () => {
    await telegramAPI.logout()
    set({
      isAuthorized: false,
      needs2FA: false,
      step: 'idle',
      qrUrl: null,
      phoneCodeHash: null,
      currentUser: null,
    })
  },
}))
