import PocketBase from 'pocketbase'

// Dynamic PocketBase URL that works in all environments
const getPocketBaseURL = () => {
  // First, check for explicit environment variable
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POCKETBASE_URL) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL
  }
  
  if (typeof window !== 'undefined') {
    // Client-side: auto-detect based on current environment
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    
    // Development detection (localhost or IP addresses)
    const isDevelopment = hostname === 'localhost' || 
                         hostname === '127.0.0.1' || 
                         /^192\.168\./.test(hostname) || 
                         /^10\./.test(hostname) || 
                         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    
    if (isDevelopment) {
      // Development: use custom port 6969
      return `${protocol}//${hostname}:6969`
    } else {
      // Production: use standard HTTPS port (443) - no port needed in URL
      return `https://${hostname}`
    }
  }
  
  // Server-side fallback
  return process.env.POCKETBASE_URL || 'http://localhost:6969'
}

const POCKETBASE_URL = getPocketBaseURL()

console.log('🚀 PocketBase: Initializing PocketBase client with dynamic URL:', POCKETBASE_URL)

// PocketBase instance with hardcoded IP and default localStorage auth store
export const pb = new PocketBase(POCKETBASE_URL)

// Type definition for PocketBase records
export interface PocketBaseRecord {
  id: string
  collectionId: string
  collectionName: string
  [key: string]: unknown
}

// Debug auth state on initialization
if (typeof window !== 'undefined') {
  console.log('🌐 PocketBase: Client-side initialization starting')
  console.log('🔗 PocketBase: Connecting to:', POCKETBASE_URL)
  console.log('🍪 PocketBase: Initial auth state - isValid:', pb.authStore.isValid)
  console.log('🍪 PocketBase: Initial auth token:', pb.authStore.token ? 'present' : 'none')
  console.log('🏁 PocketBase: Client-side initialization complete')
}

/**
 * Generates a dynamic file URL that works with the current PocketBase URL
 * This replaces hardcoded URLs and allows the app to work when deployed anywhere
 */
export function getDynamicFileUrl(record: PocketBaseRecord, filename: string): string {
  // Use the current pb instance URL, not a hardcoded one
  return pb.files.getUrl(record, filename)
}

/**
 * Converts an absolute PocketBase file URL to use the current server URL
 * This fixes old URLs that might be pointing to previous server instances
 */
export function fixLegacyFileUrl(url: string): string {
  if (!url) return url
  
  // Check if this is a PocketBase file URL
  const pocketbaseFilePattern = /\/api\/files\/([^\/]+)\/([^\/]+)\/(.+)$/
  const match = url.match(pocketbaseFilePattern)
  
  if (match) {
    const [, collectionId, recordId, filename] = match
    // Reconstruct the URL using current PocketBase URL
    return `${pb.baseUrl}/api/files/${collectionId}/${recordId}/${filename}`
  }
  
  // If it's not a PocketBase file URL, return as-is
  return url
}

/**
 * Gets a relative file path that can be used with any PocketBase server
 * Format: /api/files/{collection}/{record}/{filename}
 */
export function getRelativeFileUrl(record: PocketBaseRecord, filename: string): string {
  return `/api/files/${record.collectionId}/${record.id}/${filename}`
}

/**
 * Transforms HTML content to fix legacy PocketBase image URLs
 * This function finds absolute PocketBase URLs and converts them to work with the current server
 */
export function transformLegacyImageUrls(htmlContent: string): string {
  if (!htmlContent) return htmlContent
  
  // Pattern to match PocketBase file URLs in img src attributes
  // Matches: http://any-ip:any-port/api/files/collection/record/filename
  const legacyUrlPattern = /(<img[^>]+src=["'])https?:\/\/[^\/]+\/api\/files\/([^\/]+)\/([^\/]+)\/([^"']+)(["'][^>]*>)/gi
  
  const transformedContent = htmlContent.replace(legacyUrlPattern, (match, beforeUrl, collectionId, recordId, filename, afterUrl) => {
    // Convert to relative URL that works with any server
    const relativeUrl = `/api/files/${collectionId}/${recordId}/${filename}`
    console.log(`🔄 Transforming legacy image URL: ${match.substring(beforeUrl.length, match.length - afterUrl.length)} → ${relativeUrl}`)
    return `${beforeUrl}${relativeUrl}${afterUrl}`
  })
  
  return transformedContent
}

/**
 * Transforms HTML content to ensure all PocketBase image URLs work with the current server
 * This handles both relative URLs (making them absolute) and legacy absolute URLs (fixing them)
 */
export function normalizeImageUrls(htmlContent: string): string {
  if (!htmlContent) return htmlContent
  
  let transformedContent = htmlContent
  
  // First, fix any legacy absolute URLs
  transformedContent = transformLegacyImageUrls(transformedContent)
  
  // Then, ensure relative URLs work by making them point to current server
  const relativeUrlPattern = /(<img[^>]+src=["'])\/api\/files\/([^"']+)(["'][^>]*>)/gi
  
  transformedContent = transformedContent.replace(relativeUrlPattern, (match, beforeUrl, filePath, afterUrl) => {
    const absoluteUrl = `${pb.baseUrl}/api/files/${filePath}`
    return `${beforeUrl}${absoluteUrl}${afterUrl}`
  })
  
  return transformedContent
}

export interface Note {
  id?: string
  title: string
  content: string
  user?: string  // Optional for backward compatibility
  created?: string
  updated?: string
  pinned?: boolean  // New field for pin functionality
}

export const notesCollection = 'notes' 