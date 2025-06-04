import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Note } from '@/lib/pocketbase'
import { updateNote } from '@/lib/notes-api'

export interface AutosaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'offline' | 'conflict'
  lastSaved: Date | null
  errorMessage?: string
  retryCount: number
  canRetry: boolean
}

export interface AutosaveOptions {
  /** Debounce delay in milliseconds (default: 2000) */
  delay?: number
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number
  /** Enable offline support with local storage backup (default: true) */
  enableOfflineSupport?: boolean
  /** Custom comparison function to detect meaningful changes (default: string comparison) */
  isChanged?: (current: string, previous: string) => boolean
  /** Callback when save succeeds */
  onSaveSuccess?: (note: Note) => void
  /** Callback when save fails */
  onSaveError?: (error: Error) => void
  /** Callback when status changes */
  onStatusChange?: (status: AutosaveStatus) => void
}

export interface AutosaveResult {
  /** Current autosave status */
  status: AutosaveStatus
  /** Manually trigger save */
  saveNow: () => void
  /** Check if there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Reset error state and enable retries */
  resetError: () => void
  /** Pause/resume autosave */
  setPaused: (paused: boolean) => void
  /** Check if autosave is paused */
  isPaused: boolean
}

const DEFAULT_OPTIONS: Required<AutosaveOptions> = {
  delay: 2000,
  maxRetries: 3,
  enableOfflineSupport: true,
  isChanged: (current, previous) => current.trim() !== previous.trim(),
  onSaveSuccess: () => {},
  onSaveError: () => {},
  onStatusChange: () => {},
}

export function useAutosave(
  noteId: string | null,
  title: string,
  content: string,
  options: AutosaveOptions = {}
): AutosaveResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const queryClient = useQueryClient()
  
  // State management
  const [status, setStatus] = useState<AutosaveStatus>({
    status: 'idle',
    lastSaved: null,
    retryCount: 0,
    canRetry: true,
  })
  const [isPaused, setIsPaused] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Refs for stable references and timers
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContentRef = useRef<{ title: string; content: string }>({ title: '', content: '' })
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isOnlineRef = useRef(true)

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true
      if (status.status === 'offline' && hasUnsavedChanges) {
        // Automatically retry when back online
        performSave()
      }
    }
    
    const handleOffline = () => {
      isOnlineRef.current = false
      updateStatus({ status: 'offline' })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    isOnlineRef.current = navigator.onLine

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [hasUnsavedChanges, status.status])

  // Local storage backup for offline support
  const saveToLocalStorage = useCallback((noteId: string, title: string, content: string) => {
    if (!opts.enableOfflineSupport) return
    
    try {
      const backup = {
        noteId,
        title,
        content,
        timestamp: Date.now(),
      }
      localStorage.setItem(`autosave_backup_${noteId}`, JSON.stringify(backup))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }, [opts.enableOfflineSupport])

  const clearLocalStorage = useCallback((noteId: string) => {
    if (!opts.enableOfflineSupport) return
    
    try {
      localStorage.removeItem(`autosave_backup_${noteId}`)
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }, [opts.enableOfflineSupport])

  // Status update helper
  const updateStatus = useCallback((update: Partial<AutosaveStatus>) => {
    setStatus(prev => {
      const newStatus = { ...prev, ...update }
      opts.onStatusChange(newStatus)
      return newStatus
    })
  }, [opts])

  // Save mutation with comprehensive error handling
  const saveMutation = useMutation({
    mutationFn: async ({ noteId, title, content }: { noteId: string; title: string; content: string }) => {
      if (!isOnlineRef.current) {
        throw new Error('No internet connection')
      }

      const result = await updateNote(noteId, { 
        title: title.trim() || 'Untitled', 
        content 
      })
      return result
    },
    onMutate: () => {
      updateStatus({ status: 'saving' })
    },
    onSuccess: (updatedNote) => {
      // Update React Query cache optimistically
      queryClient.setQueryData(['note', updatedNote.id], updatedNote)
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
        oldNotes.map(n => n.id === updatedNote.id ? updatedNote : n)
      )

      // Update internal state
      lastSavedContentRef.current = { title: updatedNote.title || '', content: updatedNote.content || '' }
      setHasUnsavedChanges(false)
      
      // Clear local storage backup on successful save
      if (updatedNote.id) {
        clearLocalStorage(updatedNote.id)
      }

      updateStatus({ 
        status: 'saved', 
        lastSaved: new Date(),
        retryCount: 0,
        canRetry: true,
        errorMessage: undefined,
      })
      
      opts.onSaveSuccess(updatedNote)
    },
    onError: (error: any) => {
      const isNetworkError = !isOnlineRef.current || error.message?.includes('connection') || error.message?.includes('network')
      const isConflictError = error.status === 409 || error.message?.includes('conflict')
      
      let errorStatus: AutosaveStatus['status'] = 'error'
      let canRetry = true
      
      if (isNetworkError) {
        errorStatus = 'offline'
        // Save to local storage when offline
        if (noteId) {
          saveToLocalStorage(noteId, title, content)
        }
      } else if (isConflictError) {
        errorStatus = 'conflict'
        canRetry = false // Conflicts need manual resolution
      }

      const newRetryCount = status.retryCount + 1
      const shouldRetry = canRetry && newRetryCount <= opts.maxRetries && !isConflictError

      updateStatus({
        status: errorStatus,
        retryCount: newRetryCount,
        canRetry: shouldRetry,
        errorMessage: error.message || 'Failed to save',
      })

      // Exponential backoff retry for non-conflict errors
      if (shouldRetry) {
        const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 30000) // Max 30 seconds
        retryTimeoutRef.current = setTimeout(() => {
          if (noteId && !isPaused) {
            performSave()
          }
        }, retryDelay)
      }
      
      opts.onSaveError(error)
    }
  })

  // Core save function
  const performSave = useCallback(() => {
    if (!noteId || isPaused || !hasUnsavedChanges) return

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    saveMutation.mutate({ noteId, title, content })
  }, [noteId, title, content, isPaused, hasUnsavedChanges, saveMutation])

  // Debounced autosave trigger
  const triggerAutosave = useCallback(() => {
    if (!noteId || isPaused) return

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSave()
    }, opts.delay)
  }, [noteId, isPaused, opts.delay, performSave])

  // Check for content changes and trigger autosave
  useEffect(() => {
    if (!noteId) return

    const currentData = { title, content }
    const lastSavedData = lastSavedContentRef.current
    
    const titleChanged = opts.isChanged(currentData.title, lastSavedData.title)
    const contentChanged = opts.isChanged(currentData.content, lastSavedData.content)
    const hasChanges = titleChanged || contentChanged

    setHasUnsavedChanges(hasChanges)

    if (hasChanges && !isPaused) {
      // Reset error state when user makes changes
      if (status.status === 'error' && status.canRetry) {
        updateStatus({ status: 'idle', errorMessage: undefined })
      }
      
      triggerAutosave()
    }
  }, [noteId, title, content, isPaused, opts.isChanged, triggerAutosave, status.status, status.canRetry, updateStatus])

  // Manual save function
  const saveNow = useCallback(() => {
    if (!noteId || !hasUnsavedChanges) return
    
    // Clear debounce timer and save immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    
    performSave()
  }, [noteId, hasUnsavedChanges, performSave])

  // Reset error state
  const resetError = useCallback(() => {
    updateStatus({
      status: 'idle',
      retryCount: 0,
      canRetry: true,
      errorMessage: undefined,
    })
  }, [updateStatus])

  // Pause/resume autosave
  const setPaused = useCallback((paused: boolean) => {
    setIsPaused(paused)
    
    if (paused) {
      // Clear any pending saves when pausing
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    } else if (hasUnsavedChanges) {
      // Resume with immediate trigger
      triggerAutosave()
    }
  }, [hasUnsavedChanges, triggerAutosave])

  // Initialize lastSavedContent when note changes
  useEffect(() => {
    if (noteId) {
      lastSavedContentRef.current = { title, content }
      setHasUnsavedChanges(false)
      updateStatus({ status: 'idle', retryCount: 0, canRetry: true })
    }
  }, [noteId]) // Only run when noteId changes

  // Cleanup on unmount or note change
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [noteId])

  // Save on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && noteId) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        
        // Try to save synchronously as a last resort
        saveToLocalStorage(noteId, title, content)
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, noteId, title, content, saveToLocalStorage])

  return {
    status,
    saveNow,
    hasUnsavedChanges,
    resetError,
    setPaused,
    isPaused,
  }
} 