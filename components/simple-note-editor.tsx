"use client"

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SimpleEditor } from './tiptap-templates/simple/simple-editor'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, Trash2, Check, Clock, LogOut } from 'lucide-react'
import { Note } from '@/lib/pocketbase'
import { getNotes, createNote, updateNote, deleteNote, getNote } from '@/lib/notes-api'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

export function SimpleNoteEditor() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Fetch all notes
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['notes'],
    queryFn: getNotes,
    staleTime: 2 * 60 * 1000,
  })

  // Fetch selected note
  const { data: selectedNote, isLoading: isLoadingNote } = useQuery({
    queryKey: ['note', selectedNoteId],
    queryFn: () => getNote(selectedNoteId!),
    enabled: !!selectedNoteId,
    staleTime: 0,
  })

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const newNote = await createNote('New Note', '<h1>New Note</h1><p>Start writing your note here...</p>')
      return newNote
    },
    onSuccess: (newNote) => {
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => [newNote, ...oldNotes])
      queryClient.setQueryData(['note', newNote.id], newNote)
      setSelectedNoteId(newNote.id!)
      toast.success('New note created')
    },
    onError: (error: any) => {
      toast.error('Failed to create note: ' + error.message)
    }
  })

  // Manual save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNoteId) throw new Error('No note selected')
      const result = await updateNote(selectedNoteId, { 
        title: noteTitle.trim() || 'Untitled', 
        content: noteContent 
      })
      return result
    },
    onSuccess: (updatedNote) => {
      queryClient.setQueryData(['note', updatedNote.id], updatedNote)
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
        oldNotes.map(note => note.id === updatedNote.id ? updatedNote : note)
      )
      setHasUnsavedChanges(false)
      toast.success('Note saved successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to save note: ' + error.message)
    }
  })

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await deleteNote(noteId)
      return noteId
    },
    onSuccess: (noteId) => {
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => 
        oldNotes.filter(note => note.id !== noteId)
      )
      queryClient.removeQueries({ queryKey: ['note', noteId] })
      setSelectedNoteId(null)
      toast.success('Note deleted')
    },
    onError: (error: any) => {
      toast.error('Failed to delete note: ' + error.message)
    }
  })

  // Load note content when selected note changes
  useEffect(() => {
    if (selectedNote) {
      const newContent = selectedNote.content || ''
      const newTitle = selectedNote.title || ''
      
      setNoteContent(newContent)
      setNoteTitle(newTitle)
      setHasUnsavedChanges(false)
    }
  }, [selectedNote])

  // Auto-select first note or create one if none exist
  useEffect(() => {
    if (!isLoadingNotes && notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id!)
    } else if (!isLoadingNotes && notes.length === 0 && !createNoteMutation.isPending) {
      createNoteMutation.mutate()
    }
  }, [notes, isLoadingNotes, selectedNoteId, createNoteMutation])

  const handleContentChange = useCallback((content: string) => {
    setNoteContent(content)
    setHasUnsavedChanges(true)
  }, [])

  const handleTitleChange = useCallback((title: string) => {
    setNoteTitle(title)
    setHasUnsavedChanges(true)
  }, [])

  const handleSave = () => {
    if (selectedNoteId && hasUnsavedChanges) {
      saveMutation.mutate()
    }
  }

  const handleCreateNote = () => {
    createNoteMutation.mutate()
  }

  const handleDeleteNote = () => {
    if (selectedNoteId && confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(selectedNoteId)
    }
  }

  const handleNoteSelect = (noteId: string) => {
    if (hasUnsavedChanges && selectedNoteId) {
      if (confirm('You have unsaved changes. Do you want to save before switching notes?')) {
        saveMutation.mutate()
      }
    }
    setSelectedNoteId(noteId)
  }

  if (isLoadingNotes) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Notes</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  '+ New'
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {user && (
            <div className="text-xs text-muted-foreground mb-2">
              Signed in as {user.email}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                selectedNoteId === note.id ? 'bg-muted' : ''
              }`}
              onClick={() => handleNoteSelect(note.id!)}
            >
              <div className="font-medium text-sm line-clamp-1 mb-1">
                {note.title || 'Untitled'}
              </div>
              <div className="text-xs text-muted-foreground">
                {note.updated ? formatDistanceToNow(new Date(note.updated), { addSuffix: true }) : 'Just now'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote && selectedNoteId ? (
          <>
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-none outline-none w-full"
                  placeholder="Note title..."
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {hasUnsavedChanges && (
                    <span className="text-orange-500">Unsaved changes</span>
                  )}
                  {!hasUnsavedChanges && !saveMutation.isPending && (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Saved</span>
                    </>
                  )}
                  {saveMutation.isPending && (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Saving...</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || saveMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteNote}
                  disabled={deleteNoteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Simple Editor */}
            <div className="flex-1">
              <SimpleEditor 
                initialContent={selectedNote.content || ''}
                onContentChange={handleContentChange}
                noteId={selectedNoteId}
                noteTitle={selectedNote.title || ''}
              />
            </div>
          </>
        ) : isLoadingNote ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-lg mb-2">Loading note...</div>
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-lg mb-2">Select a note to start editing</div>
              <Button onClick={handleCreateNote} disabled={createNoteMutation.isPending}>
                Create your first note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 