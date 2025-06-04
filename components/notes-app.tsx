"use client"

import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Note } from '@/lib/pocketbase'
import { AppShell } from '@/components/app-shell'
import { NotesSidebar, type NotesSidebarRef } from './notes-sidebar'
import { EditorPlaceholder } from '@/components/editor-placeholder'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { ModeToggle } from './mode-toggle'
import { getNote } from '@/lib/notes-api'
import NotesEditorWrapper from './notes-editor-wrapper'

export function NotesApp() {
  const { user, logout } = useAuth()
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const sidebarRef = useRef<{ refreshNotes: () => void } | null>(null)

  // Fetch the selected note using React Query - this will use cached data from auto-save
  const { data: selectedNote, isLoading: isLoadingNote, error: noteError } = useQuery({
    queryKey: ['note', selectedNoteId],
    queryFn: () => getNote(selectedNoteId!),
    enabled: !!selectedNoteId,
    staleTime: 0, // Always use cached data if available
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })

  const handleSelectNote = useCallback((note: Note) => {
    if (note.id) {
      setSelectedNoteId(note.id)
    }
  }, [])

  const handleCreateNote = useCallback((note: Note) => {
    if (note.id) {
      setSelectedNoteId(note.id)
    }
  }, [])

  const handleSaveNote = useCallback((updatedNote: Note) => {
    // The cache is already updated by auto-save, no need to do anything here
    // Just occasionally refresh sidebar to show updated timestamps
    if (Math.random() < 0.1) { // 10% chance to refresh
      sidebarRef.current?.refreshNotes()
    }
  }, [])

  const handleDeleteNote = useCallback((noteId: string) => {
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }
    // Refresh sidebar to remove deleted note
    sidebarRef.current?.refreshNotes()
  }, [selectedNoteId])

  const handleTitleChange = useCallback((title: string) => {
    // The auto-save handles title changes, no need to update local state
  }, [])

  // Show loading state while note is being fetched
  if (selectedNoteId && isLoadingNote) {
    return (
      <ProtectedRoute>
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
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading note...</p>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
    )
  }

  // Show error state if note failed to load
  if (selectedNoteId && noteError) {
    return (
      <ProtectedRoute>
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
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
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
      >
        {selectedNote ? (
          <NotesEditorWrapper
            note={selectedNote}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <EditorPlaceholder />
        )}
      </AppShell>
    </ProtectedRoute>
  )
} 