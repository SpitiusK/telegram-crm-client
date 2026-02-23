import { useState, useEffect } from 'react'
import type { UserProfile } from '../../types'
import { Spinner } from '@/components/ui/spinner'

interface UserProfilePanelProps {
  userId: string
  onClose: () => void
}

export function UserProfilePanel({ userId, onClose }: UserProfilePanelProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    void window.electronAPI.telegram.getUserInfo(userId).then((info) => {
      setProfile(info)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [userId])

  return (
    <div className="w-[320px] min-w-[320px] bg-popover border-l border-border flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <h3 className="text-foreground text-sm font-semibold">Profile</h3>
        <button
          onClick={onClose}
          aria-label="Close profile"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : profile ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center py-6 px-4">
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-[120px] h-[120px] rounded-full object-cover mb-4" />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full bg-primary flex items-center justify-center text-white text-3xl font-medium mb-4">
                {(profile.firstName[0] ?? '').toUpperCase()}
              </div>
            )}
            <h2 className="text-foreground text-lg font-semibold">
              {profile.firstName} {profile.lastName}
            </h2>
            {profile.lastSeen && profile.lastSeen !== 'unknown' && (
              <p className="text-muted-foreground text-xs mt-1">
                {profile.lastSeen === 'online' ? '🟢 online'
                  : profile.lastSeen === 'recently' ? 'last seen recently'
                  : `last seen ${new Date(profile.lastSeen).toLocaleString('ru-RU')}`}
              </p>
            )}
          </div>

          {/* Info rows */}
          <div className="border-t border-border px-4 py-3 space-y-3">
            {profile.phone && (
              <div>
                <p className="text-primary text-sm">+{profile.phone}</p>
                <p className="text-muted-foreground text-xs">Phone</p>
              </div>
            )}
            {profile.username && (
              <div>
                <p className="text-primary text-sm">@{profile.username}</p>
                <p className="text-muted-foreground text-xs">Username</p>
              </div>
            )}
            {profile.bio && (
              <div>
                <p className="text-foreground text-sm">{profile.bio}</p>
                <p className="text-muted-foreground text-xs">Bio</p>
              </div>
            )}
            {profile.isBot && (
              <div>
                <p className="text-foreground text-sm">🤖 Bot</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">Profile not available</p>
        </div>
      )}
    </div>
  )
}
