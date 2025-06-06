import { useCallback, useEffect, useState } from 'react'
import { Note } from '@/lib/pocketbase'
import { useAutosave, AutosaveOptions, AutosaveResult } from './use-autosave'
import { useRealtimeSync, RealtimeSyncOptions, RealtimeSyncResult, RealtimeEvent } from './use-realtime-sync'

export interface IntegratedSyncOptions extends 
  Omit<AutosaveOptions, 'onSaveSuccess' | 'onSaveError'>,
  Omit<RealtimeSyncOptions, 'onRemoteChange' | 'onSyncConflict'> {
  
  /** Show notification when remote changes are received */
  showRemoteChangeNotifications?: boolean
  
  /** Auto-resolve conflicts when user has no unsaved changes (default: true) */
  autoResolveConflicts?: boolean
  
  /** Pause autosave temporarily when conflicts are detected (default: true) */
  pauseAutosaveOnConflict?: boolean
  
  /** Callback when any sync event occurs */
  onSyncEvent?: (event: {
    type: 'autosave_success' | 'autosave_error' | 'remote_change' | 'conflict_detected' | 'conflict_resolved'
    data?: any
    timestamp: Date
  }) => void
  
  /** Callback for user notifications */
  onNotification?: (notification: {
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    message: string
    actions?: Array<{
      label: string
      action: () => void
      variant?: 'default' | 'destructive'
    }>
  }) => void
}

export interface IntegratedSyncResult extends AutosaveResult, RealtimeSyncResult {
  /** Enhanced status that includes both autosave and realtime state */
  syncStatus: {
    autosave: AutosaveResult['status']
    realtime: {
      connected: boolean
      lastSync: Date | null
      hasConflicts: boolean
      conflictCount: number
    }
    overall: 'synced' | 'saving' | 'conflicts' | 'error' | 'offline'
  }
  
  /** Convenience methods */
  forceSync: () => Promise<void>
  resolveAllConflicts: (resolution: 'remote' | 'local') => void
  pauseAllSync: () => void
  resumeAllSync: () => void
}

const DEFAULT_INTEGRATED_OPTIONS: Required<Pick<IntegratedSyncOptions, 
  'showRemoteChangeNotifications' | 'autoResolveConflicts' | 'pauseAutosaveOnConflict'
>> = {
  showRemoteChangeNotifications: true,
  autoResolveConflicts: true,
  pauseAutosaveOnConflict: true,
}

export function useIntegratedSync(
  noteId: string | null,
  title: string,
  content: string,
  options: IntegratedSyncOptions = {}
): IntegratedSyncResult {
  const opts = { ...DEFAULT_INTEGRATED_OPTIONS, ...options }
  
  // State for managing the integration
  const [isPausedByConflict, setIsPausedByConflict] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  
  // Enhanced autosave options with integration callbacks
  const autosaveOptions: AutosaveOptions = {
    ...opts,
    onSaveSuccess: (note: Note) => {
      opts.onSyncEvent?.({
        type: 'autosave_success',
        data: { noteId: note.id, title: note.title },
        timestamp: new Date()
      })
    },
    onSaveError: (error: Error) => {
      opts.onSyncEvent?.({
        type: 'autosave_error',
        data: { error: error.message },
        timestamp: new Date()
      })
      
      opts.onNotification?.({
        type: 'error',
        title: 'Auto-save Failed',
        message: error.message,
        actions: [{
          label: 'Retry',
          action: () => autosaveResult.saveNow(),
          variant: 'default'
        }]
      })
    }
  }
  
  // Initialize autosave hook
  const autosaveResult = useAutosave(noteId, title, content, {
    ...autosaveOptions,
    // Pause autosave if conflicts exist and option is enabled
    delay: opts.pauseAutosaveOnConflict && isPausedByConflict ? 60000 : autosaveOptions.delay,
  })
  
  // Handle remote changes with smart conflict detection
  const handleRemoteChange = useCallback((event: RealtimeEvent) => {
    const { action, record } = event
    
    opts.onSyncEvent?.({
      type: 'remote_change',
      data: { action, noteId: record.id, title: record.title },
      timestamp: new Date()
    })
    
    // Show notification for remote changes if enabled
    if (opts.showRemoteChangeNotifications && record.id !== noteId) {
      const actionText = action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted'
      opts.onNotification?.({
        type: 'info',
        title: 'Note Updated',
        message: `"${record.title || 'Untitled'}" was ${actionText} on another device`,
      })
    }
  }, [noteId, opts])
  
  // Handle sync conflicts with smart resolution
  const handleSyncConflict = useCallback((remoteNote: Note, localNote: Note) => {
    setIsPausedByConflict(opts.pauseAutosaveOnConflict)
    
    opts.onSyncEvent?.({
      type: 'conflict_detected',
      data: { 
        noteId: remoteNote.id, 
        remoteTitle: remoteNote.title, 
        localTitle: localNote.title 
      },
      timestamp: new Date()
    })
    
    // Show conflict notification with resolution options
    opts.onNotification?.({
      type: 'warning',
      title: 'Sync Conflict Detected',
      message: `"${localNote.title || 'Untitled'}" has been modified on another device. Choose which version to keep.`,
      actions: [
        {
          label: 'Keep Remote Version',
          action: () => realtimeResult.resolveConflict(remoteNote.id!, 'remote'),
          variant: 'default'
        },
        {
          label: 'Keep Local Version',
          action: () => realtimeResult.resolveConflict(remoteNote.id!, 'local'),
          variant: 'default'
        }
      ]
    })
  }, [opts])
  
  // Custom conflict resolver with auto-resolution logic
  const customConflictResolver = useCallback((
    remoteNote: Note,
    localNote: Note,
    hasUnsavedChanges: boolean
  ): 'remote' | 'local' | 'manual' => {
    // If auto-resolve is enabled and no unsaved changes, prefer remote
    if (opts.autoResolveConflicts && !hasUnsavedChanges) {
      // Check if remote is significantly newer
      if (remoteNote.updated && localNote.updated) {
        const remoteTime = new Date(remoteNote.updated).getTime()
        const localTime = new Date(localNote.updated).getTime()
        
        if (remoteTime > localTime + 5000) { // 5 second threshold
          return 'remote'
        }
      }
    }
    
    // Default to manual resolution for safety
    return 'manual'
  }, [opts.autoResolveConflicts])
  
  // Enhanced realtime sync options
  const realtimeSyncOptions: RealtimeSyncOptions = {
    ...opts,
    onRemoteChange: handleRemoteChange,
    onSyncConflict: handleSyncConflict,
    conflictResolver: customConflictResolver,
  }
  
  // Initialize realtime sync hook
  const realtimeResult = useRealtimeSync(
    noteId,
    autosaveResult.status,
    autosaveResult.hasUnsavedChanges,
    realtimeSyncOptions
  )
  
  // Monitor conflicts and update pause state
  useEffect(() => {
    const hasConflicts = realtimeResult.conflicts.length > 0
    setIsPausedByConflict(opts.pauseAutosaveOnConflict && hasConflicts)
  }, [realtimeResult.conflicts.length, opts.pauseAutosaveOnConflict])
  
  // Enhanced conflict resolution with notifications
  const enhancedResolveConflict = useCallback((noteId: string, resolution: 'remote' | 'local') => {
    realtimeResult.resolveConflict(noteId, resolution)
    
    opts.onSyncEvent?.({
      type: 'conflict_resolved',
      data: { noteId, resolution },
      timestamp: new Date()
    })
    
    const resolutionText = resolution === 'remote' ? 'remote version' : 'local version'
    opts.onNotification?.({
      type: 'success',
      title: 'Conflict Resolved',
      message: `Conflict resolved by keeping the ${resolutionText}`,
    })
  }, [realtimeResult.resolveConflict, opts])
  
  // Calculate overall sync status
  const syncStatus = {
    autosave: autosaveResult.status,
    realtime: {
      connected: realtimeResult.isConnected,
      lastSync: realtimeResult.lastSync,
      hasConflicts: realtimeResult.conflicts.length > 0,
      conflictCount: realtimeResult.conflicts.length,
    },
    overall: (() => {
      if (realtimeResult.conflicts.length > 0) return 'conflicts' as const
      if (autosaveResult.status.status === 'saving') return 'saving' as const
      if (autosaveResult.status.status === 'error' || !realtimeResult.isConnected) return 'error' as const
      if (autosaveResult.status.status === 'offline') return 'offline' as const
      return 'synced' as const
    })(),
  }
  
  // Convenience methods
  const forceSync = useCallback(async () => {
    // First save any pending changes
    if (autosaveResult.hasUnsavedChanges) {
      autosaveResult.saveNow()
    }
    
    // Then refresh from server if we have a note ID
    if (noteId) {
      await realtimeResult.refreshNote(noteId)
    }
  }, [autosaveResult, realtimeResult, noteId])
  
  const resolveAllConflicts = useCallback((resolution: 'remote' | 'local') => {
    realtimeResult.conflicts.forEach(conflict => {
      enhancedResolveConflict(conflict.id, resolution)
    })
  }, [realtimeResult.conflicts, enhancedResolveConflict])
  
  const pauseAllSync = useCallback(() => {
    setManualPause(true)
    autosaveResult.setPaused(true)
    realtimeResult.disconnect()
  }, [autosaveResult, realtimeResult])
  
  const resumeAllSync = useCallback(() => {
    setManualPause(false)
    autosaveResult.setPaused(false)
    realtimeResult.connect()
  }, [autosaveResult, realtimeResult])
  
  return {
    // Autosave properties
    ...autosaveResult,
    
    // Realtime sync properties
    isConnected: realtimeResult.isConnected,
    lastSync: realtimeResult.lastSync,
    conflicts: realtimeResult.conflicts,
    refreshNote: realtimeResult.refreshNote,
    connect: realtimeResult.connect,
    disconnect: realtimeResult.disconnect,
    
    // Enhanced methods
    resolveConflict: enhancedResolveConflict,
    
    // New integrated properties
    syncStatus,
    forceSync,
    resolveAllConflicts,
    pauseAllSync,
    resumeAllSync,
  }
} 