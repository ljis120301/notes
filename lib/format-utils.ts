/**
 * Utility functions for formatting document information
 */

export interface DocumentStats {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
  readingTimeMinutes: number
  sizeBytes: number
  sizeFormatted: string
}

/**
 * Calculate comprehensive document statistics
 */
export function calculateDocumentStats(title: string, content: string): DocumentStats {
  // Combine title and content for total stats
  const fullText = `${title}\n${content}`
  const contentOnly = content || ''
  
  // Remove HTML tags for accurate text counting
  const stripHtml = (html: string) => {
    return html
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }
  
  const plainText = stripHtml(fullText)
  const plainContent = stripHtml(contentOnly)
  
  // Character counts
  const characters = plainText.length
  const charactersNoSpaces = plainText.replace(/\s/g, '').length
  
  // Word count (split by whitespace and filter empty strings)
  const words = plainContent.trim() ? plainContent.trim().split(/\s+/).length : 0
  
  // Line count (split by line breaks)
  const lines = plainContent.split('\n').length
  
  // Reading time (average 250 words per minute)
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 250))
  
  // File size calculation (UTF-8 encoding)
  const sizeBytes = new Blob([fullText]).size
  const sizeFormatted = formatFileSize(sizeBytes)
  
  return {
    characters,
    charactersNoSpaces,
    words,
    lines,
    readingTimeMinutes,
    sizeBytes,
    sizeFormatted
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1) {
    if (bytes === 0) return '0 B'
    return `${bytes.toFixed(2)} B`
  }
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  const size = bytes / Math.pow(k, i)
  const formattedSize = size.toFixed(i === 0 ? 0 : 1)
  
  return `${formattedSize} ${sizes[i]}`
}

/**
 * Format file size in human-readable bit-based format (kilobits, megabits)
 */
export function formatFileSizeInBits(bytes: number): string {
  if (bytes === 0) return '0 bits'
  
  const bits = bytes * 8
  if (bits < 1024) return `${Math.round(bits)} bits`

  const k = 1024
  const sizes = ['bits', 'kb', 'Mb', 'Gb']
  const i = Math.floor(Math.log(bits) / Math.log(k))
  
  const size = bits / Math.pow(k, i)
  const formattedSize = size.toFixed(1)
  
  return `${formattedSize} ${sizes[i]}`
}

/**
 * Get a compact document size display for the editor header
 */
export function getCompactSizeDisplay(stats: DocumentStats): string {
  // Display file size in bits/kb/Mb
  const sizeInBits = formatFileSizeInBits(stats.sizeBytes)
  
  // For very large documents, add a warning indicator
  return `${sizeInBits}${stats.sizeBytes > 10 * 1024 * 1024 ? ' ⚠️' : ''}`
}

/**
 * Get detailed document statistics for tooltips or detailed views
 */
export function getDetailedStatsDisplay(stats: DocumentStats): string {
  const parts = []
  
  if (stats.words > 0) {
    parts.push(`${stats.words.toLocaleString()} words`)
  }
    
  if (stats.lines > 1) {
    parts.push(`${stats.lines} lines`)
  }
  
  if (stats.words > 50) {
    parts.push(`~${stats.readingTimeMinutes} min read`)
  }
  
  parts.push(stats.sizeFormatted) // e.g. 1.2 MB
  parts.push(formatFileSizeInBits(stats.sizeBytes)) // e.g. 9.6 Mb
  
  return parts.join(' • ')
} 