"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { SimpleEditor, SimpleEditorRef } from './tiptap-templates/simple/simple-editor'
import { Button } from '@/components/ui/button'
import { Trash2, Share, FileText, Download, Upload, CheckCircle } from 'lucide-react'
import { Note } from '@/lib/pocketbase'
import { deleteNote } from '@/lib/notes-api'
import { toast } from 'sonner'
import { useAutosave } from '@/hooks/use-autosave'
import { useSimpleRealtimeSync } from '@/hooks/use-simple-realtime-sync'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { normalizeImageUrls } from '@/lib/pocketbase'
import { useShareNote } from '@/hooks/use-share-note'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { DocumentSizeIndicator } from '@/components/document-size-indicator'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { SaveAsTemplateDialog } from '@/components/save-as-template-dialog'

interface NotesEditorWrapperProps {
  note: Note
  onSave: (note: Note) => void
  onDelete: (noteId: string) => void
  onTitleChange: (title: string) => void
}

type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html' | 'json'

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
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const { onOpen } = useShareNote()
  const editorRef = useRef<SimpleEditorRef>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Import/Export states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = useCallback(async (format: ExportFormat) => {
    const editor = editorRef.current?.editor
    if (!editor) {
      toast.error('Editor not available')
      return
    }
    setIsExporting(true)
    document.body.classList.add('cursor-wait')
    try {
      await editor.commands.exportDocument(format)
      toast.success(`Document exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    } finally {
      setIsExporting(false)
      document.body.classList.remove('cursor-wait')
    }
  }, [])

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    const editor = editorRef.current?.editor
    if (!files || files.length === 0 || !editor) return

    const file = files[0]
    setIsImporting(true)
    setImportProgress(0)
    setIsImportDialogOpen(true)

    const toastId = `import-${Date.now()}`
    
    try {
      toast.loading(`Importing ${file.name}...`, { id: toastId })
      setImportProgress(10)
      
      const success = editor.commands.importDocument(file)

      if (!success) {
        throw new Error('Import command failed')
      }
      // Simulate import progress
      let currentProgress = 20
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 10
        if (currentProgress > 90) {
          currentProgress = 90
        }
        setImportProgress(currentProgress)
      }, 200)

      setTimeout(() => {
        clearInterval(progressInterval)
        setImportProgress(100)
        toast.success(`Imported ${file.name}`, { id: toastId, duration: 3000 })
        setTimeout(() => {
          setIsImportDialogOpen(false)
          setIsImporting(false)
        }, 1000)
      }, 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Import failed: ${message}`, { id: toastId, duration: 5000 })
      setIsImporting(false)
      setIsImportDialogOpen(false)
    }
  }, [])

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  // Get real-time sync status (this is working!)
  const realtimeSync = useSimpleRealtimeSync()

  // Initialize autosave (separate from real-time to avoid conflicts)
  const autosaveResult = useAutosave(note.id || null, noteTitle, noteContent, {
    delay: 2000, // 2 second debounce - faster for better responsiveness
    maxRetries: 5, // Increased retries for better reliability
    enableOfflineSupport: true,
    // Enhanced change detection for better title/content handling
    isChanged: (current: string, previous: string) => {
      const currentTrimmed = current.trim()
      const previousTrimmed = previous.trim()
      
      if (currentTrimmed === previousTrimmed) return false
      
      // More sophisticated change detection
      const lengthDiff = Math.abs(currentTrimmed.length - previousTrimmed.length)
      
      // Always save large changes (like paste operations)
      if (lengthDiff > 500) {
        return true
      }
      
      // For smaller changes, be more selective
      if (lengthDiff < 3) {
        // Only save if meaningful structural changes
        return currentTrimmed.split('\n').length !== previousTrimmed.split('\n').length
      }
      
      return true
    },
    onSaveSuccess: (updatedNote) => {
      // Ensure the parent component is updated with the latest data
      onSave(updatedNote)
    },
    onSaveError: (error) => {
      // Enhanced error handling with more specific messages
      let errorMessage = 'Failed to save: ' + error.message
      
      if (error.message.includes('too large')) {
        errorMessage = 'Content is too large to save. Please reduce the size and try again.'
      } else if (error.message.includes('Title is too long')) {
        errorMessage = 'Title is too long. Please use a shorter title.'
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network error. Your changes are saved locally and will sync when connection is restored.'
      }
      
      toast.error(errorMessage, { 
        duration: error.message.includes('network') ? 3000 : 5000,
        action: error.message.includes('too large') ? {
          label: 'Learn More',
          onClick: () => {
            console.log('Content size limits: Title max 1900 chars, Content should be under 10MB')
          }
        } : undefined
      })
    }
  })

  // Create combined sync status that merges autosave + real-time
  const combinedSyncStatus = useMemo(() => {
    // Compute overall sync status compliant with IntegratedSyncResult
    // saving > conflicts/error > offline > synced
    let overallStatus: 'synced' | 'saving' | 'conflicts' | 'error' | 'offline' = 'synced'

    const isSaving = autosaveResult.status.status === 'saving' || autosaveResult.hasUnsavedChanges
    const isError = autosaveResult.status.status === 'error'
    const isOffline = autosaveResult.status.status === 'offline'

    if (isSaving) overallStatus = 'saving'
    else if (isError) overallStatus = 'error'
    else if (isOffline) overallStatus = 'offline'

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

  // Track previous note id to ensure updates when switching notes
  const prevNoteIdRef = useRef<string | undefined>(undefined)

  // Load note content when note changes, but avoid overwriting while user is actively typing
  useEffect(() => {
    const newTitle = note.title || ''
    const newContent = normalizeImageUrls(note.content || '')

    const isNoteSwitched = prevNoteIdRef.current !== note.id
    prevNoteIdRef.current = note.id

    // Title: only update if input not focused or note switched
    const isTitleFocused = typeof document !== 'undefined' && document.activeElement === titleInputRef.current
    if (isNoteSwitched || !isTitleFocused) {
      if (newTitle !== noteTitle) {
        setNoteTitle(newTitle)
      }
    }

    // Content: only update if editor not focused or note switched
    const isEditorFocused = !!editorRef.current?.editor?.isFocused
    if (isNoteSwitched || !isEditorFocused) {
      if (newContent !== noteContent) {
        setNoteContent(newContent)
      }
    }
  }, [note.id, note.title, note.content, noteTitle, noteContent])

  // When the editor loses focus, refresh local content from latest server cache
  useEffect(() => {
    const ed = editorRef.current?.editor
    if (!ed) return
    const handler = () => {
      const latest = normalizeImageUrls(note.content || '')
      setNoteContent(prev => (prev === latest ? prev : latest))
    }
    ed.on('blur', handler)
    return () => {
      ed.off('blur', handler)
    }
  }, [note.id, note.content])

  // Stable callback for content changes
  const handleContentChange = useCallback((content: string) => {
    setNoteContent(content)
  }, [])

  // Enhanced title change handler to prevent race conditions
  const handleTitleChange = useCallback((title: string) => {
    // Validate title length client-side to prevent server errors
    let processedTitle = title
    
    if (title.length > 1900) {
      processedTitle = title.substring(0, 1900)
      toast.warning('Title was trimmed to 1900 characters', { duration: 3000 })
    }
    
    setNoteTitle(processedTitle)
    onTitleChange(processedTitle)
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
    // Drive editor from local state to avoid resets on autosave cache updates
    initialContent: noteContent,
    onContentChange: handleContentChange,
    noteId: note.id,
    noteTitle: noteTitle,
    noteUpdated: note.updated
  }), [noteContent, noteTitle, note.id, note.updated, handleContentChange])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background p-3 sm:p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <Input
            type="text"
            value={noteTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            ref={titleInputRef}
            className="max-w-md text-lg font-semibold sm:text-xl border-none frappe:border"
            placeholder="Note title..."
          />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 ml-2 flex-shrink-0">
          <SyncStatusIndicator
            syncResult={combinedSyncStatus}
            className="flex items-center gap-2"
            showDetails={false}
          />
          <DocumentSizeIndicator
            title={noteTitle}
            content={noteContent}
            className="hidden sm:flex"
            showDetails={true}
          />
           {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {autosaveResult.status.retryCount > 0 && `Retry ${autosaveResult.status.retryCount}/5`}
                {!realtimeSync.isConnected && ` | Real-time: disconnected`}
              </span>
            )}
        </div>
      </div>
      
      <div className="border-b bg-background px-2">
        <Menubar className="border-none rounded-none">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => onOpen(note.id!, note.isPublic)}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </MenubarItem>
              <MenubarItem onClick={() => setSaveAsTemplateOpen(true)} disabled={!note.id}>
                <FileText className="h-4 w-4 mr-2" />
                Save as Template
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                Import...
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  accept=".docx,.md,.markdown,.html,.htm,.json,.txt"
                />
              </MenubarItem>
              <MenubarSub>
                <MenubarSubTrigger disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export As'}
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem onClick={() => handleExport('pdf')}>PDF</MenubarItem>
                  <MenubarItem onClick={() => handleExport('docx')}>Word (DOCX)</MenubarItem>
                  <MenubarItem onClick={() => handleExport('markdown')}>Markdown</MenubarItem>
                  <MenubarItem onClick={() => handleExport('html')}>HTML</MenubarItem>
                  <MenubarItem onClick={() => handleExport('json')}>JSON</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <MenubarItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </MenubarItem>
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
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => editorRef.current?.editor?.commands.undo()}>
                Undo
              </MenubarItem>
              <MenubarItem onClick={() => editorRef.current?.editor?.commands.redo()}>
                Redo
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-background overflow-hidden">
        <SimpleEditor key={note.id} ref={editorRef} {...editorProps} />
      </div>
      <SaveAsTemplateDialog
        open={saveAsTemplateOpen}
        onOpenChange={setSaveAsTemplateOpen}
        noteTitle={noteTitle}
        noteContent={noteContent}
      />
       <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Importing Document</DialogTitle>
            <DialogDescription>
              Please wait while your document is being imported.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isImporting ? (
              <div className="flex flex-col gap-2">
                <Progress value={importProgress} />
                <span className="text-sm text-center text-muted-foreground">
                  {importProgress.toFixed(0)}%
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                <span>Import Successful</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Done'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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