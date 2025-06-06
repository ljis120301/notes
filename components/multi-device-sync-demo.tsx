"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Wifi, 
  WifiOff, 
  Users, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { IntegratedSyncResult } from '@/hooks/use-integrated-sync'

interface MultiDeviceSyncDemoProps {
  syncResult?: IntegratedSyncResult
}

export function MultiDeviceSyncDemo({ syncResult }: MultiDeviceSyncDemoProps) {
  const [simulatedDevices] = useState([
    { id: 'desktop', name: 'MacBook Pro', icon: Monitor, status: 'connected', lastSync: new Date(Date.now() - 30000) },
    { id: 'phone', name: 'iPhone', icon: Smartphone, status: 'connected', lastSync: new Date(Date.now() - 120000) },
    { id: 'tablet', name: 'iPad', icon: Tablet, status: 'offline', lastSync: new Date(Date.now() - 600000) },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500'
      case 'offline': return 'text-gray-500'
      case 'syncing': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="h-4 w-4" />
      case 'offline': return <WifiOff className="h-4 w-4" />
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />
      default: return <WifiOff className="h-4 w-4" />
    }
  }

  const formatTime = (date: Date) => {
    const now = Date.now()
    const diff = now - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Users className="h-6 w-6" />
          Multi-Device Sync
        </h2>
        <p className="text-muted-foreground">
          Real-time synchronization across all your devices with intelligent conflict resolution
        </p>
      </div>

      {/* Current Sync Status */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Sync Status</CardTitle>
            <CardDescription>
              Live status of your notes synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SyncStatusIndicator 
              syncResult={syncResult} 
              showDetails={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Device Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {simulatedDevices.map((device) => {
          const IconComponent = device.icon
          return (
            <Card key={device.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    <CardTitle className="text-sm">{device.name}</CardTitle>
                  </div>
                  <div className={`flex items-center gap-1 ${getStatusColor(device.status)}`}>
                    {getStatusIcon(device.status)}
                    <Badge 
                      variant={device.status === 'connected' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {device.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground">
                  Last sync: {formatTime(device.lastSync)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enhanced Sync Features</CardTitle>
          <CardDescription>
            What&apos;s new in the multi-device sync system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Real-time Updates</h4>
                <p className="text-xs text-muted-foreground">
                  See changes from other devices instantly without refreshing
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Smart Conflict Resolution</h4>
                <p className="text-xs text-muted-foreground">
                  Automatic resolution when possible, with manual options for complex conflicts
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <WifiOff className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Offline Support</h4>
                <p className="text-xs text-muted-foreground">
                  Continue working offline with automatic sync when connection returns
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Optimized Auto-save</h4>
                <p className="text-xs text-muted-foreground">
                  Intelligent saving that pauses during conflicts and resumes seamlessly
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium text-sm">How Conflict Resolution Works</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• <strong>No unsaved changes:</strong> Newer version from remote device is used automatically</p>
              <p>• <strong>With unsaved changes:</strong> You choose which version to keep via notification</p>
              <p>• <strong>Auto-save paused:</strong> During conflicts to prevent overwriting your choice</p>
              <p>• <strong>Smart timing:</strong> Only conflicts if changes are made within 5 seconds of each other</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Pro Tips</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Use Cmd/Ctrl+S to force an immediate sync</li>
                <li>• Watch for the sync indicator in the top-right corner</li>
                <li>• Conflict notifications will guide you through resolution</li>
                <li>• Your work is always saved locally as a backup</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 