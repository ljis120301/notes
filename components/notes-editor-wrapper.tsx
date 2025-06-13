"use client"

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { SimpleEditor } from './tiptap-templates/simple/simple-editor'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { Note } from '@/lib/pocketbase'
import { deleteNote } from '@/lib/notes-api'
import { toast } from 'sonner'
import { useAutosave } from '@/hooks/use-autosave'
import { useSimpleRealtimeSync } from '@/hooks/use-simple-realtime-sync'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { normalizeImageUrls } from '@/lib/pocketbase'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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
  const [noteTitle, setNoteTitle] = useState(note.title || '')
  const [noteContent, setNoteContent] = useState(normalizeImageUrls(note.content || ''))
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Get real-time sync status (this is working!)
  const realtimeSync = useSimpleRealtimeSync()

  // Initialize autosave (separate from real-time to avoid conflicts)
  const autosaveResult = useAutosave(note.id || null, noteTitle, noteContent, {
    delay: 3000, // 3 second debounce - good balance of performance and responsiveness
    maxRetries: 3,
    enableOfflineSupport: true,
    // More responsive change detection
    isChanged: (current: string, previous: string) => {
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
      toast.error('Failed to save: ' + error.message, { duration: 5000 })
    }
  })

  // Create combined sync status that merges autosave + real-time
  const combinedSyncStatus = useMemo(() => {
    // Get the overall status priority: saving > conflicts > error > synced
    let overallStatus: 'synced' | 'saving' | 'conflicts' | 'error' | 'offline' = 'synced'
    
    // Check autosave status first (higher priority)
    if (autosaveResult.status.status === 'saving') {
      overallStatus = 'saving'
    } else if (autosaveResult.status.status === 'error') {
      overallStatus = 'error'
    } else if (autosaveResult.status.status === 'offline') {
      overallStatus = 'offline'
    } else if (autosaveResult.hasUnsavedChanges) {
      // Still synced overall, just has unsaved changes
      overallStatus = 'synced'
    }

    return {
      // Create a compatible interface with IntegratedSyncResult
      status: autosaveResult.status,
      hasUnsavedChanges: autosaveResult.hasUnsavedChanges,
      saveNow: autosaveResult.saveNow,
      resetError: autosaveResult.resetError,
      setPaused: autosaveResult.setPaused,
      isPaused: autosaveResult.isPaused,
      // Mock the real-time sync interface
      isConnected: realtimeSync.isConnected,
      lastSync: realtimeSync.lastEventTime,
      conflicts: [], // No conflicts with this approach
      connect: realtimeSync.connect,
      disconnect: realtimeSync.disconnect,
      resolveConflict: () => {}, // No-op
      resolveAllConflicts: () => {}, // No-op
      forceSync: async () => { autosaveResult.saveNow() },
      pauseAllSync: () => { autosaveResult.setPaused(true) },
      resumeAllSync: () => { autosaveResult.setPaused(false) },
      refreshNote: async () => {}, // No-op for now
      syncStatus: {
        overall: overallStatus,
        autosave: autosaveResult.status,
        realtime: {
          connected: realtimeSync.isConnected,
          lastSync: realtimeSync.lastEventTime,
          hasConflicts: false,
          conflictCount: 0,
        }
      }
    }
  }, [autosaveResult, realtimeSync.isConnected, realtimeSync.lastEventTime, realtimeSync.connect, realtimeSync.disconnect])

  // Delete note mutation (kept separate from autosave)
  const handleDelete = useCallback(async () => {
    if (!note.id) return
    
    try {
      // Pause autosave during deletion to avoid conflicts
      autosaveResult.setPaused(true)
      
      await deleteNote(note.id)
      onDelete(note.id)
      toast.success('Note deleted')
      setDeleteDialogOpen(false)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error('Failed to delete note: ' + errorMessage)
      // Resume autosave if deletion failed
      autosaveResult.setPaused(false)
    }
  }, [note.id, onDelete, autosaveResult])

  // Load note content when note changes - but don't cause re-renders
  useEffect(() => {
    const newTitle = note.title || ''
    const newContent = normalizeImageUrls(note.content || '')
    
    setNoteTitle(newTitle)
    setNoteContent(newContent)
  }, [note.id, note.title, note.content]) // Include all note properties used in effect

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
        if (autosaveResult.hasUnsavedChanges) {
          autosaveResult.saveNow()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [autosaveResult])

  // Memoize the editor props to prevent re-creation - critical for performance
  const editorProps = useMemo(() => ({
    initialContent: normalizeImageUrls(note.content || ''),
    onContentChange: handleContentChange,
    noteId: note.id,
    noteTitle: note.title || '',
    noteUpdated: note.updated
  }), [note.content, note.id, note.title, note.updated, handleContentChange])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background p-3 sm:p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-base sm:text-lg font-semibold bg-transparent border-none outline-none w-full text-foreground"
            placeholder="Note title..."
          />
          <div className="flex items-center justify-between mt-1">
            {/* Sync status indicator with real-time capabilities */}
            <div className="flex-1 min-w-0">
              <SyncStatusIndicator
                syncResult={combinedSyncStatus}
                className="flex items-center gap-2"
                showDetails={false} // Use compact mode for header
              />
            </div>
            
            {/* Additional info for development */}
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {autosaveResult.status.retryCount > 0 && `Retry ${autosaveResult.status.retryCount}/3`}
                {!realtimeSync.isConnected && ` | Real-time: disconnected`}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-1 sm:gap-2 ml-2 sm:ml-4 flex-shrink-0">
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9 p-0"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Note</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{noteTitle || 'Untitled'}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-background overflow-hidden">
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