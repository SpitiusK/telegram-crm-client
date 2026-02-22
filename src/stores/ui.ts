import { create } from 'zustand'

type View = 'chats' | 'pipeline' | 'activity'

function getStoredTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem('app-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage unavailable
  }
  return 'dark'
}

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
  try {
    localStorage.setItem('app-theme', theme)
  } catch {
    // localStorage unavailable
  }
}

interface UIState {
  sidebarOpen: boolean
  crmPanelOpen: boolean
  theme: 'dark' | 'light'
  authMode: 'qr' | 'phone'
  view: View
  showSettings: boolean
  showChatSearch: boolean
  toggleSidebar: () => void
  toggleCrmPanel: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setAuthMode: (mode: 'qr' | 'phone') => void
  setView: (view: View) => void
  toggleSettings: () => void
  setShowSettings: (show: boolean) => void
  toggleChatSearch: () => void
  setShowChatSearch: (show: boolean) => void
}

const initialTheme = getStoredTheme()
applyTheme(initialTheme)

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  crmPanelOpen: false,
  theme: initialTheme,
  authMode: 'qr',
  view: 'chats',
  showSettings: false,
  showChatSearch: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCrmPanel: () => set((s) => ({ crmPanelOpen: !s.crmPanelOpen })),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  setAuthMode: (authMode) => set({ authMode }),
  setView: (view) => set({ view }),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  setShowSettings: (showSettings) => set({ showSettings }),
  toggleChatSearch: () => set((s) => ({ showChatSearch: !s.showChatSearch })),
  setShowChatSearch: (showChatSearch) => set({ showChatSearch }),
}))
