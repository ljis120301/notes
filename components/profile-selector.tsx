"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, Briefcase, GraduationCap, Home, User, Trash2, MoreHorizontal } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Profile } from '@/lib/pocketbase'
import { getProfiles, createProfile, deleteProfile, getNotesByProfile } from '@/lib/notes-api'
import { pb } from '@/lib/pocketbase'

interface ProfileSelectorProps {
  selectedProfile: Profile | null
  onSelectProfile: (profile: Profile | null) => void
  isAuthenticated?: boolean
  className?: string
}

// Predefined icons for profiles
const PROFILE_ICONS = [
  { value: 'briefcase', label: 'Work', icon: Briefcase },
  { value: 'graduation-cap', label: 'School', icon: GraduationCap },
  { value: 'home', label: 'Personal', icon: Home },
  { value: 'user', label: 'Default', icon: User },
]

// Predefined colors for profiles
const PROFILE_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
]

// Helper functions for profile access tracking
const getProfileAccessKey = (userId: string) => `profile_access_${userId}`

const getProfileLastAccessed = (profileId: string, userId: string): number => {
  try {
    const accessData = localStorage.getItem(getProfileAccessKey(userId))
    if (!accessData) return 0
    const parsed = JSON.parse(accessData)
    return parsed[profileId] || 0
  } catch {
    return 0
  }
}

const updateProfileLastAccessed = (profileId: string, userId: string) => {
  try {
    const key = getProfileAccessKey(userId)
    const existing = localStorage.getItem(key)
    const accessData = existing ? JSON.parse(existing) : {}
    accessData[profileId] = Date.now()
    localStorage.setItem(key, JSON.stringify(accessData))
  } catch (error) {
    console.warn('Failed to update profile access time:', error)
  }
}

const sortProfilesByRecentAccess = (profiles: Profile[], userId: string): Profile[] => {
  return [...profiles].sort((a, b) => {
    // First, prioritize default profiles
    if (a.is_default && !b.is_default) return -1
    if (!a.is_default && b.is_default) return 1
    
    // Then sort by last accessed time (most recent first)
    const aLastAccessed = getProfileLastAccessed(a.id!, userId)
    const bLastAccessed = getProfileLastAccessed(b.id!, userId)
    
    if (aLastAccessed !== bLastAccessed) {
      return bLastAccessed - aLastAccessed
    }
    
    // Finally, fall back to creation date for profiles that have never been accessed
    return new Date(a.created || '').getTime() - new Date(b.created || '').getTime()
  })
}

export function ProfileSelector({ selectedProfile, onSelectProfile, isAuthenticated = false, className }: ProfileSelectorProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [newProfileName, setNewProfileName] = React.useState("")
  const [newProfileDescription, setNewProfileDescription] = React.useState("")
  const [newProfileIcon, setNewProfileIcon] = React.useState("user")
  const [newProfileColor, setNewProfileColor] = React.useState("#3b82f6")
  
  // Delete profile state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [profileToDelete, setProfileToDelete] = React.useState<Profile | null>(null)
  const [notesCount, setNotesCount] = React.useState(0)

  // Get current user ID for access tracking
  const userId = pb.authStore.model?.id || 'anonymous'

  // Fetch profiles
  const { data: rawProfiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isAuthenticated && pb.authStore.isValid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Sort profiles by recent access
  const profiles = React.useMemo(() => {
    return sortProfilesByRecentAccess(rawProfiles, userId)
  }, [rawProfiles, userId])

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data: { name: string, description?: string, color?: string, icon?: string }) => {
      return await createProfile(data.name, data.description, data.color, data.icon)
    },
    onSuccess: (newProfile) => {
      queryClient.setQueryData(['profiles'], (oldProfiles: Profile[] = []) => {
        return [...oldProfiles, newProfile].sort((a, b) => {
          // Sort: default first, then by creation date
          if (a.is_default && !b.is_default) return -1
          if (!a.is_default && b.is_default) return 1
          return new Date(a.created || '').getTime() - new Date(b.created || '').getTime()
        })
      })
      
      // If this is the first profile (default), auto-select it
      if (newProfile.is_default) {
        onSelectProfile(newProfile)
        // Update access time for the new default profile
        updateProfileLastAccessed(newProfile.id!, userId)
      }
      
      // Reset form and close dialog
      setNewProfileName("")
      setNewProfileDescription("")
      setNewProfileIcon("user")
      setNewProfileColor("#3b82f6")
      setCreateDialogOpen(false)
    },
    onError: (error: unknown) => {
      console.error('Error creating profile:', error)
    }
  })

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: (result) => {
      // Update profiles cache
      queryClient.setQueryData(['profiles'], (oldProfiles: Profile[] = []) => {
        return oldProfiles.filter(p => p.id !== profileToDelete?.id)
      })
      
      // Invalidate all profile-related queries
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['notes-by-profile'] })
      
      // If the deleted profile was selected, switch to another profile
      if (selectedProfile?.id === profileToDelete?.id) {
        const remainingProfiles = profiles.filter(p => p.id !== profileToDelete?.id)
        const fallbackProfile = remainingProfiles.find(p => p.is_default) || remainingProfiles[0] || null
        onSelectProfile(fallbackProfile)
        
        // Update access time for fallback profile
        if (fallbackProfile) {
          updateProfileLastAccessed(fallbackProfile.id!, userId)
        }
      }
      
      // Reset state and close dialog
      setDeleteDialogOpen(false)
      setProfileToDelete(null)
      setNotesCount(0)
      
      console.log(`Profile deleted successfully. ${result.deletedNotesCount} notes were also deleted.`)
    },
    onError: (error: unknown) => {
      console.error('Error deleting profile:', error)
      setDeleteDialogOpen(false)
      setProfileToDelete(null)
      setNotesCount(0)
    }
  })

  // Get icon component for a profile
  const getIconComponent = (iconName: string) => {
    const iconData = PROFILE_ICONS.find(icon => icon.value === iconName)
    return iconData?.icon || User
  }

  // Handle create profile
  const handleCreateProfile = () => {
    if (!newProfileName.trim() || createProfileMutation.isPending) {
      return
    }
    
    createProfileMutation.mutate({
      name: newProfileName.trim(),
      description: newProfileDescription.trim() || undefined,
      color: newProfileColor,
      icon: newProfileIcon
    })
  }

  // Handle profile selection with access tracking
  const handleProfileSelect = (profile: Profile) => {
    const newSelectedProfile = profile.id === selectedProfile?.id ? null : profile
    onSelectProfile(newSelectedProfile)
    
    // Update access time for the selected profile
    if (newSelectedProfile) {
      updateProfileLastAccessed(newSelectedProfile.id!, userId)
    }
    
    setOpen(false)
  }

  // Handle delete profile initiation
  const handleDeleteProfile = async (profile: Profile) => {
    try {
      // Get notes count for this profile
      const notes = await getNotesByProfile(profile.id!)
      setNotesCount(notes.length)
      setProfileToDelete(profile)
      setDeleteDialogOpen(true)
    } catch (error) {
      console.error('Error getting notes count:', error)
      setNotesCount(0)
      setProfileToDelete(profile)
      setDeleteDialogOpen(true)
    }
  }

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (!profileToDelete?.id || deleteProfileMutation.isPending) {
      return
    }
    deleteProfileMutation.mutate(profileToDelete.id)
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn("w-[200px]", className)}>
        <Button
          variant="outline"
          role="combobox"
          disabled
          className="w-full justify-between text-sidebar-foreground/70"
        >
          Loading profiles...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className={cn("w-[200px]", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/50"
            >
              {selectedProfile ? (
                <div className="flex items-center space-x-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedProfile.color || '#3b82f6' }}
                  />
                  <span className="truncate">{selectedProfile.name}</span>
                </div>
              ) : (
                <span className="text-sidebar-foreground/70">Select profile...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-sidebar border-sidebar-border">
            <Command className="bg-sidebar">
              <CommandInput 
                placeholder="Search profiles..." 
                className="h-9 text-sidebar-foreground placeholder:text-sidebar-foreground/50" 
              />
              <CommandList>
                <CommandEmpty className="text-sidebar-foreground/70">No profile found.</CommandEmpty>
                <CommandGroup>
                  {profiles.map((profile) => {
                    const IconComponent = getIconComponent(profile.icon || 'user')
                    const canDelete = profiles.length > 1 // Can only delete if there's more than one profile
                    return (
                      <CommandItem
                        key={profile.id}
                        value={profile.name}
                        onSelect={() => handleProfileSelect(profile)}
                        className="text-sidebar-foreground hover:bg-sidebar-accent/50 flex justify-between items-center"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: profile.color || '#3b82f6' }}
                          />
                          <IconComponent className="h-4 w-4 flex-shrink-0 text-sidebar-foreground/70" />
                          <span className="truncate">{profile.name}</span>
                          {profile.is_default && (
                            <span className="text-xs text-sidebar-foreground/50">(default)</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedProfile?.id === profile.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {canDelete && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-sidebar-accent"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                  }}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-sidebar border-sidebar-border">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpen(false)
                                    handleDeleteProfile(profile)
                                  }}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Profile
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setCreateDialogOpen(true)
                    }}
                    className="text-sidebar-primary hover:bg-sidebar-accent/50 border-t border-sidebar-border mt-1 pt-2"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new profile
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Create Profile Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar border-sidebar-border text-sidebar-foreground">
          <DialogHeader>
            <DialogTitle className="text-sidebar-foreground">Create New Profile</DialogTitle>
            <DialogDescription className="text-sidebar-foreground/70">
              Create a new profile to organize your notes by context (e.g., Work, School, Personal).
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-sidebar-foreground">
                Name
              </Label>
              <Input
                id="name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g., Work, School"
                className="col-span-3 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground"
                maxLength={100}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right text-sidebar-foreground">
                Description
              </Label>
              <Textarea
                id="description"
                value={newProfileDescription}
                onChange={(e) => setNewProfileDescription(e.target.value)}
                placeholder="Optional description"
                className="col-span-3 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground"
                maxLength={500}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sidebar-foreground">Icon</Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {PROFILE_ICONS.map((iconData) => {
                  const IconComponent = iconData.icon
                  return (
                    <Button
                      key={iconData.value}
                      type="button"
                      variant={newProfileIcon === iconData.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewProfileIcon(iconData.value)}
                      className="h-8 w-8 p-0"
                    >
                      <IconComponent className="h-4 w-4" />
                    </Button>
                  )
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sidebar-foreground">Color</Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {PROFILE_COLORS.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewProfileColor(color)}
                    className={cn(
                      "h-8 w-8 p-0 border-2",
                      newProfileColor === color ? "border-sidebar-foreground" : "border-sidebar-border"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {newProfileColor === color && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
              className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateProfile}
              disabled={!newProfileName.trim() || createProfileMutation.isPending}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              {createProfileMutation.isPending ? 'Creating...' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Profile Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-sidebar border-sidebar-border text-sidebar-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sidebar-foreground">Delete Profile</AlertDialogTitle>
            <AlertDialogDescription className="text-sidebar-foreground/70">
              Are you sure you want to delete the profile &quot;{profileToDelete?.name}&quot;?
              <br /><br />
              <span className="font-semibold text-destructive">
                This will permanently delete the profile and all {notesCount} note{notesCount !== 1 ? 's' : ''} associated with it.
              </span>
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={() => {
                setDeleteDialogOpen(false)
                setProfileToDelete(null)
                setNotesCount(0)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteProfileMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfileMutation.isPending ? 'Deleting...' : `Delete Profile & ${notesCount} Note${notesCount !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 