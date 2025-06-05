"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { SimpleEditor } from './tiptap-templates/simple/simple-editor'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { Note } from '@/lib/pocketbase'
import { deleteNote } from '@/lib/notes-api'
import { toast } from 'sonner'
import { useAutosave } from '@/hooks/use-autosave'
import { AutosaveStatusIndicator } from '@/components/autosave-status'
import { normalizeImageUrls } from '@/lib/pocketbase'

interface NotesEditorWrapperProps {
  note: Note
  onSave: (note: Note) => void
  onDelete: (noteId: string) => void
  onTitleChange: (title: string) => void
}

// Memoized component to prevent unnecessary re-renders
const NotesEditorWrapper = ({ 
  note, 
  onSave, 
  onDelete, 
  onTitleChange 
}: NotesEditorWrapperProps) => {
  const [noteTitle, setNoteTitle] = useState('')
  
  // Restore noteContent state - needed for autosave to work properly
  // SimpleEditor is still isolated from re-renders via memo(() => true)
  const [noteContent, setNoteContent] = useState('')

  // Initialize autosave with faster delays for better UX
  const autosave = useAutosave(note.id || null, noteTitle, noteContent, {
    delay: 3000, // 3 second debounce - good balance of performance and responsiveness
    maxRetries: 3,
    enableOfflineSupport: true,
    // More responsive change detection
    isChanged: (current, previous) => {
      const currentTrimmed = current.trim()
      const previousTrimmed = previous.trim()
      
      if (currentTrimmed === previousTrimmed) return false
      
      // Save on smaller changes now that we have better performance
      return Math.abs(currentTrimmed.length - previousTrimmed.length) > 5 ||
             currentTrimmed.split('\n').length !== previousTrimmed.split('\n').length
    },
    onSaveSuccess: (updatedNote) => {
      onSave(updatedNote)
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
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        toast.error('Failed to delete note: ' + errorMessage)
        // Resume autosave if deletion failed
        autosave.setPaused(false)
      }
    }
  }, [note.id, onDelete, autosave])

  // Load note content when note changes - but don't cause re-renders
  useEffect(() => {
    if (note) {
      const newTitle = note.title || ''
      const newContent = normalizeImageUrls(note.content || '')
      
      setNoteTitle(newTitle)
      setNoteContent(newContent)
    }
  }, [note.id]) // Only depend on note.id to prevent unnecessary updates

  // Stable callback for content changes
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

  // Memoize the editor props to prevent re-creation - critical for performance
  const editorProps = useMemo(() => ({
    initialContent: normalizeImageUrls(note.content || ''),
    onContentChange: handleContentChange,
    noteId: note.id,
    noteTitle: note.title || ''
  }), [note.content, note.id, note.title, handleContentChange])

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
        <SimpleEditor key={note.id} {...editorProps} />
      </div>
    </div>
  )
}

// Export memoized component with custom comparison to prevent re-renders
export default memo(NotesEditorWrapper, (prevProps, nextProps) => {
  // Only re-render if the note ID actually changes
  return prevProps.note.id === nextProps.note.id &&
         prevProps.note.title === nextProps.note.title &&
         prevProps.note.content === nextProps.note.content
}) 