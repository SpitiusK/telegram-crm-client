import { useState, useEffect } from 'react'
import { X, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import type { UserProfile } from '../../types'

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

  const initials = profile?.firstName
    ? (profile.firstName[0] ?? '').toUpperCase()
    : '?'

  return (
    <div className="w-[320px] min-w-[320px] bg-popover border-l border-border flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <h3 className="text-foreground text-sm font-semibold">Profile</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close profile"
          className="text-muted-foreground hover:text-foreground rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : profile ? (
        <ScrollArea className="flex-1">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center py-6 px-4">
            <Avatar className="w-[120px] h-[120px] mb-4">
              {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.firstName} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-foreground text-lg font-semibold">
              {profile.firstName} {profile.lastName}
            </h2>
            {profile.lastSeen && profile.lastSeen !== 'unknown' && (
              <p className="text-muted-foreground text-xs mt-1">
                {profile.lastSeen === 'online' ? <><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 align-middle" />online</>

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
                <p className="text-foreground text-sm flex items-center gap-1"><Bot className="w-4 h-4" /> Bot</p>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">Profile not available</p>
        </div>
      )}
    </div>
  )
}
