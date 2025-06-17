"use client"

import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import { 
  calculateDocumentStats, 
  getCompactSizeDisplay, 
  getDetailedStatsDisplay,
  type DocumentStats 
} from '@/lib/format-utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DocumentSizeIndicatorProps {
  title: string
  content: string
  className?: string
  showDetails?: boolean
}

export function DocumentSizeIndicator({ 
  title, 
  content, 
  className = '', 
  showDetails = true 
}: DocumentSizeIndicatorProps) {
  // Memoize stats calculation to prevent unnecessary recalculations
  const stats = useMemo(() => {
    return calculateDocumentStats(title, content)
  }, [title, content])

  const compactDisplay = useMemo(() => {
    return getCompactSizeDisplay(stats)
  }, [stats])

  const detailedDisplay = useMemo(() => {
    return getDetailedStatsDisplay(stats)
  }, [stats])

  // Determine indicator color based on document size
  const getIndicatorColor = (stats: DocumentStats) => {
    if (stats.sizeBytes > 40 * 1024 * 1024) { // >40MB (approaching limit)
      return 'text-red-500'
    }
    if (stats.sizeBytes > 10 * 1024 * 1024) { // >10MB (large)
      return 'text-yellow-500'
    }
    if (stats.sizeBytes > 1 * 1024 * 1024) { // >1MB (medium)
      return 'text-blue-500'
    }
    return 'text-muted-foreground' // Small documents
  }

  const indicatorColor = getIndicatorColor(stats)

  if (!showDetails) {
    // Simple display without tooltip for compact views
    return (
      <div className={`flex items-center gap-1 text-xs ${indicatorColor} ${className}`}>
        <FileText className="h-3 w-3" />
        <span>{compactDisplay}</span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 text-xs ${indicatorColor} hover:text-foreground transition-colors cursor-default ${className}`}>
            <FileText className="h-3 w-3" />
            <span>{compactDisplay}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start" 
          className="max-w-xs bg-background border border-border shadow-lg rounded-md p-3"
        >
          <div className="space-y-1">
            
            <div className="text-xs text-muted-foreground">
              {detailedDisplay}
            </div>
            {stats.sizeBytes > 10 * 1024 * 1024 && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                Large document detected. Consider splitting into smaller notes for better performance.
              </div>
            )}
            {stats.sizeBytes > 40 * 1024 * 1024 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                Warning: Approaching size limit (50MB). Save frequently.
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 