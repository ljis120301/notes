"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  getUserProfile, 
  updateUserProfile, 
  uploadAvatar, 
  removeAvatar,
  UserProfile 
} from '@/lib/notes-api'
import { useAuth } from '@/lib/auth-context'

/**
 * Hook to get current user profile
 */
export function useUserProfile() {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile data doesn't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry on authentication errors
      if ((error as { status?: number })?.status === 401 || (error as { status?: number })?.status === 403) {
        return false
      }
      return failureCount < 2
    },
  })
}

/**
 * Hook to update user profile (name)
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient()
  const { refreshAuth } = useAuth()
  
  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: async (updatedProfile) => {
      // Update the user profile cache
      queryClient.setQueryData(['user-profile'], updatedProfile)
      
      // Refresh auth context to sync the user state
      await refreshAuth()
      
      toast.success('Profile updated successfully!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      toast.error(errorMessage)
      console.error('Error updating profile:', error)
    },
  })
}

/**
 * Hook to upload user avatar
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { refreshAuth } = useAuth()
  
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: async (updatedProfile) => {
      // Update the user profile cache
      queryClient.setQueryData(['user-profile'], updatedProfile)
      
      // Refresh auth context to sync the user state
      await refreshAuth()
      
      toast.success('Avatar updated successfully!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar'
      toast.error(errorMessage)
      console.error('Error uploading avatar:', error)
    },
  })
}

/**
 * Hook to remove user avatar
 */
export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  const { refreshAuth } = useAuth()
  
  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: async (updatedProfile) => {
      // Update the user profile cache
      queryClient.setQueryData(['user-profile'], updatedProfile)
      
      // Refresh auth context to sync the user state
      await refreshAuth()
      
      toast.success('Avatar removed successfully!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove avatar'
      toast.error(errorMessage)
      console.error('Error removing avatar:', error)
    },
  })
}

/**
 * Combined hook that provides all user profile operations
 */
export function useUserProfileManager() {
  const profile = useUserProfile()
  const updateProfile = useUpdateUserProfile()
  const uploadAvatarMutation = useUploadAvatar()
  const removeAvatarMutation = useRemoveAvatar()
  
  return {
    // Profile data
    profile: profile.data,
    isLoading: profile.isLoading,
    isError: profile.isError,
    error: profile.error,
    
    // Profile operations
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
    
    // Avatar operations
    uploadAvatar: uploadAvatarMutation.mutate,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    
    removeAvatar: removeAvatarMutation.mutate,
    isRemovingAvatar: removeAvatarMutation.isPending,
    
    // Loading states
    isAnyLoading: profile.isLoading || updateProfile.isPending || 
                  uploadAvatarMutation.isPending || removeAvatarMutation.isPending,
  }
}