import PocketBase from 'pocketbase'

// Dynamic PocketBase URL that works in all environments
const getPocketBaseURL = () => {
  // First priority: explicit environment variable (works for both client and server)
  if (process.env.NEXT_PUBLIC_POCKETBASE_URL) {
    return process.env.NEXT_PUBLIC_POCKETBASE_URL
  }
  
  // Second priority: server-side environment variable
  if (typeof window === 'undefined' && process.env.POCKETBASE_URL) {
    return process.env.POCKETBASE_URL
  }
  
  // Third priority: client-side auto-detection for development
  if (typeof window !== 'undefined') {
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
    }
  }
  
  // Final fallback
  return 'http://localhost:6969'
}

const POCKETBASE_URL = getPocketBaseURL()

console.log('🚀 PocketBase: Initializing PocketBase client with URL:', POCKETBASE_URL)
console.log('🔧 PocketBase: Environment check:', {
  NEXT_PUBLIC_POCKETBASE_URL: process.env.NEXT_PUBLIC_POCKETBASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  isClient: typeof window !== 'undefined',
  currentHost: typeof window !== 'undefined' ? window.location.host : 'server-side'
})

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

export interface Profile {
  id?: string
  name: string
  description?: string
  color?: string  // Hex color code like #3b82f6
  icon?: string   // Icon name for display
  user: string    // User ID who owns this profile
  is_default?: boolean  // Whether this is the default profile
  created?: string
  updated?: string
}

export interface Note {
  id?: string
  title: string
  content: string
  user?: string  // Optional for backward compatibility
  profile_id?: string  // New field for profile relationship
  created?: string
  updated?: string
  pinned?: boolean  // New field for pin functionality
  folder_id?: string  // New field for folder relationship
  isPublic?: boolean;
}

export interface Folder {
  id?: string
  name: string
  user?: string
  expanded?: boolean  // Whether the folder is expanded/collapsed
  created?: string
  updated?: string
}

export interface Template {
  id?: string
  name: string
  description?: string
  content: string  // HTML content for the template
  category: string  // Category like 'meeting', 'project', 'personal', etc.
  tags?: string[]  // Array of tags for better organization
  thumbnail?: string  // Optional base64 encoded thumbnail image
  is_public?: boolean  // Whether template is shared publicly
  users?: string  // Creator of the template
  usage_count?: number  // Track how often template is used
  created?: string
  updated?: string
}

export interface TemplateCategory {
  id?: string
  name: string
  description?: string
  icon?: string  // Icon name (e.g., 'briefcase', 'calendar', etc.)
  color?: string  // Hex color for category
  users?: string  // Creator of the category
  created?: string
  updated?: string
}

export const notesCollection = 'notes'
export const foldersCollection = 'folders'
export const templatesCollection = 'templates'
export const templateCategoriesCollection = 'template_categories' 