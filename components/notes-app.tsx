"use client"

import { useState, useCallback, useRef, useEffect, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { getNote } from '@/lib/notes-api'
import { Note } from '@/lib/pocketbase'
import { AppShell } from './app-shell'
import { NotesSidebar } from './notes-sidebar'
import { ProtectedRoute } from './protected-route'
import { autoSetupTemplatesIfNeeded } from '@/lib/setup-templates'
import { autoSetupProfilesIfNeeded } from '@/lib/setup-profiles'
import { ShareNoteDialog } from './share-note-dialog'
import NotesEditorWrapper from './notes-editor-wrapper'
import { TemplateGallery } from './template-gallery'
import { ProfileProvider } from '@/lib/profile-context'

export function NotesApp() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const sidebarRef = useRef<{ refreshNotes: () => void } | null>(null)
  const [isNavigating, startTransition] = useTransition()
  
  // Auto-setup templates and profiles when user is authenticated
  useEffect(() => {
    if (user) {
      // Small delay to ensure PocketBase is fully initialized
      const timer = setTimeout(async () => {
        await autoSetupTemplatesIfNeeded()
        await autoSetupProfilesIfNeeded()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [user])



  // Fetch the selected note using React Query - this will use cached data from auto-save
  const { data: selectedNote, isLoading: isLoadingNote, error: noteError } = useQuery({
    queryKey: ['note', selectedNoteId],
    queryFn: () => getNote(selectedNoteId!),
    enabled: !!selectedNoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache data longer to reduce refetches
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid conflicts
    refetchOnMount: false, // Don't refetch on mount if we have cached data
  })

  const handleSelectNote = useCallback((note: Note) => {
    if (note.id) {
      // Prime cache synchronously (fast) then schedule navigation transition
      queryClient.setQueryData(['note', note.id], note)
      startTransition(() => {
        setSelectedNoteId(note.id!)
      })
    }
  }, [queryClient, startTransition])

  const handleCreateNote = useCallback((note: Note) => {
    if (note.id) {
      queryClient.setQueryData(['note', note.id], note)
      startTransition(() => {
        setSelectedNoteId(note.id!)
      })
    }
  }, [queryClient, startTransition])

  const handleSaveNote = useCallback((updatedNote: Note) => {
    // Update the React Query cache with the saved note to ensure consistency
    queryClient.setQueryData(['note', updatedNote.id], updatedNote)
    queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
      oldNotes.map(n => n.id === updatedNote.id ? updatedNote : n)
    )
    
    // Refresh sidebar to show updated timestamps and any other changes
    sidebarRef.current?.refreshNotes()
  }, [queryClient])

  const handleDeleteNote = useCallback((noteId: string) => {
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }
    // Refresh sidebar to remove deleted note
    sidebarRef.current?.refreshNotes()
  }, [selectedNoteId])

  const handleTitleChange = useCallback((title: string) => {
    // Update the note title in cache immediately for better UX
    if (selectedNoteId) {
      queryClient.setQueryData(['note', selectedNoteId], (oldNote: Note | undefined) => 
        oldNote ? { ...oldNote, title } : oldNote
      )
      
      // Also update in the notes list for sidebar consistency
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
        oldNotes.map(n => n.id === selectedNoteId ? { ...n, title } : n)
      )
    }
  }, [selectedNoteId, queryClient])

  const handleLogoClick = useCallback(() => {
    // Clear selected note to return to template gallery
    setSelectedNoteId(null)
  }, [])

  // Show loading state while note is being fetched
  if (selectedNoteId && isLoadingNote) {
    return (
      <ProtectedRoute>
        <ProfileProvider isAuthenticated={!!user}>
          <AppShell
            sidebar={
              <NotesSidebar
                ref={sidebarRef}
                selectedNote={selectedNote || null}
                onSelectNote={handleSelectNote}
                onCreateNote={handleCreateNote}
                isAuthenticated={true}
              />
            }
            userActions={
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {user?.email || 'User'}
                </span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            }
            onLogoClick={handleLogoClick}
          >
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading note...</p>
              </div>
            </div>
          </AppShell>
        </ProfileProvider>
      </ProtectedRoute>
    )
  }

  // Show error state if note failed to load
  if (selectedNoteId && noteError) {
    return (
      <ProtectedRoute>
        <ProfileProvider isAuthenticated={!!user}>
          <AppShell
            sidebar={
              <NotesSidebar
                ref={sidebarRef}
                selectedNote={null}
                onSelectNote={handleSelectNote}
                onCreateNote={handleCreateNote}
                isAuthenticated={true}
              />
            }
            userActions={
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {user?.email || 'User'}
                </span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            }
            onLogoClick={handleLogoClick}
          >
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-destructive mb-4">Failed to load note</p>
                <Button onClick={() => setSelectedNoteId(null)} variant="outline">
                  Go back
                </Button>
              </div>
            </div>
          </AppShell>
        </ProfileProvider>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <ProfileProvider isAuthenticated={!!user}>
        <ShareNoteDialog />
        <AppShell
        sidebar={
          <NotesSidebar
            ref={sidebarRef}
            selectedNote={selectedNote || null}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            isAuthenticated={true}
          />
        }
        userActions={
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {user?.email || 'User'}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        }
        onLogoClick={handleLogoClick}
      >
        {selectedNote ? (
          <NotesEditorWrapper
            key={`editor-${selectedNote.id}`}
            note={selectedNote}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <TemplateGallery key="template-gallery" onCreateNote={handleCreateNote} />
        )}
      </AppShell>
      </ProfileProvider>
    </ProtectedRoute>
  )
} 