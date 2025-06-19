/**
 * File validation and utility functions
 */

export interface FileValidationOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  allowedExtensions?: string[]
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Default validation options for avatar uploads
 */
export const AVATAR_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
}

/**
 * Validate a file against the given options
 */
export function validateFile(file: File, options: FileValidationOptions = AVATAR_VALIDATION_OPTIONS): FileValidationResult {
  const { maxSize, allowedTypes, allowedExtensions } = options

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    if (!allowedTypes.includes(file.type)) {
      const typeNames = allowedTypes.map(type => {
        switch (type) {
          case 'image/jpeg':
          case 'image/jpg':
            return 'JPEG'
          case 'image/png':
            return 'PNG'
          case 'image/webp':
            return 'WebP'
          default:
            return type.split('/')[1]?.toUpperCase() || type
        }
      })
      return {
        isValid: false,
        error: `Please select a ${typeNames.join(', ')} image`
      }
    }
  }

  // Check file extension as fallback
  if (allowedExtensions && allowedExtensions.length > 0) {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File must have one of these extensions: ${allowedExtensions.join(', ')}`
      }
    }
  }

  // Check file size
  if (maxSize && file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    }
  }

  return { isValid: true }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Create a preview URL for an image file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error('File is not an image'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Generate a safe filename from a string
 */
export function generateSafeFilename(name: string, extension?: string): string {
  // Remove special characters and replace spaces with underscores
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50) // Limit length
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores

  if (extension) {
    return `${safeName}.${extension.replace('.', '')}`
  }

  return safeName
}

/**
 * Get user-friendly error messages for common file upload errors
 */
export function getFileUploadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    if (message.includes('size') || message.includes('large')) {
      return 'File is too large. Please select a smaller file.'
    }
    
    if (message.includes('type') || message.includes('format')) {
      return 'File type not supported. Please select a different file.'
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You do not have permission to upload files.'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred during upload.'
}