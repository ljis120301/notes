"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, User, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/lib/auth-context'
import { useUserProfileManager } from '@/hooks/use-user-profile'
import { AvatarUpload } from '@/components/avatar-upload'
import { ModeToggle } from '@/components/mode-toggle'

export default function AccountEditorPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const {
    profile,
    isLoading,
    updateProfile,
    isUpdating,
    uploadAvatar,
    isUploadingAvatar,
    removeAvatar,
    isRemovingAvatar,
    isAnyLoading
  } = useUserProfileManager()

  // Form state
  const [formData, setFormData] = useState({
    name: ''
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const newFormData = {
        name: profile.name || ''
      }
      setFormData(newFormData)
      setHasChanges(false)
      setErrors({})
    }
  }, [profile])

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Check if changes were made
      const originalData = {
        name: profile?.name || ''
      }
      setHasChanges(JSON.stringify(newData) !== JSON.stringify(originalData))
      
      return newData
    })
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Name validation
    if (formData.name.trim()) {
      const name = formData.name.trim()
      if (name.length > 100) {
        newErrors.name = 'Name must be no more than 100 characters'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }
    
    try {
      const updateData: { name?: string } = {}
      
      // Only include changed fields
      if (formData.name.trim() !== (profile?.name || '')) {
        updateData.name = formData.name.trim() || undefined
      }
      
      if (Object.keys(updateData).length > 0) {
        updateProfile(updateData)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  // Handle back navigation
  const handleBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Account Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign Out
            </Button>
            <ModeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="container max-w-2xl mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Picture</span>
                </CardTitle>
                <CardDescription>
                  Upload a profile picture to personalize your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvatarUpload
                  userProfile={profile}
                  onUpload={uploadAvatar}
                  onRemove={removeAvatar}
                  isUploading={isUploadingAvatar}
                  isRemoving={isRemovingAvatar}
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update your email.
                  </p>
                </div>

                <Separator />

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Display Name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your display name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your display name is shown in the app interface.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!hasChanges || isAnyLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}