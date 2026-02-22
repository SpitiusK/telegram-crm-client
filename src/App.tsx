import { useEffect } from 'react'
import { useAuthStore } from './stores/auth'
import { AuthScreen } from './components/auth/auth-screen'
import { MainLayout } from './components/layout/main-layout'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'

export function App() {
  const { isAuthorized, isLoading, checkAuth } = useAuthStore()

  useKeyboardShortcuts()

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-telegram-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-telegram-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-telegram-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return <AuthScreen />
  }

  return <MainLayout />
}
