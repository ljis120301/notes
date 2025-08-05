import { getProfiles, createProfile } from './notes-api'
import { pb } from './pocketbase'

// Default profiles to create for new users
const DEFAULT_PROFILES = [
  {
    name: 'Personal',
    description: 'Personal notes and thoughts',
    color: '#3b82f6', // Blue
    icon: 'home'
  },
  {
    name: 'Work',
    description: 'Work-related notes and projects',
    color: '#10b981', // Green
    icon: 'briefcase'
  },
  {
    name: 'Study',
    description: 'Educational content and learning notes',
    color: '#f59e0b', // Amber
    icon: 'graduation-cap'
  }
]

/**
 * Auto-setup default profiles for new users if they don't have any profiles yet
 * This function is more conservative and only runs for truly new users
 */
export async function autoSetupProfilesIfNeeded(): Promise<void> {
  if (!pb.authStore.isValid || !pb.authStore.model?.id) {
    return // User not authenticated
  }

  try {
    // Check if user already has profiles
    const existingProfiles = await getProfiles()
    
    // Only create default profiles if user has absolutely no profiles
    // This prevents recreating profiles for existing users who might have temporary database issues
    if (existingProfiles.length === 0) {
      console.log('[autoSetupProfilesIfNeeded] No profiles found for new user, creating default profiles...')
      
      // Create default profiles
      for (const profileData of DEFAULT_PROFILES) {
        try {
          await createProfile(
            profileData.name,
            profileData.description,
            profileData.color,
            profileData.icon
          )
          console.log(`[autoSetupProfilesIfNeeded] Created profile: ${profileData.name}`)
        } catch (error) {
          console.error(`[autoSetupProfilesIfNeeded] Failed to create profile ${profileData.name}:`, error)
        }
      }
      
      console.log('[autoSetupProfilesIfNeeded] Default profiles setup completed!')
    } else {
      console.log(`[autoSetupProfilesIfNeeded] User already has ${existingProfiles.length} profile(s), skipping setup`)
    }
  } catch (error) {
    console.warn('[autoSetupProfilesIfNeeded] Failed to check or create profiles:', error)
  }
} 