"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Wifi, 
  WifiOff, 
  Zap, 
  AlertTriangle, 
  RotateCcw,
  Save
} from 'lucide-react'
import { useAutosave } from '@/hooks/use-autosave'
import { useOfflineRecovery } from '@/hooks/use-offline-recovery'
import { AutosaveStatusIndicator } from '@/components/autosave-status'
import { toast } from 'sonner'

// Mock note ID for demo
const DEMO_NOTE_ID = 'demo-note-123'

// Simulate network conditions
const simulateOffline = () => {
  window.dispatchEvent(new Event('offline'))
}

const simulateOnline = () => {
  window.dispatchEvent(new Event('online'))
}

const simulateSlowNetwork = () => {
  toast.info('Simulating slow network...', { duration: 2000 })
}

const simulateServerError = () => {
  toast.error('Simulating server error...', { duration: 2000 })
}

export function AutosaveDemo() {
  const [title, setTitle] = useState('Demo Note Title')
  const [content, setContent] = useState('Start typing to see autosave in action...\n\nThis demo showcases:\n• Debounced saving (2 second delay)\n• Network error handling\n• Offline support with local backup\n• Conflict resolution\n• Manual save controls\n• Status indicators\n\nTry editing this text!')

  // Initialize autosave
  const autosave = useAutosave(DEMO_NOTE_ID, title, content, {
    delay: 2000,
    maxRetries: 3,
    enableOfflineSupport: true,
    onSaveSuccess: (note) => {
      console.log('Demo save success:', note)
    },
    onSaveError: (error) => {
      console.log('Demo save error:', error)
    },
    onStatusChange: (status) => {
      console.log('Demo status change:', status)
    }
  })

  // Initialize offline recovery
  const recovery = useOfflineRecovery({
    showNotifications: true,
    onBackupsFound: (backups) => {
      console.log('Demo backups found:', backups)
    },
    onBackupApplied: (backup) => {
      setTitle(backup.title)
      setContent(backup.content)
      toast.success(`Restored backup from ${new Date(backup.timestamp).toLocaleString()}`)
    }
  })

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }, [])

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }, [])

  const clearDemo = useCallback(() => {
    setTitle('Demo Note Title')
    setContent('Start typing to see autosave in action...')
    recovery.clearAllBackups()
    toast.info('Demo reset')
  }, [recovery])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Autosave Feature Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of the Google Docs-style autosave functionality
        </p>
      </div>

      {/* Network Simulation Controls */}
      <div className="p-6 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Network Simulation
        </h2>
        <p className="text-muted-foreground mb-4">
          Test autosave behavior under different network conditions
        </p>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={simulateOffline}
            className="flex items-center gap-2"
          >
            <WifiOff className="h-4 w-4" />
            Go Offline
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={simulateOnline}
            className="flex items-center gap-2"
          >
            <Wifi className="h-4 w-4" />
            Go Online
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={simulateSlowNetwork}
          >
            Slow Network
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={simulateServerError}
          >
            Server Error
          </Button>
        </div>
      </div>

      {/* Autosave Status */}
      <div className="p-6 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Autosave Status</h2>
        <div className="space-y-4">
          {/* Full status indicator */}
          <div className="flex items-center justify-between">
            <AutosaveStatusIndicator
              status={autosave.status}
              hasUnsavedChanges={autosave.hasUnsavedChanges}
              isPaused={autosave.isPaused}
              onSaveNow={autosave.saveNow}
              onRetry={autosave.resetError}
              onTogglePause={() => autosave.setPaused(!autosave.isPaused)}
              showPauseButton={true}
              showSaveButton={true}
            />
            
            {/* Manual controls */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={autosave.saveNow}
                disabled={!autosave.hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearDemo}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset Demo
              </Button>
            </div>
          </div>

          {/* Status details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Status</div>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                autosave.status.status === 'saved' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {autosave.status.status}
              </span>
            </div>
            <div>
              <div className="font-medium">Unsaved Changes</div>
              <div className={autosave.hasUnsavedChanges ? 'text-orange-500' : 'text-green-500'}>
                {autosave.hasUnsavedChanges ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <div className="font-medium">Retry Count</div>
              <div>{autosave.status.retryCount}</div>
            </div>
            <div>
              <div className="font-medium">Last Saved</div>
              <div className="text-muted-foreground">
                {autosave.status.lastSaved ? autosave.status.lastSaved.toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Recovery */}
      {recovery.availableBackups.length > 0 && (
        <div className="p-6 border border-orange-200 bg-orange-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Offline Backups Found
          </h2>
          <p className="text-muted-foreground mb-4">
            Changes were saved locally while you were offline
          </p>
          <div className="space-y-2">
            {recovery.availableBackups.map((backup) => (
              <div key={`${backup.noteId}-${backup.timestamp}`} className="flex items-center justify-between p-3 bg-white border rounded">
                <div>
                  <div className="font-medium">{backup.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Saved {new Date(backup.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => recovery.applyBackup(backup)}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => recovery.dismissBackup(backup)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Demo */}
      <div className="p-6 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Demo Editor</h2>
        <p className="text-muted-foreground mb-4">
          Start typing to see autosave in action. Changes are debounced and saved automatically.
        </p>
        <div className="space-y-4">
          {/* Title input */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter note title..."
            />
          </div>

          <Separator />

          {/* Content textarea */}
          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={content}
              onChange={handleContentChange}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Start typing your note content..."
            />
          </div>

          {/* Compact status indicator */}
          <div className="flex items-center justify-between">
            <AutosaveStatusIndicator
              status={autosave.status}
              hasUnsavedChanges={autosave.hasUnsavedChanges}
              isPaused={autosave.isPaused}
              onSaveNow={autosave.saveNow}
              onRetry={autosave.resetError}
              onTogglePause={() => autosave.setPaused(!autosave.isPaused)}
              compact={true}
            />
            
            <div className="text-xs text-muted-foreground">
              Content length: {content.length} characters
            </div>
          </div>
        </div>
      </div>

      {/* Feature List */}
      <div className="p-6 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Features Demonstrated</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Core Features</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Debounced auto-save (2 second delay)</li>
              <li>• Visual status indicators</li>
              <li>• Manual save controls</li>
              <li>• Pause/resume functionality</li>
              <li>• Keyboard shortcuts (Ctrl+S)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Advanced Features</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Offline support with local backup</li>
              <li>• Network error handling</li>
              <li>• Exponential backoff retry</li>
              <li>• Conflict detection</li>
              <li>• Recovery notifications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 