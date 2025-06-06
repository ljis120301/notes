"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { pb, notesCollection, Note, normalizeImageUrls } from '@/lib/pocketbase'

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
  const unsubscribeRef = useRef<(() => void) | null>(null)
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
         console.log('Simple real-time: No events received recently, reconnecting...')
         setIsConnected(false)
         if (unsubscribeRef.current) {
           unsubscribeRef.current()
           unsubscribeRef.current = null
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
      
      console.log('Simple real-time: Cache cleanup completed')
    }, 10 * 60 * 1000) // Clean every 10 minutes
  }, [queryClient])

  const connect = useCallback(async () => {
    if (unsubscribeRef.current) {
      console.log('Simple real-time: Already connected, skipping')
      return
    }

    if (!pb.authStore.isValid) {
      console.log('Simple real-time: Not authenticated, skipping connection')
      return
    }

    if (maxAttemptsReached) {
      console.log('Simple real-time: Max connection attempts reached, skipping')
      return
    }

    try {
      console.log('Simple real-time: Attempting to connect to:', pb.baseUrl)
      const unsubscribe = await pb.collection(notesCollection).subscribe('*', (event) => {
        setLastEventTime(new Date())
        
        // Process the event
        try {
          const { action, record } = event
          
          if (!record || !record.id) {
            return
          }

          // Normalize the note
          const normalizedNote: Note = {
            id: record.id,
            title: record.title || 'Untitled',
            content: normalizeImageUrls(record.content || ''),
            user: record.user,
            created: record.created,
            updated: record.updated,
            pinned: record.pinned || false,
          }

          if (action === 'update' || action === 'create') {
            // Always update individual note cache with real-time data (server is source of truth)
            queryClient.setQueryData(['note', record.id], normalizedNote)
            
            // Update notes list with careful deduplication
            queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
              // Remove any existing instance first to prevent duplicates
              const filteredNotes = oldNotes.filter(n => n.id !== record.id)
              
              if (action === 'create') {
                // For new notes, only add if it's truly new (not already in cache)
                const existingNote = oldNotes.find(n => n.id === record.id)
                if (existingNote) {
                  // Note already exists (created locally), just update it in-place
                  const originalIndex = oldNotes.findIndex(n => n.id === record.id)
                  if (originalIndex >= 0) {
                    const newNotes = [...oldNotes]
                    newNotes[originalIndex] = normalizedNote
                    return newNotes
                  }
                }
                // Truly new note, add to the beginning
                return [normalizedNote, ...filteredNotes]
              } else {
                // For updates, always apply the real-time version (server is source of truth)
                const originalIndex = oldNotes.findIndex(n => n.id === record.id)
                if (originalIndex >= 0) {
                  const newNotes = [...filteredNotes]
                  newNotes.splice(originalIndex, 0, normalizedNote)
                  return newNotes
                } else {
                  // If not found, add to beginning (shouldn't happen for updates)
                  return [normalizedNote, ...filteredNotes]
                }
              }
            })
            
            // Minimal invalidation to trigger UI updates
            queryClient.invalidateQueries({ 
              queryKey: ['notes'], 
              exact: true,
              refetchType: 'none' // Don't refetch, just mark as stale
            })
          } else if (action === 'delete') {
            // Remove from notes list
            queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
              oldNotes.filter(n => n.id !== record.id)
            )
            
            // Remove from individual cache
            queryClient.removeQueries({ queryKey: ['note', record.id] })
            
            // Invalidate notes list
            queryClient.invalidateQueries({ queryKey: ['notes'], exact: true })
          }
        } catch (error) {
          console.error('Simple real-time: Error processing event:', error)
        }
      })

      unsubscribeRef.current = unsubscribe
      setIsConnected(true)
      setConnectionAttempts(0) // Reset on successful connection
      console.log('Simple real-time: Successfully connected!')

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
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
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
        console.log('Simple real-time: Attempting auto-reconnect...')
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