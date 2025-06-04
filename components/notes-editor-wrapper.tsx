"use client"

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SimpleEditor } from './tiptap-templates/simple/simple-editor'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { Note } from '@/lib/pocketbase'
import { deleteNote } from '@/lib/notes-api'
import { toast } from 'sonner'
import { useAutosave } from '@/hooks/use-autosave'
import { AutosaveStatusIndicator } from '@/components/autosave-status'

interface NotesEditorWrapperProps {
  note: Note
  onSave: (note: Note) => void
  onDelete: (noteId: string) => void
  onTitleChange: (title: string) => void
}

export default function NotesEditorWrapper({ 
  note, 
  onSave, 
  onDelete, 
  onTitleChange 
}: NotesEditorWrapperProps) {
  const queryClient = useQueryClient()
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')

  // Initialize autosave with comprehensive options
  const autosave = useAutosave(note.id || null, noteTitle, noteContent, {
    delay: 2000, // 2 second debounce
    maxRetries: 3,
    enableOfflineSupport: true,
    // Custom comparison to ignore whitespace-only changes
    isChanged: (current, previous) => current.trim() !== previous.trim(),
    onSaveSuccess: (updatedNote) => {
      onSave(updatedNote)
      toast.success('Note saved', { duration: 1000 })
    },
    onSaveError: (error) => {
      if (error.message?.includes('connection') || error.message?.includes('network')) {
        toast.error('Connection lost - changes saved locally', { duration: 3000 })
      } else if (error.message?.includes('conflict')) {
        toast.error('Conflict detected - please save manually', { duration: 5000 })
      } else {
        toast.error('Failed to save note: ' + error.message, { duration: 3000 })
      }
    },
    onStatusChange: (status) => {
      // Optional: Log status changes for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Autosave status changed:', status)
      }
    }
  })

  // Delete note mutation (kept separate from autosave)
  const handleDelete = useCallback(async () => {
    if (!note.id) return
    
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        // Pause autosave during deletion to avoid conflicts
        autosave.setPaused(true)
        
        await deleteNote(note.id)
        onDelete(note.id)
        toast.success('Note deleted')
      } catch (error: any) {
        toast.error('Failed to delete note: ' + error.message)
        // Resume autosave if deletion failed
        autosave.setPaused(false)
      }
    }
  }, [note.id, onDelete, autosave])

  // Load note content when note changes
  useEffect(() => {
    if (note) {
      const newContent = note.content || ''
      const newTitle = note.title || ''
      
      setNoteContent(newContent)
      setNoteTitle(newTitle)
    }
  }, [note.id, note.content, note.title])

  const handleContentChange = useCallback((content: string) => {
    setNoteContent(content)
  }, [])

  const handleTitleChange = useCallback((title: string) => {
    setNoteTitle(title)
    onTitleChange(title)
  }, [onTitleChange])

  // Keyboard shortcut for manual save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (autosave.hasUnsavedChanges) {
          autosave.saveNow()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [autosave])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none outline-none w-full text-foreground"
            placeholder="Note title..."
          />
          <div className="flex items-center justify-between mt-1">
            {/* Autosave status indicator */}
            <AutosaveStatusIndicator
              status={autosave.status}
              hasUnsavedChanges={autosave.hasUnsavedChanges}
              isPaused={autosave.isPaused}
              onSaveNow={autosave.saveNow}
              onRetry={autosave.resetError}
              onTogglePause={() => autosave.setPaused(!autosave.isPaused)}
              showPauseButton={true}
              showSaveButton={true}
              compact={false}
            />
            
            {/* Additional info for development */}
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-muted-foreground">
                {autosave.status.retryCount > 0 && `Retry ${autosave.status.retryCount}/3`}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-background">
        <SimpleEditor 
          initialContent={note.content || ''}
          onContentChange={handleContentChange}
          noteId={note.id}
          noteTitle={note.title || ''}
        />
      </div>
    </div>
  )
} 