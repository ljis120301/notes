import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pb, Note, notesCollection, normalizeImageUrls } from '@/lib/pocketbase'
import { AutosaveStatus } from './use-autosave'

export interface RealtimeEvent {
  action: 'create' | 'update' | 'delete'
  record: Note
}

export interface RealtimeSyncOptions {
  /** Enable real-time sync (default: true) */
  enabled?: boolean
  /** Callback when a remote change is detected */
  onRemoteChange?: (event: RealtimeEvent) => void
  /** Callback when sync conflicts are detected */
  onSyncConflict?: (remoteNote: Note, localNote: Note) => void
  /** Custom conflict resolution strategy */
  conflictResolver?: (remoteNote: Note, localNote: Note, hasUnsavedChanges: boolean) => 'remote' | 'local' | 'manual'
}

export interface RealtimeSyncResult {
  /** Connection status */
  isConnected: boolean
  /** Last sync timestamp */
  lastSync: Date | null
  /** Pending conflicts that need manual resolution */
  conflicts: Array<{
    id: string
    remoteNote: Note
    localNote: Note
    timestamp: Date
  }>
  /** Resolve a conflict manually */
  resolveConflict: (noteId: string, resolution: 'remote' | 'local') => void
  /** Force refresh a specific note from server */
  refreshNote: (noteId: string) => Promise<void>
  /** Connection control */
  connect: () => void
  disconnect: () => void
}

const DEFAULT_OPTIONS: Required<Omit<RealtimeSyncOptions, 'onRemoteChange' | 'onSyncConflict' | 'conflictResolver'>> = {
  enabled: true,
}

export function useRealtimeSync(
  currentNoteId: string | null,
  autosaveStatus: AutosaveStatus,
  hasUnsavedChanges: boolean,
  options: RealtimeSyncOptions = {}
): RealtimeSyncResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const queryClient = useQueryClient()
  
  // State management
  const [isConnected, setIsConnected] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [conflicts, setConflicts] = useState<Array<{
    id: string
    remoteNote: Note
    localNote: Note
    timestamp: Date
  }>>([])
  
  // Refs for stable references
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null)
  const isManuallyDisconnectedRef = useRef(false)

  // Helper function to resolve conflicts
  const defaultConflictResolver = useCallback((
    remoteNote: Note, 
    localNote: Note, 
    hasUnsavedChanges: boolean
  ): 'remote' | 'local' | 'manual' => {
    // If user has unsaved changes, require manual resolution
    if (hasUnsavedChanges) {
      return 'manual'
    }
    
    // If timestamps are available, prefer newer version
    if (remoteNote.updated && localNote.updated) {
      const remoteTime = new Date(remoteNote.updated).getTime()
      const localTime = new Date(localNote.updated).getTime()
      
      // If remote is significantly newer (>5 seconds), use remote
      if (remoteTime > localTime + 5000) {
        return 'remote'
      }
    }
    
    // Default to manual resolution for safety
    return 'manual'
  }, [])

  // Handle remote change events
  const handleRemoteChange = useCallback((event: any) => {
    console.log('🔄 Raw real-time event received:', event)
    
    // PocketBase sends events in this format: { action: string, record: object }
    const action = event.action
    const remoteNote = event.record
    
    if (!action || !remoteNote) {
      console.error('❌ Invalid real-time event format:', event)
      return
    }
    
    console.log('🔄 Processing real-time event:', { action, noteId: remoteNote.id, title: remoteNote.title })
    
    // Normalize image URLs in the remote note and ensure proper typing
    const normalizedRemoteNote = {
      id: remoteNote.id,
      title: remoteNote.title || 'Untitled',
      content: normalizeImageUrls(remoteNote.content || ''),
      user: remoteNote.user,
      created: remoteNote.created,
      updated: remoteNote.updated,
      pinned: remoteNote.pinned || false,
    } as Note
    
    console.log('✅ Successfully normalized remote note:', { id: normalizedRemoteNote.id, title: normalizedRemoteNote.title })
    setLastSync(new Date())
    
    if (action === 'delete') {
      // Handle note deletion
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
        oldNotes.filter(n => n.id !== remoteNote.id)
      )
      
      // Remove from cache if it was cached
      queryClient.removeQueries({ queryKey: ['note', remoteNote.id] })
      
      options.onRemoteChange?.(event)
      return
    }
    
    if (action === 'create') {
      // Handle new note creation
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
        const existingNote = oldNotes.find(n => n.id === remoteNote.id)
        if (existingNote) {
          // Update existing note
          return oldNotes.map(n => n.id === remoteNote.id ? normalizedRemoteNote : n)
        } else {
          // Add new note
          return [normalizedRemoteNote, ...oldNotes]
        }
      })
      
      // Update individual note cache
      queryClient.setQueryData(['note', remoteNote.id], normalizedRemoteNote)
      
      options.onRemoteChange?.(event)
      return
    }
    
    if (action === 'update') {
      // Get current local version
      const localNote = queryClient.getQueryData<Note>(['note', remoteNote.id])
      
      // If this is the currently open note and there are unsaved changes, handle conflict
      if (remoteNote.id === currentNoteId && hasUnsavedChanges && localNote) {
        const resolver = options.conflictResolver || defaultConflictResolver
        const resolution = resolver(normalizedRemoteNote, localNote, hasUnsavedChanges)
        
        if (resolution === 'manual') {
          // Add to conflicts for manual resolution
          setConflicts(prev => {
            // Remove existing conflict for this note if any
            const filtered = prev.filter(c => c.id !== remoteNote.id)
            return [...filtered, {
              id: remoteNote.id,
              remoteNote: normalizedRemoteNote,
              localNote,
              timestamp: new Date()
            }]
          })
          
          options.onSyncConflict?.(normalizedRemoteNote, localNote)
          return
        } else if (resolution === 'local') {
          // Keep local version, ignore remote
          console.log('🔄 Conflict resolved: keeping local version')
          return
        }
        // Fall through to use remote version
      }
      
      // Update notes list
      console.log('🔄 Updating notes list in React Query cache...')
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
        const updatedNotes = oldNotes.map(n => n.id === remoteNote.id ? normalizedRemoteNote : n)
        console.log('✅ Notes list updated, found note to update:', oldNotes.some(n => n.id === remoteNote.id))
        return updatedNotes
      })
      
      // Update individual note cache
      console.log('🔄 Updating individual note cache for note:', remoteNote.id)
      queryClient.setQueryData(['note', remoteNote.id], normalizedRemoteNote)
      console.log('✅ Individual note cache updated')
      
      // Invalidate queries to trigger re-renders
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['note', remoteNote.id] })
      console.log('✅ Queries invalidated to trigger re-render')
      
      options.onRemoteChange?.(event)
    }
  }, [currentNoteId, hasUnsavedChanges, options, queryClient, defaultConflictResolver])

  // Connect to real-time updates
  const connect = useCallback(() => {
    if (!opts.enabled || !pb.authStore.isValid) {
      console.log('⏸️ Real-time sync disabled or user not authenticated')
      setIsConnected(false)
      return
    }
    
    // Don't connect if already connected
    if (unsubscribeRef.current) {
      console.log('🔄 Already connected to real-time sync')
      setIsConnected(true) // Ensure state is correct
      return
    }
    
    console.log('🚀 Connecting to real-time sync for notes collection')
    isManuallyDisconnectedRef.current = false
    
    // Subscribe to all notes changes for the authenticated user
    console.log('🔗 Attempting PocketBase real-time subscription to collection:', notesCollection)
    console.log('🔗 Auth state:', { isValid: pb.authStore.isValid, userId: pb.authStore.model?.id })
    
    try {
      // PocketBase subscribe method
      pb.collection(notesCollection).subscribe('*', (event) => {
        console.log('🔄 Real-time event received in useRealtimeSync:', event)
        handleRemoteChange(event)
      })
      
      // Set connected immediately - PocketBase subscription is synchronous
      setIsConnected(true)
      console.log('✅ Real-time subscription successful, connected = true')
      
      unsubscribeRef.current = () => {
        console.log('🔌 Unsubscribing from real-time sync')
        pb.collection(notesCollection).unsubscribe('*')
        setIsConnected(false)
      }
      
      // Start connection health check
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current)
      }
      
      connectionCheckRef.current = setInterval(() => {
        // Simple connectivity check - if PocketBase client seems disconnected, reconnect
        if (!isManuallyDisconnectedRef.current && opts.enabled && pb.authStore.isValid) {
          // The PocketBase client handles reconnection automatically,
          // but we can add additional logic here if needed
        }
      }, 30000) // Check every 30 seconds
      
    } catch (error) {
      console.error('❌ Failed to connect to real-time sync:', error)
      setIsConnected(false)
      
      // Retry connection after a delay
      setTimeout(() => {
        if (!isManuallyDisconnectedRef.current && opts.enabled) {
          connect()
        }
      }, 5000)
    }
  }, [opts.enabled, handleRemoteChange])

  // Disconnect from real-time updates
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from real-time sync')
    isManuallyDisconnectedRef.current = true
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    
    if (connectionCheckRef.current) {
      clearInterval(connectionCheckRef.current)
      connectionCheckRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  // Resolve conflict manually
  const resolveConflict = useCallback((noteId: string, resolution: 'remote' | 'local') => {
    const conflict = conflicts.find(c => c.id === noteId)
    if (!conflict) return
    
    console.log(`🔄 Resolving conflict for note ${noteId}: using ${resolution} version`)
    
    if (resolution === 'remote') {
      // Use remote version
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
        oldNotes.map(n => n.id === noteId ? conflict.remoteNote : n)
      )
      queryClient.setQueryData(['note', noteId], conflict.remoteNote)
    }
    // For 'local', we don't need to do anything as local version is already in cache
    
    // Remove from conflicts
    setConflicts(prev => prev.filter(c => c.id !== noteId))
  }, [conflicts, queryClient])

  // Force refresh a note from server
  const refreshNote = useCallback(async (noteId: string) => {
    try {
      console.log(`🔄 Force refreshing note ${noteId} from server`)
      const freshNote = await pb.collection(notesCollection).getOne(noteId)
      
      const normalizedNote: Note = {
        ...freshNote,
        title: freshNote.title || 'Untitled',
        content: normalizeImageUrls(freshNote.content || '')
      }
      
      // Update caches
      queryClient.setQueryData(['note', noteId], normalizedNote)
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
        oldNotes.map(n => n.id === noteId ? normalizedNote : n)
      )
      
      // Remove any conflicts for this note
      setConflicts(prev => prev.filter(c => c.id !== noteId))
      
      setLastSync(new Date())
      console.log(`✅ Successfully refreshed note ${noteId}`)
    } catch (error) {
      console.error(`❌ Failed to refresh note ${noteId}:`, error)
      throw error
    }
  }, [queryClient])

  // Auto-connect when enabled and authenticated
  useEffect(() => {
    console.log('🔄 useRealtimeSync effect triggered:', { 
      enabled: opts.enabled, 
      authValid: pb.authStore.isValid, 
      manuallyDisconnected: isManuallyDisconnectedRef.current 
    })
    
    if (opts.enabled && pb.authStore.isValid && !isManuallyDisconnectedRef.current) {
      console.log('🚀 Conditions met for connection, connecting...')
      connect()
    } else if (!opts.enabled || !pb.authStore.isValid) {
      console.log('⏸️ Conditions not met, disconnecting...')
      disconnect()
    }
  }, [opts.enabled, pb.authStore.isValid, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 useRealtimeSync cleanup - disconnecting on unmount')
      disconnect()
    }
  }, [disconnect])

  // Listen for auth changes
  useEffect(() => {
    const unsubscribeAuth = pb.authStore.onChange(() => {
      if (pb.authStore.isValid && opts.enabled && !isManuallyDisconnectedRef.current) {
        // Reconnect after auth change
        setTimeout(connect, 1000)
      } else {
        disconnect()
      }
    })

    return unsubscribeAuth
  }, [connect, disconnect, opts.enabled])

  return {
    isConnected,
    lastSync,
    conflicts,
    resolveConflict,
    refreshNote,
    connect,
    disconnect,
  }
} 