"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pb, notesCollection, foldersCollection, Note, Folder, normalizeImageUrls } from '@/lib/pocketbase'

export interface SimpleRealtimeSyncResult {
  isConnected: boolean
  lastEventTime: Date | null
  connect: () => void
  disconnect: () => void
}

export function useSimpleRealtimeSync(): SimpleRealtimeSyncResult {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false)
  const unsubscribeNotesRef = useRef<(() => void) | null>(null)
  const unsubscribeFoldersRef = useRef<(() => void) | null>(null)
  const queryClient = useQueryClient()
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null)
  const cacheCleanupRef = useRef<NodeJS.Timeout | null>(null)
  
  const MAX_CONNECTION_ATTEMPTS = 3

  // 🩺 Health check to ensure connection stays alive
  const startHealthCheck = useCallback(() => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current)
    }
    
    healthCheckRef.current = setInterval(() => {
      // Check if we haven't received events in a while (5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      const lastEventTimestamp = lastEventTime?.getTime() || 0
      
      if (lastEventTimestamp < fiveMinutesAgo && isConnected) {
        setIsConnected(false)
        if (unsubscribeNotesRef.current) {
          unsubscribeNotesRef.current()
          unsubscribeNotesRef.current = null
        }
        if (unsubscribeFoldersRef.current) {
          unsubscribeFoldersRef.current()
          unsubscribeFoldersRef.current = null
        }
        // Reconnection will be handled by the effect
      }
    }, 60000) // Check every minute
  }, [lastEventTime, isConnected])

  // 🧹 Cache cleanup to prevent memory bloat
  const startCacheCleanup = useCallback(() => {
    if (cacheCleanupRef.current) {
      clearInterval(cacheCleanupRef.current)
    }
    
    cacheCleanupRef.current = setInterval(() => {
      // Clean up old individual note queries to prevent cache bloat
      const cache = queryClient.getQueryCache()
      const queries = cache.getAll()
      
      // Remove individual note queries older than 30 minutes
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
      
      queries.forEach(query => {
        if (query.queryKey[0] === 'note' && 
            query.state.dataUpdatedAt < thirtyMinutesAgo &&
            query.getObserversCount() === 0) {
          queryClient.removeQueries({ queryKey: query.queryKey })
        }
      })
    }, 10 * 60 * 1000) // Clean every 10 minutes
  }, [queryClient])

  const connect = useCallback(async () => {
    if (unsubscribeNotesRef.current || unsubscribeFoldersRef.current) {
      return
    }

    if (!pb.authStore.isValid) {
      return
    }

    if (maxAttemptsReached) {
      return
    }

    try {
      // Subscribe to notes collection
      const unsubscribeNotes = await pb.collection(notesCollection).subscribe('*', (event) => {
        setLastEventTime(new Date())

        try {
          const { action, record } = event
          if (!record || !record.id) {
            return
          }

          const normalizedNote: Note & { profile_id?: string } = {
            id: record.id,
            title: record.title || 'Untitled',
            content: normalizeImageUrls(record.content || ''),
            user: record.user,
            created: record.created,
            updated: record.updated,
            pinned: record.pinned || false,
            folder_id: record.folder_id || undefined,
            profile_id: record.profile_id || undefined,
          }

          if (action === 'update' || action === 'create') {
            // Update individual note cache
            queryClient.setQueryData(['note', record.id], normalizedNote)

            // Update notes list with deduplication
            queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
              const filteredNotes = oldNotes.filter(n => n.id !== record.id)
              if (action === 'create') {
                return [normalizedNote, ...filteredNotes]
              } else {
                const originalIndex = oldNotes.findIndex(n => n.id === record.id)
                if (originalIndex >= 0) {
                  const newNotes = [...filteredNotes]
                  newNotes.splice(originalIndex, 0, normalizedNote)
                  return newNotes
                }
                return [normalizedNote, ...filteredNotes]
              }
            })

            queryClient.invalidateQueries({
              queryKey: ['notes'],
              exact: true,
              refetchType: 'none'
            })

            // Update profile-specific cache so sidebars refresh
            const profileKey = normalizedNote.profile_id || 'no-profile'
            // Ensure note exists in that list and adjust ordering by updated time
            queryClient.setQueryData(['notes-by-profile', profileKey], (oldNotes: Note[] = []) => {
              const others = (oldNotes || []).filter(n => n.id !== record.id)
              const next = [normalizedNote, ...others]
              // Sort pinned first, then by updated desc to keep responsive organization
              return next.sort((a, b) => {
                const aPinned = !!a.pinned
                const bPinned = !!b.pinned
                if (aPinned && !bPinned) return -1
                if (!aPinned && bPinned) return 1
                const at = a.updated ? new Date(a.updated).getTime() : 0
                const bt = b.updated ? new Date(b.updated).getTime() : 0
                return bt - at
              })
            })
            queryClient.invalidateQueries({ queryKey: ['notes-by-profile', profileKey], exact: true, refetchType: 'none' })

            const profileKeyUpd = normalizedNote.profile_id || 'no-profile'
            queryClient.setQueryData(['notes-by-profile', profileKeyUpd], (oldNotes: Note[] = []) => {
              const idx = oldNotes.findIndex(n => n.id === record.id)
              if (idx === -1) return oldNotes // note not in list of another profile
              const newArr = [...oldNotes]
              newArr[idx] = normalizedNote
              // Keep ordering consistent after update
              return newArr.sort((a, b) => {
                const aPinned = !!a.pinned
                const bPinned = !!b.pinned
                if (aPinned && !bPinned) return -1
                if (!aPinned && bPinned) return 1
                const at = a.updated ? new Date(a.updated).getTime() : 0
                const bt = b.updated ? new Date(b.updated).getTime() : 0
                return bt - at
              })
            })
            queryClient.invalidateQueries({ queryKey: ['notes-by-profile', profileKeyUpd], exact: true, refetchType: 'none' })
          } else if (action === 'delete') {
            queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
              oldNotes.filter(n => n.id !== record.id)
            )
            queryClient.removeQueries({ queryKey: ['note', record.id] })
            queryClient.invalidateQueries({ queryKey: ['notes'], exact: true })

            // Remove from profile-specific list
            const profileKeyDel = normalizedNote.profile_id || 'no-profile'
            queryClient.setQueryData(['notes-by-profile', profileKeyDel], (oldNotes: Note[] = []) =>
              oldNotes.filter(n => n.id !== record.id)
            )
            queryClient.invalidateQueries({ queryKey: ['notes-by-profile', profileKeyDel], exact: true, refetchType: 'none' })
          }
        } catch (error) {
          console.error('Simple real-time: Error processing notes event:', error)
        }
      })

      // Subscribe to folders collection
      const unsubscribeFolders = await pb.collection(foldersCollection).subscribe('*', (event) => {
        setLastEventTime(new Date())

        try {
          const { action, record } = event
          if (!record || !record.id) {
            return
          }

          const normalizedFolder: Folder & { profile_id?: string } = {
            id: record.id,
            name: record.name || 'Untitled Folder',
            user: record.user,
            expanded: record.expanded !== undefined ? record.expanded : true,
            created: record.created,
            updated: record.updated,
            profile_id: record.profile_id || undefined,
          }

          if (action === 'update' || action === 'create') {
            queryClient.setQueryData(['folders'], (oldFolders: Folder[] = []) => {
              const filteredFolders = oldFolders.filter(f => f.id !== record.id)
              if (action === 'create') {
                return [...filteredFolders, normalizedFolder].sort((a, b) => a.name.localeCompare(b.name))
              } else {
                const originalIndex = oldFolders.findIndex(f => f.id === record.id)
                if (originalIndex >= 0) {
                  const newFolders = [...filteredFolders]
                  newFolders.splice(originalIndex, 0, normalizedFolder)
                  return newFolders.sort((a, b) => a.name.localeCompare(b.name))
                }
                return [...filteredFolders, normalizedFolder].sort((a, b) => a.name.localeCompare(b.name))
              }
            })

            queryClient.invalidateQueries({
              queryKey: ['folders'],
              exact: true,
              refetchType: 'none'
            })
          } else if (action === 'delete') {
            queryClient.setQueryData(['folders'], (oldFolders: Folder[] = []) =>
              oldFolders.filter(f => f.id !== record.id)
            )
            queryClient.invalidateQueries({ queryKey: ['folders'], exact: true })
          }
        } catch (error) {
          console.error('Simple real-time: Error processing folders event:', error)
        }
      })

      unsubscribeNotesRef.current = unsubscribeNotes
      unsubscribeFoldersRef.current = unsubscribeFolders

      setIsConnected(true)
      setConnectionAttempts(0) // Reset on successful connection

    } catch (error) {
      console.error('Simple real-time: Connection failed:', error)
      
      // Increment connection attempts
      const newAttempts = connectionAttempts + 1
      setConnectionAttempts(newAttempts)
      
      // Check if it's a CORS error
      const errorMessage = (error as any)?.message || ''
      const isCorsError = errorMessage.includes('CORS') || 
                          errorMessage.includes('Cross-Origin') ||
                          errorMessage.includes('Failed to fetch')
      
      if (isCorsError || newAttempts >= MAX_CONNECTION_ATTEMPTS) {
        setMaxAttemptsReached(true)
        console.warn('Simple real-time: Connection permanently disabled due to repeated failures')
        console.warn('Simple real-time: This usually happens with CORS issues across network devices')
        console.warn('Simple real-time: Auto-save will still work, but real-time updates require manual refresh')
      }
      
      setIsConnected(false)
    }
  }, [queryClient, connectionAttempts, maxAttemptsReached, MAX_CONNECTION_ATTEMPTS])

  const disconnect = useCallback(() => {
    // Clean up timers
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current)
      healthCheckRef.current = null
    }
    if (cacheCleanupRef.current) {
      clearInterval(cacheCleanupRef.current)
      cacheCleanupRef.current = null
    }
    
    // Disconnect from real-time
    if (unsubscribeNotesRef.current) {
      unsubscribeNotesRef.current()
      unsubscribeNotesRef.current = null
    }
    if (unsubscribeFoldersRef.current) {
      unsubscribeFoldersRef.current()
      unsubscribeFoldersRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Auto-connect when authenticated
  useEffect(() => {
    if (pb.authStore.isValid) {
      connect()
    } else {
      disconnect()
    }

    // Listen for auth changes
    const unsubscribeAuth = pb.authStore.onChange(() => {
      if (pb.authStore.isValid) {
        setTimeout(connect, 500) // Small delay to ensure auth is stable
      } else {
        disconnect()
      }
    })

    return () => {
      unsubscribeAuth()
      disconnect()
    }
  }, [connect, disconnect])

  // Start health monitoring and cache cleanup when connected
  useEffect(() => {
    if (isConnected) {
      startHealthCheck()
      startCacheCleanup()
    }
    
    return () => {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current)
        healthCheckRef.current = null
      }
      if (cacheCleanupRef.current) {
        clearInterval(cacheCleanupRef.current)
        cacheCleanupRef.current = null
      }
    }
  }, [isConnected, startHealthCheck, startCacheCleanup])

  // Auto-reconnect when connection is lost (but auth is still valid)
  useEffect(() => {
    if (!isConnected && pb.authStore.isValid && !maxAttemptsReached) {
      const reconnectTimer = setTimeout(() => {
        connect()
      }, 5000) // Try to reconnect after 5 seconds
      
      return () => clearTimeout(reconnectTimer)
    }
  }, [isConnected, connect, maxAttemptsReached])

  return {
    isConnected,
    lastEventTime,
    connect,
    disconnect,
  }
} 