"use client"

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Check, 
  Clock, 
  Save, 
  AlertCircle, 
  WifiOff, 
  RefreshCw,
  GitMerge,
  Pause,
  Play
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { type AutosaveStatus as AutosaveStatusType } from '@/hooks/use-autosave'
import { cn } from '@/lib/utils'

interface AutosaveStatusIndicatorProps {
  status: AutosaveStatusType
  hasUnsavedChanges: boolean
  isPaused: boolean
  onSaveNow: () => void
  onRetry: () => void
  onTogglePause: () => void
  className?: string
  showPauseButton?: boolean
  showSaveButton?: boolean
  compact?: boolean
}

const StatusIcon = memo(({ status }: { status: AutosaveStatusType['status'] }) => {
  const iconClass = "h-3 w-3"
  
  switch (status) {
    case 'saving':
      return <Clock className={cn(iconClass, "animate-spin text-blue-500")} />
    case 'saved':
      return <Check className={cn(iconClass, "text-green-500")} />
    case 'error':
      return <AlertCircle className={cn(iconClass, "text-red-500")} />
    case 'offline':
      return <WifiOff className={cn(iconClass, "text-orange-500")} />
    case 'conflict':
      return <GitMerge className={cn(iconClass, "text-purple-500")} />
    default:
      return <Save className={cn(iconClass, "text-muted-foreground")} />
  }
})

StatusIcon.displayName = 'StatusIcon'

const getStatusText = (status: AutosaveStatusType, hasUnsavedChanges: boolean, isPaused: boolean): string => {
  if (isPaused) return 'Autosave paused'
  
  switch (status.status) {
    case 'saving':
      return 'Saving...'
    case 'saved':
      return status.lastSaved 
        ? `Saved ${formatDistanceToNow(status.lastSaved, { addSuffix: true })}`
        : 'Saved'
    case 'error':
      return status.canRetry 
        ? `Save failed (retry ${status.retryCount}/${3})`
        : 'Save failed'
    case 'offline':
      return 'Offline - will save when reconnected'
    case 'conflict':
      return 'Conflict detected - manual save required'
    case 'idle':
    default:
      return hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'
  }
}

const getStatusColor = (status: AutosaveStatusType['status'], hasUnsavedChanges: boolean, isPaused: boolean): string => {
  if (isPaused) return 'text-gray-500'
  
  switch (status) {
    case 'saving':
      return 'text-blue-500'
    case 'saved':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'offline':
      return 'text-orange-500'
    case 'conflict':
      return 'text-purple-500'
    case 'idle':
    default:
      return hasUnsavedChanges ? 'text-orange-500' : 'text-muted-foreground'
  }
}

const getTooltipContent = (status: AutosaveStatusType, hasUnsavedChanges: boolean, isPaused: boolean): string => {
  if (isPaused) {
    return 'Autosave is paused. Click to resume or save manually.'
  }
  
  let content = getStatusText(status, hasUnsavedChanges, isPaused)
  
  if (status.errorMessage) {
    content += `\n\nError: ${status.errorMessage}`
  }
  
  switch (status.status) {
    case 'saving':
      content += '\n\nYour changes are being saved...'
      break
    case 'saved':
      content += '\n\nAll changes have been saved successfully.'
      break
    case 'error':
      if (status.canRetry) {
        content += '\n\nClick to retry saving now.'
      } else {
        content += '\n\nManual save required.'
      }
      break
    case 'offline':
      content += '\n\nChanges are backed up locally and will be saved when you\'re back online.'
      break
    case 'conflict':
      content += '\n\nSomeone else may have edited this note. Please save manually to resolve.'
      break
    case 'idle':
      if (hasUnsavedChanges) {
        content += '\n\nChanges will be saved automatically in a moment.'
      } else {
        content += '\n\nYour notes are automatically saved as you type.'
      }
      break
  }
  
  return content
}

export const AutosaveStatusIndicator = memo(function AutosaveStatusIndicator({
  status,
  hasUnsavedChanges,
  isPaused,
  onSaveNow,
  onRetry,
  onTogglePause,
  className,
  showPauseButton = true,
  showSaveButton = true,
  compact = false,
}: AutosaveStatusIndicatorProps) {
  const statusText = getStatusText(status, hasUnsavedChanges, isPaused)
  const statusColor = getStatusColor(status.status, hasUnsavedChanges, isPaused)
  const tooltipContent = getTooltipContent(status, hasUnsavedChanges, isPaused)

  const handleClick = useCallback(() => {
    if (isPaused) {
      onTogglePause()
    } else if (status.status === 'error' && status.canRetry) {
      onRetry()
    } else if (hasUnsavedChanges) {
      onSaveNow()
    }
  }, [isPaused, status.status, status.canRetry, hasUnsavedChanges, onTogglePause, onRetry, onSaveNow])

  const isClickable = isPaused || (status.status === 'error' && status.canRetry) || hasUnsavedChanges

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={isClickable ? handleClick : undefined}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                statusColor,
                isClickable && "hover:opacity-70 cursor-pointer",
                !isClickable && "cursor-default",
                className
              )}
            >
              <StatusIcon status={status.status} />
              <span className="sr-only">{statusText}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="whitespace-pre-line text-sm">{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={isClickable ? handleClick : undefined}
              className={cn(
                "flex items-center gap-1 transition-colors rounded px-1 py-0.5",
                statusColor,
                isClickable && "hover:bg-muted cursor-pointer",
                !isClickable && "cursor-default"
              )}
            >
              <StatusIcon status={status.status} />
              <span>{statusText}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="whitespace-pre-line text-sm">{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Control buttons */}
      <div className="flex items-center gap-1">
        {showPauseButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onTogglePause}
                  className="h-6 w-6 p-0"
                >
                  {isPaused ? (
                    <Play className="h-3 w-3" />
                  ) : (
                    <Pause className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPaused ? 'Resume autosave' : 'Pause autosave'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showSaveButton && (hasUnsavedChanges || (status.status === 'error' && status.canRetry)) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={status.status === 'error' ? onRetry : onSaveNow}
                  disabled={status.status === 'saving'}
                  className="h-6 w-6 p-0"
                >
                  {status.status === 'error' ? (
                    <RefreshCw className="h-3 w-3" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {status.status === 'error' ? 'Retry save' : 'Save now'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
})

AutosaveStatusIndicator.displayName = 'AutosaveStatusIndicator' 