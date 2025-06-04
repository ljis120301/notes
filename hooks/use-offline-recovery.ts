import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface OfflineBackup {
  noteId: string
  title: string
  content: string
  timestamp: number
}

export interface OfflineRecoveryOptions {
  /** Show recovery notifications (default: true) */
  showNotifications?: boolean
  /** Auto-apply recovered changes (default: false) */
  autoApply?: boolean
  /** Callback when backups are found */
  onBackupsFound?: (backups: OfflineBackup[]) => void
  /** Callback when backup is applied */
  onBackupApplied?: (backup: OfflineBackup) => void
}

export interface OfflineRecoveryResult {
  /** Available offline backups */
  availableBackups: OfflineBackup[]
  /** Apply a specific backup */
  applyBackup: (backup: OfflineBackup) => void
  /** Dismiss a backup without applying */
  dismissBackup: (backup: OfflineBackup) => void
  /** Clear all backups */
  clearAllBackups: () => void
  /** Check for new backups */
  checkForBackups: () => void
}

const BACKUP_PREFIX = 'autosave_backup_'

export function useOfflineRecovery(
  options: OfflineRecoveryOptions = {}
): OfflineRecoveryResult {
  const {
    showNotifications = true,
    autoApply = false,
    onBackupsFound,
    onBackupApplied,
  } = options

  const [availableBackups, setAvailableBackups] = useState<OfflineBackup[]>([])

  // Get all offline backups from localStorage
  const getBackups = useCallback((): OfflineBackup[] => {
    if (typeof window === 'undefined') return []

    try {
      const backups: OfflineBackup[] = []
      const keys = Object.keys(localStorage).filter(key => key.startsWith(BACKUP_PREFIX))

      keys.forEach(key => {
        try {
          const backup = localStorage.getItem(key)
          if (backup) {
            const parsed = JSON.parse(backup) as OfflineBackup
            // Validate backup structure
            if (parsed.noteId && typeof parsed.timestamp === 'number') {
              backups.push(parsed)
            }
          }
        } catch (error) {
          console.warn('Failed to parse backup:', key, error)
          // Remove corrupted backup
          localStorage.removeItem(key)
        }
      })

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.warn('Failed to get backups:', error)
      return []
    }
  }, [])

  // Check for backups and update state
  const checkForBackups = useCallback(() => {
    const backups = getBackups()
    setAvailableBackups(backups)

    if (backups.length > 0) {
      onBackupsFound?.(backups)

      if (showNotifications && !autoApply) {
        const message = backups.length === 1 
          ? 'Found 1 offline backup from when you were disconnected'
          : `Found ${backups.length} offline backups from when you were disconnected`
        
        toast.info(message, {
          duration: 10000,
          action: {
            label: 'Review',
            onClick: () => {
              // Could trigger a modal or recovery UI
              console.log('Show recovery UI for backups:', backups)
            }
          }
        })
      }

      if (autoApply && backups.length > 0) {
        // Auto-apply the most recent backup
        applyBackup(backups[0])
      }
    }
  }, [getBackups, onBackupsFound, showNotifications, autoApply])

  // Apply a backup
  const applyBackup = useCallback((backup: OfflineBackup) => {
    try {
      // Remove the backup from localStorage
      localStorage.removeItem(`${BACKUP_PREFIX}${backup.noteId}`)
      
      // Update available backups
      setAvailableBackups(prev => prev.filter(b => 
        !(b.noteId === backup.noteId && b.timestamp === backup.timestamp)
      ))

      onBackupApplied?.(backup)

      if (showNotifications) {
        toast.success('Offline changes restored', { duration: 3000 })
      }
    } catch (error) {
      console.error('Failed to apply backup:', error)
      if (showNotifications) {
        toast.error('Failed to restore offline changes')
      }
    }
  }, [onBackupApplied, showNotifications])

  // Dismiss a backup without applying
  const dismissBackup = useCallback((backup: OfflineBackup) => {
    try {
      // Remove the backup from localStorage
      localStorage.removeItem(`${BACKUP_PREFIX}${backup.noteId}`)
      
      // Update available backups
      setAvailableBackups(prev => prev.filter(b => 
        !(b.noteId === backup.noteId && b.timestamp === backup.timestamp)
      ))

      if (showNotifications) {
        toast.info('Offline backup dismissed', { duration: 2000 })
      }
    } catch (error) {
      console.error('Failed to dismiss backup:', error)
    }
  }, [showNotifications])

  // Clear all backups
  const clearAllBackups = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(BACKUP_PREFIX))
      keys.forEach(key => localStorage.removeItem(key))
      setAvailableBackups([])

      if (showNotifications) {
        toast.info('All offline backups cleared', { duration: 2000 })
      }
    } catch (error) {
      console.error('Failed to clear backups:', error)
    }
  }, [showNotifications])

  // Check for backups when coming back online
  useEffect(() => {
    const handleOnline = () => {
      // Small delay to ensure network is stable
      setTimeout(() => {
        checkForBackups()
      }, 1000)
    }

    // Check immediately on mount
    checkForBackups()

    // Listen for online events
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [checkForBackups])

  // Cleanup old backups (older than 7 days) on mount
  useEffect(() => {
    const cleanupOldBackups = () => {
      if (typeof window === 'undefined') return

      try {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(BACKUP_PREFIX))
        const now = Date.now()
        const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

        keys.forEach(key => {
          try {
            const backup = localStorage.getItem(key)
            if (backup) {
              const parsed = JSON.parse(backup) as OfflineBackup
              const age = now - parsed.timestamp
              if (age > maxAge) {
                localStorage.removeItem(key)
                console.log('Cleaned up old backup:', key)
              }
            }
          } catch (error) {
            // If we can't parse the backup, remove it
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('Failed to cleanup old backups:', error)
      }
    }

    cleanupOldBackups()
  }, [])

  return {
    availableBackups,
    applyBackup,
    dismissBackup,
    clearAllBackups,
    checkForBackups,
  }
} 