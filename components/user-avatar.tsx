"use client"

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { getAvatarUrl } from '@/lib/notes-api'
import type { UserProfile } from '@/lib/notes-api'

interface UserAvatarProps {
  userProfile?: UserProfile | null
  size?: 'sm' | 'md' | 'lg'
  clickable?: boolean
  showFallbackIcon?: boolean
  className?: string
}

export function UserAvatar({
  userProfile,
  size = 'md',
  clickable = true,
  showFallbackIcon = true,
  className
}: UserAvatarProps) {
  const router = useRouter()
  const { user } = useAuth()

  // Use auth user as fallback if no userProfile provided
  const displayUser = userProfile || user

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  // Get user initials for fallback
  const getUserInitials = useCallback((profile: typeof displayUser): string => {
    if (!profile) return 'U'
    
    if (profile.name) {
      return profile.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
    }
    
    if (profile.email) {
      return profile.email.charAt(0).toUpperCase()
    }
    
    return 'U'
  }, [])

  // Handle click to go to account settings
  const handleClick = useCallback(() => {
    if (clickable) {
      router.push('/account-editor')
    }
  }, [clickable, router])

  // Get avatar URL
  const avatarUrl = displayUser ? getAvatarUrl(displayUser as UserProfile) : null

  const AvatarComponent = (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage 
        src={avatarUrl || undefined} 
        alt={displayUser?.name || 'User avatar'}
        className="object-cover"
      />
      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
        {showFallbackIcon && !displayUser ? (
          <User className="h-4 w-4" />
        ) : (
          getUserInitials(displayUser)
        )}
      </AvatarFallback>
    </Avatar>
  )

  if (clickable) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-auto p-1 rounded-full hover:bg-muted/50 cursor-pointer", className)}
        onClick={handleClick}
        title="Account Settings"
      >
        {AvatarComponent}
      </Button>
    )
  }

  return <div className={className}>{AvatarComponent}</div>
}

export default UserAvatar