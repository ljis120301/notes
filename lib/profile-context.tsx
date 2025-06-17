"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Profile } from './pocketbase'
import { getProfiles, createDefaultProfile } from './notes-api'
import { pb } from './pocketbase'

interface ProfileContextType {
  selectedProfile: Profile | null
  setSelectedProfile: (profile: Profile | null) => void
  profiles: Profile[]
  isLoadingProfiles: boolean
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

interface ProfileProviderProps {
  children: React.ReactNode
  isAuthenticated?: boolean
}

export function ProfileProvider({ children, isAuthenticated = false }: ProfileProviderProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const queryClient = useQueryClient()

  // Fetch profiles
  const { 
    data: profiles = [], 
    isLoading: isLoadingProfiles 
  } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isAuthenticated && pb.authStore.isValid,
    staleTime: 2 * 60 * 1000,
  })

  // Auto-create default profile if user has no profiles
  useEffect(() => {
    if (isAuthenticated && pb.authStore.isValid && profiles.length === 0 && !isLoadingProfiles) {
      // User has no profiles, create a default one
      createDefaultProfile().then(() => {
        // Refetch profiles to include the new default
        queryClient.invalidateQueries({ queryKey: ['profiles'] })
      }).catch(error => {
        console.error('Failed to create default profile:', error)
      })
    }
  }, [isAuthenticated, profiles.length, isLoadingProfiles, queryClient])

  // Auto-select first profile (or default) when profiles load
  useEffect(() => {
    if (!selectedProfile && profiles.length > 0) {
      // Try to find default profile first, otherwise use first profile
      const profileToSelect = profiles.find(p => p.is_default) || profiles[0]
      setSelectedProfile(profileToSelect)
    }
  }, [selectedProfile, profiles])

  // Clear selected profile if user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedProfile(null)
    }
  }, [isAuthenticated])

  // Update selected profile if it's no longer in the profiles list (deleted)
  useEffect(() => {
    if (selectedProfile && profiles.length > 0) {
      const profileStillExists = profiles.find(p => p.id === selectedProfile.id)
      if (!profileStillExists) {
        // Profile was deleted, fall back to first available
        const fallbackProfile: Profile | null = profiles[0] || null
        setSelectedProfile(fallbackProfile)
      }
    }
  }, [selectedProfile, profiles])

  const value: ProfileContextType = {
    selectedProfile,
    setSelectedProfile,
    profiles,
    isLoadingProfiles
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
} 