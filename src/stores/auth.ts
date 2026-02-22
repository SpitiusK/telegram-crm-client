import { create } from 'zustand'
import { telegramAPI } from '../lib/telegram'
import type { TelegramUser, TelegramAccount } from '../types'

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
  accounts: TelegramAccount[]
  activeAccountId: string
  isAddingAccount: boolean
  checkAuth: () => Promise<void>
  requestQR: () => Promise<void>
  loginWithPhone: (phone: string) => Promise<void>
  verifyCode: (phone: string, code: string) => Promise<void>
  submit2FA: (password: string) => Promise<void>
  logout: () => Promise<void>
  loadAccounts: () => Promise<void>
  switchAccount: (id: string) => Promise<void>
  startAddAccount: () => Promise<void>
  cancelAddAccount: () => Promise<void>
  removeAccount: (id: string) => Promise<void>
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
  accounts: [],
  activeAccountId: '',
  isAddingAccount: false,

  checkAuth: async () => {
    try {
      const authorized = await telegramAPI.isAuthorized()
      if (authorized) {
        const me = await telegramAPI.getMe()
        const accounts = await telegramAPI.getAccounts()
        set({
          isAuthorized: true,
          isLoading: false,
          step: 'authenticated',
          currentUser: me,
          accounts,
          activeAccountId: me?.id ?? '',
        })
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
            const accounts = await telegramAPI.getAccounts()
            set({
              isAuthorized: true,
              qrUrl: null,
              step: 'authenticated',
              currentUser: me,
              accounts,
              activeAccountId: me?.id ?? '',
              isAddingAccount: false,
            })
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
        const accounts = await telegramAPI.getAccounts()
        set({
          isAuthorized: true,
          step: 'authenticated',
          currentUser: me,
          accounts,
          activeAccountId: me?.id ?? '',
          isAddingAccount: false,
        })
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
        const accounts = await telegramAPI.getAccounts()
        set({
          isAuthorized: true,
          needs2FA: false,
          step: 'authenticated',
          currentUser: me,
          accounts,
          activeAccountId: me?.id ?? '',
          isAddingAccount: false,
        })
      } else {
        set({ error: 'Incorrect password' })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  logout: async () => {
    await telegramAPI.logout()
    const accounts = await telegramAPI.getAccounts()
    if (accounts.length > 0) {
      // Switched to another account after logout
      const me = await telegramAPI.getMe()
      set({
        accounts,
        activeAccountId: me?.id ?? '',
        currentUser: me,
      })
    } else {
      set({
        isAuthorized: false,
        needs2FA: false,
        step: 'idle',
        qrUrl: null,
        phoneCodeHash: null,
        currentUser: null,
        accounts: [],
        activeAccountId: '',
      })
    }
  },

  loadAccounts: async () => {
    const accounts = await telegramAPI.getAccounts()
    set({ accounts })
  },

  switchAccount: async (id: string) => {
    if (id === get().activeAccountId) return
    try {
      await telegramAPI.switchAccount(id)
      const me = await telegramAPI.getMe()
      set({
        activeAccountId: id,
        currentUser: me,
      })
    } catch (err) {
      console.error('[Auth] Failed to switch account:', err)
    }
  },

  startAddAccount: async () => {
    await telegramAPI.addAccount()
    set({
      isAddingAccount: true,
      step: 'idle',
      isAuthorized: false,
      qrUrl: null,
      phoneCodeHash: null,
      error: null,
      needs2FA: false,
    })
  },

  cancelAddAccount: async () => {
    await telegramAPI.cancelAddAccount()
    const me = await telegramAPI.getMe()
    set({
      isAddingAccount: false,
      isAuthorized: true,
      step: 'authenticated',
      currentUser: me,
      qrUrl: null,
      phoneCodeHash: null,
      error: null,
      needs2FA: false,
    })
  },

  removeAccount: async (id: string) => {
    await telegramAPI.removeAccount(id)
    const accounts = await telegramAPI.getAccounts()
    if (accounts.length > 0) {
      const me = await telegramAPI.getMe()
      set({
        accounts,
        activeAccountId: me?.id ?? '',
        currentUser: me,
      })
    } else {
      set({
        isAuthorized: false,
        step: 'idle',
        accounts: [],
        activeAccountId: '',
        currentUser: null,
      })
    }
  },
}))
