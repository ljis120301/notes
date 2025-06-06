# Multi-Device Sync System

This document explains the enhanced multi-device synchronization system that seamlessly integrates real-time updates with the existing auto-save functionality.

## Overview

The new sync system addresses the edge case where users work on the same note across multiple devices simultaneously. Instead of requiring page refreshes to see changes from other devices, the system now provides:

- **Real-time synchronization** using PocketBase's Server-Sent Events (SSE)
- **Intelligent conflict resolution** with automatic and manual options
- **Enhanced user experience** with visual feedback and notifications
- **Seamless integration** with existing auto-save without breaking functionality

## Architecture

### Three-Layer System

1. **Autosave Layer** (`use-autosave.ts`)
   - Handles local content changes and debounced saving
   - Manages offline support and retry logic
   - Provides status feedback and error handling

2. **Real-time Sync Layer** (`use-realtime-sync.ts`)
   - Connects to PocketBase real-time subscriptions
   - Detects changes from other devices
   - Manages conflict detection and resolution

3. **Integrated Layer** (`use-integrated-sync.ts`)
   - Orchestrates autosave and real-time sync
   - Provides unified status and conflict management
   - Handles notifications and user interactions

## Key Features

### Real-time Updates

Changes made on other devices appear instantly without requiring a page refresh:

```typescript
// Automatic subscription to note changes
pb.collection('notes').subscribe('*', (event) => {
  // Handle create, update, delete events
  // Update React Query cache automatically
  // Show notifications for remote changes
})
```

### Smart Conflict Resolution

The system uses a three-tier approach to handle conflicts:

1. **Automatic Resolution** (when safe)
   - No unsaved local changes + remote is newer → Use remote version
   - Timestamp-based decision making (5-second threshold)

2. **Manual Resolution** (when uncertain)
   - User has unsaved changes → Show conflict dialog
   - Equal timestamps → User chooses which version to keep

3. **Pause Protection**
   - Auto-save pauses during conflicts to prevent overwrites
   - Resumes automatically after resolution

### Offline Support

Enhanced offline capabilities with local storage backup:

```typescript
// Automatic backup during offline periods
if (isOffline) {
  localStorage.setItem(`autosave_backup_${noteId}`, JSON.stringify({
    title, content, timestamp: Date.now()
  }))
}

// Automatic sync when back online
window.addEventListener('online', () => {
  if (hasUnsavedChanges) {
    performSync()
  }
})
```

## Usage

### Basic Integration

Replace the existing autosave hook with the integrated sync hook:

```typescript
// Before
const autosave = useAutosave(noteId, title, content, options)

// After
const integratedSync = useIntegratedSync(noteId, title, content, {
  ...options,
  showRemoteChangeNotifications: true,
  autoResolveConflicts: true,
  pauseAutosaveOnConflict: true,
})
```

### Status Indicator

Use the enhanced sync status indicator for better user feedback:

```typescript
import { SyncStatusIndicator } from '@/components/sync-status-indicator'

// Compact mode for headers
<SyncStatusIndicator 
  syncResult={integratedSync}
  showDetails={false}
/>

// Detailed mode for settings/debug panels
<SyncStatusIndicator 
  syncResult={integratedSync}
  showDetails={true}
/>
```

### Notification Handling

The system provides rich notifications for sync events:

```typescript
const integratedSync = useIntegratedSync(noteId, title, content, {
  onNotification: (notification) => {
    switch (notification.type) {
      case 'warning': // Conflict detected
        toast.warning(notification.message, {
          action: notification.actions?.[0]
        })
        break
      case 'info': // Remote change notification
        toast.info(notification.message)
        break
      case 'success': // Conflict resolved
        toast.success(notification.message)
        break
    }
  }
})
```

## API Reference

### IntegratedSyncOptions

```typescript
interface IntegratedSyncOptions {
  // Autosave options
  delay?: number                    // Debounce delay (default: 5000ms)
  maxRetries?: number              // Max retry attempts (default: 3)
  enableOfflineSupport?: boolean   // Local storage backup (default: true)
  
  // Real-time sync options
  enabled?: boolean                // Enable real-time sync (default: true)
  showRemoteChangeNotifications?: boolean  // Show toast for remote changes
  autoResolveConflicts?: boolean   // Auto-resolve when safe (default: true)
  pauseAutosaveOnConflict?: boolean // Pause autosave during conflicts
  
  // Callbacks
  onSyncEvent?: (event) => void    // Sync event notifications
  onNotification?: (notification) => void  // User notifications
  isChanged?: (current, previous) => boolean  // Custom change detection
}
```

### IntegratedSyncResult

```typescript
interface IntegratedSyncResult {
  // Autosave properties
  status: AutosaveStatus
  hasUnsavedChanges: boolean
  saveNow: () => void
  resetError: () => void
  setPaused: (paused: boolean) => void
  isPaused: boolean
  
  // Real-time sync properties
  isConnected: boolean
  lastSync: Date | null
  conflicts: Conflict[]
  resolveConflict: (noteId, resolution) => void
  refreshNote: (noteId) => Promise<void>
  connect: () => void
  disconnect: () => void
  
  // Enhanced integrated properties
  syncStatus: SyncStatus           // Unified status object
  forceSync: () => Promise<void>   // Force immediate sync
  resolveAllConflicts: (resolution) => void  // Bulk conflict resolution
  pauseAllSync: () => void         // Pause both autosave and real-time
  resumeAllSync: () => void        // Resume both systems
}
```

### SyncStatus

```typescript
interface SyncStatus {
  autosave: AutosaveStatus
  realtime: {
    connected: boolean
    lastSync: Date | null
    hasConflicts: boolean
    conflictCount: number
  }
  overall: 'synced' | 'saving' | 'conflicts' | 'error' | 'offline'
}
```

## Conflict Resolution Flow

### Automatic Resolution

1. Remote change detected
2. Check if local user has unsaved changes
3. If no unsaved changes:
   - Compare timestamps
   - Use newer version automatically
   - Update local cache
   - Show brief notification

### Manual Resolution

1. Remote change detected with local unsaved changes
2. Pause auto-save to prevent overwrites
3. Show conflict notification with options:
   - "Keep Remote Version" - Use remote, discard local
   - "Keep Local Version" - Ignore remote, keep local
4. User selects resolution
5. Apply choice and resume auto-save
6. Show success confirmation

### Conflict Prevention

- **5-second threshold**: Only conflicts if changes occur within 5 seconds
- **Smart detection**: Considers content length and structural changes
- **Auto-save pause**: Prevents accidental overwrites during resolution
- **Local backup**: Always maintains local copy as fallback

## Best Practices

### Performance Optimization

1. **Debouncing**: Use appropriate delays for your use case
   ```typescript
   delay: 3000  // 3 seconds - good balance for most cases
   ```

2. **Change Detection**: Implement smart change detection
   ```typescript
   isChanged: (current, previous) => {
     // Only save on meaningful changes
     return Math.abs(current.length - previous.length) > 10 ||
            current.split('\n').length !== previous.split('\n').length
   }
   ```

3. **Connection Management**: Handle network changes gracefully
   ```typescript
   // System automatically reconnects, but you can force it
   if (!integratedSync.isConnected) {
     integratedSync.connect()
   }
   ```

### User Experience

1. **Visual Feedback**: Always show sync status
   ```typescript
   <SyncStatusIndicator syncResult={integratedSync} />
   ```

2. **Keyboard Shortcuts**: Provide manual sync option
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e) => {
       if ((e.ctrlKey || e.metaKey) && e.key === 's') {
         e.preventDefault()
         integratedSync.forceSync()
       }
     }
     window.addEventListener('keydown', handleKeyDown)
     return () => window.removeEventListener('keydown', handleKeyDown)
   }, [integratedSync])
   ```

3. **Error Handling**: Graceful degradation
   ```typescript
   onNotification: (notification) => {
     if (notification.type === 'error') {
       // Show retry options, save to local storage, etc.
     }
   }
   ```

## Migration Guide

### From useAutosave to useIntegratedSync

1. **Update imports**:
   ```typescript
   // Before
   import { useAutosave } from '@/hooks/use-autosave'
   
   // After  
   import { useIntegratedSync } from '@/hooks/use-integrated-sync'
   ```

2. **Update hook usage**:
   ```typescript
   // Before
   const autosave = useAutosave(noteId, title, content, {
     onSaveSuccess: (note) => onSave(note),
     onSaveError: (error) => toast.error(error.message)
   })
   
   // After
   const sync = useIntegratedSync(noteId, title, content, {
     onSyncEvent: (event) => {
       if (event.type === 'autosave_success') onSave(event.data)
     },
     onNotification: (notification) => {
       toast(notification.message, { type: notification.type })
     }
   })
   ```

3. **Update status indicators**:
   ```typescript
   // Before
   <AutosaveStatusIndicator status={autosave.status} />
   
   // After
   <SyncStatusIndicator syncResult={sync} />
   ```

## Troubleshooting

### Common Issues

1. **Connection Problems**
   - Check PocketBase server status
   - Verify authentication token
   - Use `sync.connect()` to manually reconnect

2. **Conflict Resolution Not Working**
   - Ensure `autoResolveConflicts` is enabled
   - Check notification handler implementation
   - Verify conflict resolver logic

3. **Performance Issues**
   - Increase debounce delay
   - Optimize change detection function
   - Consider disabling real-time for large documents

### Debug Mode

Enable detailed logging in development:

```typescript
const sync = useIntegratedSync(noteId, title, content, {
  onSyncEvent: (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sync event:', event)
    }
  }
})
```

## Security Considerations

1. **User Authorization**: PocketBase handles user-based filtering automatically
2. **Data Validation**: All updates go through existing API validation
3. **Connection Security**: Uses secure WebSocket connections (WSS in production)
4. **Local Storage**: Encrypted when possible, cleared on logout

## Future Enhancements

1. **Operational Transforms**: For character-level conflict resolution
2. **Presence Indicators**: Show who else is editing
3. **Change Highlighting**: Visual diff of remote changes
4. **Collaboration Features**: Comments and suggestions
5. **Version History**: Track and restore previous versions

---

This multi-device sync system provides a robust foundation for collaborative editing while maintaining the simplicity and reliability of the existing auto-save functionality. 