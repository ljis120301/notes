import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Auto-save backup utilities
export const backupUtils = {
  // Clean up old note backups (older than 24 hours)
  cleanupOldBackups: () => {
    if (typeof window === 'undefined') return
    
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('note-backup-'))
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      keys.forEach(key => {
        try {
          const backup = localStorage.getItem(key)
          if (backup) {
            const parsed = JSON.parse(backup)
            const age = now - parsed.timestamp
            if (age > maxAge) {
              localStorage.removeItem(key)
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
  },

  // Get all backup keys for debugging
  getAllBackupKeys: () => {
    if (typeof window === 'undefined') return []
    return Object.keys(localStorage).filter(key => key.startsWith('note-backup-'))
  },

  // Get storage usage info
  getStorageInfo: () => {
    if (typeof window === 'undefined') return { used: 0, total: 0 }
    
    try {
      const total = 5 * 1024 * 1024 // 5MB typical localStorage limit
      const used = new Blob(Object.values(localStorage)).size
      return { used, total, percentage: (used / total) * 100 }
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 }
    }
  }
}
