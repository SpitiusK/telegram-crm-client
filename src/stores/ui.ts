import { create } from 'zustand'

type View = 'chats' | 'pipeline' | 'activity'

interface UIState {
  sidebarOpen: boolean
  crmPanelOpen: boolean
  theme: 'dark' | 'light'
  authMode: 'qr' | 'phone'
  view: View
  toggleSidebar: () => void
  toggleCrmPanel: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setAuthMode: (mode: 'qr' | 'phone') => void
  setView: (view: View) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  crmPanelOpen: false,
  theme: 'dark',
  authMode: 'qr',
  view: 'chats',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCrmPanel: () => set((s) => ({ crmPanelOpen: !s.crmPanelOpen })),
  setTheme: (theme) => set({ theme }),
  setAuthMode: (authMode) => set({ authMode }),
  setView: (view) => set({ view }),
}))
