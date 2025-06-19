"use client"

import React, { useCallback, useState, useRef } from 'react'
import { Upload, X, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getAvatarUrl } from '@/lib/notes-api'
import { validateFile as validateFileUtil, createImagePreview, AVATAR_VALIDATION_OPTIONS } from '@/lib/file-utils'
import type { UserProfile } from '@/lib/notes-api'

interface AvatarUploadProps {
  userProfile: UserProfile | null | undefined
  onUpload: (file: File) => void
  onRemove: () => void
  isUploading?: boolean
  isRemoving?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarUpload({
  userProfile,
  onUpload,
  onRemove,
  isUploading = false,
  isRemoving = false,
  className,
  size = 'lg'
}: AvatarUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  }

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  // Get user initials for fallback
  const getUserInitials = useCallback((profile: UserProfile | null): string => {
    if (!profile) return 'U'
    
    if (profile.name) {
      return profile.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
    }
    
    if (profile.email) {
      return profile.email.charAt(0).toUpperCase()
    }
    
    return 'U'
  }, [])

  // Validate file using utility function
  const validateFileWrapper = useCallback((file: File): string | null => {
    const result = validateFileUtil(file, AVATAR_VALIDATION_OPTIONS)
    return result.isValid ? null : result.error || 'Invalid file'
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    const error = validateFileWrapper(file)
    if (error) {
      toast.error(error)
      return
    }

    try {
      // Create preview using utility function
      const previewUrl = await createImagePreview(file)
      setPreview(previewUrl)
      
      // Upload file
      onUpload(file)
    } catch (error) {
      console.error('Failed to create preview:', error)
      toast.error('Failed to process image')
    }
  }, [validateFileWrapper, onUpload])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Handle click to select file
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Handle remove avatar
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(null)
    onRemove()
  }, [onRemove])

  // Get current avatar URL
  const avatarUrl = getAvatarUrl(userProfile || null)
  const displayImage = preview || avatarUrl
  const hasAvatar = Boolean(displayImage)

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Avatar Display */}
      <div
        className={cn(
          "relative group cursor-pointer transition-all duration-200",
          sizeClasses[size],
          isDragOver && "scale-105",
          (isUploading || isRemoving) && "opacity-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <Avatar className={cn("w-full h-full border-2 border-dashed border-muted-foreground/30 transition-colors", 
          isDragOver && "border-primary",
          hasAvatar && "border-solid border-border"
        )}>
          <AvatarImage 
            src={displayImage || undefined} 
            alt={userProfile?.name || 'User avatar'}
            className="object-cover"
          />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {isUploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            ) : (
              getUserInitials(userProfile || null)
            )}
          </AvatarFallback>
        </Avatar>

        {/* Overlay for hover state */}
        <div className={cn(
          "absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          hasAvatar ? "group-hover:opacity-100" : "opacity-100"
        )}>
          <Upload className={cn("text-white", iconSizeClasses[size])} />
        </div>

        {/* Remove button */}
        {hasAvatar && !isUploading && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Upload Instructions */}
      <div className="text-center text-sm text-muted-foreground max-w-xs">
        {isDragOver ? (
          <p className="text-primary font-medium">Drop image here</p>
        ) : (
          <div className="space-y-1">
            <p>Click or drag image to upload</p>
            <p className="text-xs">JPEG, PNG, WebP up to 5MB</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          disabled={isUploading || isRemoving}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Choose File'}
        </Button>
        
        {hasAvatar && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRemove}
            disabled={isUploading || isRemoving}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}