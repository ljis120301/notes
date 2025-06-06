"use client"

import React from 'react'
import { AlertCircle, CheckCircle, Cloud, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { IntegratedSyncResult } from '@/hooks/use-integrated-sync'
import { formatDistanceToNow } from 'date-fns'

interface SyncStatusIndicatorProps {
  syncResult: IntegratedSyncResult
  className?: string
  showDetails?: boolean
}

export function SyncStatusIndicator({ 
  syncResult, 
  className = '',
  showDetails = false 
}: SyncStatusIndicatorProps) {
  const { syncStatus, conflicts, lastSync, forceSync, resolveAllConflicts } = syncResult

  // Get status icon and color
  const getStatusIcon = () => {
    switch (syncStatus.overall) {
      case 'synced':
        // Show wifi icon if real-time connected, check icon otherwise
        if (syncStatus.realtime.connected) {
          return <Wifi className="h-4 w-4 text-green-500" />
        }
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'saving':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'conflicts':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-500" />
      default:
        return <Cloud className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (syncStatus.overall) {
      case 'synced':
        // Show more detail for synced state
        if (syncStatus.realtime.connected) {
          return syncResult.hasUnsavedChanges ? 'Live • Changes' : 'Live • Synced'
        } else {
          return syncResult.hasUnsavedChanges ? 'Changes' : 'Synced'
        }
      case 'saving':
        return 'Saving...'
      case 'conflicts':
        return `${conflicts.length} Conflict${conflicts.length > 1 ? 's' : ''}`
      case 'error':
        return 'Sync Error'
      case 'offline':
        return 'Offline'
      default:
        return 'Unknown'
    }
  }

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (syncStatus.overall) {
      case 'synced':
        return 'default'
      case 'saving':
        return 'secondary'
      case 'conflicts':
        return 'outline'
      case 'error':
        return 'destructive'
      case 'offline':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getTooltipContent = () => {
    const parts = []
    
    // Real-time status (show first since it's most important now)
    if (syncStatus.realtime.connected) {
      parts.push(`✅ Real-time sync: Connected`)
      if (syncStatus.realtime.lastSync) {
        parts.push(`Last update: ${formatDistanceToNow(syncStatus.realtime.lastSync, { addSuffix: true })}`)
      }
    } else {
      parts.push(`📡 Real-time sync: Disconnected`)
      parts.push(`(Changes sync on save)`)
    }
    
    // Autosave status
    const autosaveText = syncStatus.autosave.status === 'saved' 
      ? `💾 Auto-save: Up to date`
      : `💾 Auto-save: ${syncStatus.autosave.status}`
    parts.push(autosaveText)
    
    // Last saved time
    if (syncStatus.autosave.lastSaved) {
      parts.push(`Last saved: ${formatDistanceToNow(syncStatus.autosave.lastSaved, { addSuffix: true })}`)
    }
    
    // Unsaved changes indicator
    if (syncResult.hasUnsavedChanges) {
      parts.push(`⚠️ Unsaved changes`)
    }
    
    // Conflicts
    if (conflicts.length > 0) {
      parts.push(`❌ ${conflicts.length} unresolved conflict${conflicts.length > 1 ? 's' : ''}`)
    }
    
    return parts.join('\n')
  }

  // Compact indicator (default)
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              {getStatusIcon()}
              <Badge variant={getStatusVariant()} className="text-xs">
                {getStatusText()}
              </Badge>
              {conflicts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => forceSync()}
                  className="h-6 px-2 text-xs"
                >
                  Refresh
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="whitespace-pre-line text-sm">
              {getTooltipContent()}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Detailed view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-sm">Sync Status</CardTitle>
          </div>
          <Badge variant={getStatusVariant()}>{getStatusText()}</Badge>
        </div>
        {lastSync && (
          <CardDescription className="text-xs">
            Last synced {formatDistanceToNow(lastSync, { addSuffix: true })}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Auto-save Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Auto-save</span>
            <div className="flex items-center gap-2">
              {syncStatus.autosave.status === 'saving' && (
                <RefreshCw className="h-3 w-3 animate-spin" />
              )}
              <span className="capitalize">{syncStatus.autosave.status}</span>
            </div>
          </div>
          {syncStatus.autosave.lastSaved && (
            <p className="text-xs text-muted-foreground">
              Last saved {formatDistanceToNow(syncStatus.autosave.lastSaved, { addSuffix: true })}
            </p>
          )}
          {syncStatus.autosave.errorMessage && (
            <p className="text-xs text-red-500">{syncStatus.autosave.errorMessage}</p>
          )}
        </div>

        <Separator />

        {/* Real-time Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Real-time sync</span>
            <div className="flex items-center gap-2">
              {syncStatus.realtime.connected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-gray-500" />
              )}
              <span>{syncStatus.realtime.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Conflicts Section */}
        {conflicts.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sync Conflicts</AlertTitle>
                <AlertDescription>
                  {conflicts.length} note{conflicts.length > 1 ? 's have' : ' has'} conflicting changes from another device.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="p-3 border rounded-lg space-y-2">
                    <div className="font-medium text-sm">
                      {conflict.localNote.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Conflict detected {formatDistanceToNow(conflict.timestamp, { addSuffix: true })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncResult.resolveConflict(conflict.id, 'remote')}
                        className="text-xs"
                      >
                        Keep Remote
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncResult.resolveConflict(conflict.id, 'local')}
                        className="text-xs"
                      >
                        Keep Local
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {conflicts.length > 1 && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveAllConflicts('remote')}
                    className="text-xs"
                  >
                    Keep All Remote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveAllConflicts('local')}
                    className="text-xs"
                  >
                    Keep All Local
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => forceSync()}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Force Sync
          </Button>
          
          {(syncStatus.overall === 'error' || !syncStatus.realtime.connected) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncResult.connect()}
              className="text-xs"
            >
              Reconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 