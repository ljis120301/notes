import { pb, Note, notesCollection, getRelativeFileUrl, normalizeImageUrls, Folder, foldersCollection, Profile } from './pocketbase'
import PocketBase from 'pocketbase'

// Collection name for profiles
const profilesCollection = 'user_profiles'

// ==================== CLIENT-SIDE PROFILE SIMULATION ====================

interface ProfileAssignments {
  [noteId: string]: string // noteId -> profileId
}

interface FolderAssignments {
  [folderId: string]: string // folderId -> profileId
}

// Get localStorage keys for current user
function getProfileAssignmentsKey(): string {
  const userId = pb.authStore.model?.id || 'anonymous'
  return `profile_assignments_${userId}`
}

function getFolderAssignmentsKey(): string {
  const userId = pb.authStore.model?.id || 'anonymous'
  return `folder_assignments_${userId}`
}

// Get profile assignments from localStorage
function getProfileAssignments(): ProfileAssignments {
  try {
    const stored = localStorage.getItem(getProfileAssignmentsKey())
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Failed to parse profile assignments from localStorage:', error)
    return {}
  }
}

function getFolderAssignments(): FolderAssignments {
  try {
    const stored = localStorage.getItem(getFolderAssignmentsKey())
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Failed to parse folder assignments from localStorage:', error)
    return {}
  }
}

// Save profile assignments to localStorage
function saveProfileAssignments(assignments: ProfileAssignments): void {
  try {
    localStorage.setItem(getProfileAssignmentsKey(), JSON.stringify(assignments))
  } catch (error) {
    console.warn('Failed to save profile assignments to localStorage:', error)
  }
}

function saveFolderAssignments(assignments: FolderAssignments): void {
  try {
    localStorage.setItem(getFolderAssignmentsKey(), JSON.stringify(assignments))
  } catch (error) {
    console.warn('Failed to save folder assignments to localStorage:', error)
  }
}

// Assign note to profile (client-side)
function assignNoteToProfile(noteId: string, profileId: string | null): void {
  const assignments = getProfileAssignments()
  if (profileId) {
    assignments[noteId] = profileId
  } else {
    delete assignments[noteId]
  }
  saveProfileAssignments(assignments)
}

// Assign folder to profile (client-side)
function assignFolderToProfile(folderId: string, profileId: string | null): void {
  const assignments = getFolderAssignments()
  if (profileId) {
    assignments[folderId] = profileId
  } else {
    delete assignments[folderId]
  }
  saveFolderAssignments(assignments)
}

// Check if note belongs to profile
function noteMatchesProfile(noteId: string, profileId: string | null): boolean {
  const assignments = getProfileAssignments()
  const noteProfileId = assignments[noteId]
  
  // If no assignment, treat as belonging to default profile
  if (!noteProfileId) {
    return profileId === null // null means default/unassigned
  }
  
  return noteProfileId === profileId
}

// Check if folder belongs to profile
function folderMatchesProfile(folderId: string, profileId: string | null): boolean {
  const assignments = getFolderAssignments()
  const folderProfileId = assignments[folderId]
  
  // If no assignment, treat as belonging to default profile
  if (!folderProfileId) {
    return profileId === null // null means default/unassigned
  }
  
  return folderProfileId === profileId
}

// Helper function to ensure user is authenticated
function ensureAuth() {
  if (!pb.authStore.isValid || !pb.authStore.model?.id) {
    throw new Error('User not authenticated')
  }
  return pb.authStore.model.id
}

// Helper function to check if error is auto-cancellation
function isAutoCancelled(error: unknown): boolean {
  const err = error as { isAbort?: boolean; message?: string; status?: number }
  return err?.isAbort === true || 
         err?.message?.includes('autocancelled') || 
         err?.status === 0
}

// Image upload function for markdown notes
export async function uploadImage(file: File): Promise<string> {
  const userId = ensureAuth()
  
  const formData = new FormData()
  formData.append('image', file)
  formData.append('user', userId)

  try {
    const record = await pb.collection('note_images').create(formData)
    // Return a relative file URL that works with any PocketBase server
    const imageUrl = getRelativeFileUrl(record, record.image)
    return imageUrl
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Upload image request was auto-cancelled')
      throw new Error('Upload cancelled')
    }
    console.error('Failed to upload image:', error)
    throw new Error('Failed to upload image')
  }
}

export async function createNote(title: string, content: string = '', profileId?: string): Promise<Note> {
  const userId = ensureAuth()
  
  try {
    // Determine target profile: explicit parameter or fall back to default profile
    let targetProfileId: string | undefined = profileId
    if (!targetProfileId) {
      const defaultProfile = await getDefaultProfile()
      targetProfileId = defaultProfile?.id
    }

    const noteData: Partial<Note> & { title: string; content: string; user: string } = {
      title,
      content,
      user: userId,
      // Only include profile_id if we actually have one (avoid schema errors if field missing)
      ...(targetProfileId ? { profile_id: targetProfileId } : {})
    }
    
    const record = await pb.collection(notesCollection).create(noteData)
    
    // Preserve legacy local-storage mapping for backward compatibility
    if (profileId) {
      assignNoteToProfile(record.id, profileId)
    }
    
    return record as unknown as Note
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Create note request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    
    const err = error as { status?: number; message?: string; data?: Record<string, unknown> }
    console.error('Create note error details:', err)
    
    // Retry with minimal required data (and profile_id if available)
    const minimalData: Partial<Note> & { title: string; content: string } = {
      title,
      content,
      ...(profileId ? { profile_id: profileId } : {})
    }
    const minimalRecord = await pb.collection(notesCollection).create(minimalData)

    if (profileId) {
      assignNoteToProfile(minimalRecord.id, profileId)
    }

    return minimalRecord as unknown as Note
  }
}

export async function getNotes(): Promise<Note[]> {
  const userId = ensureAuth()
  
  try {
    // First try with user filter
    const records = await pb.collection(notesCollection).getFullList({
      sort: '-updated',
      filter: `user = "${userId}"`
    })
    
    // Transform legacy image URLs in all notes
    const notesWithFixedUrls = records.map(record => ({
      ...record,
      content: normalizeImageUrls(record.content || '')
    }))
    
    return notesWithFixedUrls as unknown as Note[]
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      // Auto-cancelled request, silently return empty array and let other request complete
      console.log('Get notes request was auto-cancelled')
      return []
    }
    
    const err = error as { status?: number }
    if (err.status === 400) {
      // User field doesn't exist, get all notes for now
      console.warn('User field not found in notes collection. Showing all notes.')
      try {
        const records = await pb.collection(notesCollection).getFullList({
          sort: '-updated'
        })
        
        // Transform legacy image URLs in all notes
        const notesWithFixedUrls = records.map(record => ({
          ...record,
          content: normalizeImageUrls(record.content || '')
        }))
        
        return notesWithFixedUrls as unknown as Note[]
      } catch (fallbackError: unknown) {
        if (isAutoCancelled(fallbackError)) {
          console.log('Fallback get notes request was auto-cancelled')
          return []
        }
        console.error('Failed to fetch notes:', fallbackError)
        return []
      }
    }
    throw error
  }
}

export async function getNote(id: string): Promise<Note> {
  const userId = ensureAuth()
  
  try {
    const record = await pb.collection(notesCollection).getOne(id)
    
    // If user field exists, check ownership
    if (record.user && record.user !== userId) {
      throw new Error('Note not found or access denied')
    }
    
    // Transform legacy image URLs in the note content
    const noteWithFixedUrls = {
      ...record,
      content: normalizeImageUrls(record.content || '')
    }
    
    return noteWithFixedUrls as unknown as Note
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get note request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    
    const err = error as { status?: number }
    if (err.status === 404) {
      throw new Error('Note not found')
    }
    throw error
  }
}

export async function updateNote(id: string, data: Partial<Note>): Promise<Note> {
  ensureAuth()
  
  try {
    // Enhanced payload preparation for large content support
    const preparedData: Partial<Note> = { ...data }
    
    // Trim title if it exceeds reasonable length
    if (preparedData.title && preparedData.title.length > 1900) {
      console.warn(`[updateNote] Title very long (${preparedData.title.length} chars), trimming to 1900`)
      preparedData.title = preparedData.title.substring(0, 1900)
    }
    
    // Enhanced payload size monitoring
    const titleLength = preparedData.title?.length || 0
    const contentLength = preparedData.content?.length || 0
    const payloadJson = JSON.stringify(preparedData)
    const payloadSize = new Blob([payloadJson]).size
    
    // Log detailed information for debugging
    console.log(`[updateNote] Payload details:`, {
      titleLength,
      contentLength,
      payloadSize: `${Math.round(payloadSize / 1024)}KB`,
      noteId: id
    })
    
    // Check for extremely large payloads (>10MB)
    if (payloadSize > 10 * 1024 * 1024) {
      console.warn(`[updateNote] Very large payload detected: ${Math.round(payloadSize / (1024 * 1024))}MB`)
      
      // For content over 10MB, we might need chunking or alternative approaches
      if (contentLength > 10000000) { // 10M characters
        throw new Error('Content is extremely large. Please consider breaking it into smaller sections.')
      }
    }
    
    // Validate content length doesn't exceed our new field limit
    if (contentLength > 45000000) { // 45M chars (under our 50M limit with buffer)
      throw new Error('Content exceeds maximum size limit. Please reduce the content size.')
    }

    // Update the note directly
    const record = await pb.collection(notesCollection).update(id, preparedData)
    
    return record as unknown as Note
  } catch (error: unknown) {
    // Enhanced error logging with more context
    const errorDetails = {
      noteId: id,
      dataSize: JSON.stringify(data).length,
      titleLength: data.title?.length || 0,
      contentLength: data.content?.length || 0,
      error
    }
    
    console.error('notes-api updateNote failed with details:', errorDetails)
    
    const err = error as { status?: number; message?: string }
    
    // Enhanced error messages for better user feedback
    if (err.status === 400) {
      if (err.message?.includes('too large') || err.message?.includes('size')) {
        throw new Error('Content is too large to save. Please reduce the size and try again.')
      }
      if (err.message?.includes('validation') || err.message?.includes('invalid')) {
        throw new Error('Content contains invalid data. Please check your content and try again.')
      }
      // Generic 400 error with helpful message
      throw new Error('Update failed: ' + (err.message || 'Invalid data') + '. Please check your data and try again.')
    }
    
    if (err.status === 413) {
      throw new Error('Content is too large for the server to process. Please reduce the size.')
    }
    
    if (err.status === 422) {
      throw new Error('Content validation failed. Please check your data format.')
    }
    
    if (err.status && err.status >= 500) {
      throw new Error('Server error occurred. Please try again in a moment.')
    }
    
    // Re-throw with original message for other errors
    throw error
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  ensureAuth()
  
  try {
    // Delete the note directly - PocketBase will handle access control
    await pb.collection(notesCollection).delete(id)
    return true
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Delete note request was auto-cancelled')
      return false
    }
    throw error
  }
}

// Bulk delete notes functionality
export async function bulkDeleteNotes(noteIds: string[]): Promise<{ success: string[], failed: string[] }> {
  ensureAuth()
  
  if (!noteIds.length) {
    throw new Error('No notes provided for deletion')
  }
  
  const results = {
    success: [] as string[],
    failed: [] as string[]
  }
  
  // Delete notes in batches to avoid overwhelming the server
  const BATCH_SIZE = 5
  const batches = []
  
  for (let i = 0; i < noteIds.length; i += BATCH_SIZE) {
    batches.push(noteIds.slice(i, i + BATCH_SIZE))
  }
  
  try {
    for (const batch of batches) {
      const deletePromises = batch.map(async (noteId) => {
        try {
          await pb.collection(notesCollection).delete(noteId)
          results.success.push(noteId)
          return { id: noteId, success: true }
        } catch (error: unknown) {
          if (isAutoCancelled(error)) {
            console.log(`Delete note ${noteId} request was auto-cancelled`)
            results.failed.push(noteId)
            return { id: noteId, success: false, error: 'cancelled' }
          }
          console.error(`Failed to delete note ${noteId}:`, error)
          results.failed.push(noteId)
          return { id: noteId, success: false, error }
        }
      })
      
      await Promise.all(deletePromises)
    }
    
    console.log(`Bulk delete completed: ${results.success.length} succeeded, ${results.failed.length} failed`)
    return results
  } catch (error: unknown) {
    console.error('Bulk delete notes failed:', error)
    throw error
  }
}

export async function searchNotes(query: string): Promise<Note[]> {
  const userId = ensureAuth()
  
  if (!query.trim()) {
    return getNotes()
  }
  
  try {
    // First try with user filter - sort by updated to get consistent ordering
    const records = await pb.collection(notesCollection).getFullList({
      filter: `user = "${userId}" && (title ~ "${query}" || content ~ "${query}")`,
      sort: '-updated'
    })
    
    // Transform legacy image URLs in search results
    const notesWithFixedUrls = records.map(record => ({
      ...record,
      content: normalizeImageUrls(record.content || '')
    }))
    
    return notesWithFixedUrls as unknown as Note[]
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Search notes request was auto-cancelled')
      return []
    }
    
    const err = error as { status?: number }
    if (err.status === 400) {
      // User field doesn't exist, search all notes for now
      console.warn('User field not found in notes collection. Searching all notes.')
      try {
        const records = await pb.collection(notesCollection).getFullList({
          filter: `title ~ "${query}" || content ~ "${query}"`,
          sort: '-updated'
        })
        
        // Transform legacy image URLs in search results
        const notesWithFixedUrls = records.map(record => ({
          ...record,
          content: normalizeImageUrls(record.content || '')
        }))
        
        return notesWithFixedUrls as unknown as Note[]
      } catch (fallbackError: unknown) {
        if (isAutoCancelled(fallbackError)) {
          console.log('Fallback search notes request was auto-cancelled')
          return []
        }
        console.error('Failed to search notes:', fallbackError)
        return []
      }
    }
    throw error
  }
}

export async function getNoteByPublicId(publicId: string): Promise<Note | null> {
  console.log("[getNoteByPublicId] Searching for note with ID:", publicId);
  try {
    // For public notes, we don't need authentication - create a clean instance
    const publicPb = new PocketBase(pb.baseUrl);
    // Ensure no authentication is used for public access
    publicPb.authStore.clear();
    console.log("[getNoteByPublicId] Created clean PocketBase instance");
    
    // Use the publicId as the actual note ID and check if it's public
    const record = await publicPb.collection(notesCollection).getOne(publicId);
    
    console.log("[getNoteByPublicId] Record found:", record ? "yes" : "no");
    console.log("[getNoteByPublicId] Record isPublic:", record?.isPublic);
    
    // Check if the note is actually public
    if (!record || !record.isPublic) {
      console.log("[getNoteByPublicId] Note is not public or doesn't exist");
      return null;
    }

    // For public notes with images, we need to handle file access
    let processedContent = record.content || '';
    
    // Check if the content has images that need file tokens
    const imagePattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const imageMatches = [...processedContent.matchAll(imagePattern)];
    
    if (imageMatches.length > 0) {
      console.log("[getNoteByPublicId] Found", imageMatches.length, "images, processing file access...");
      
      // For public access, we need to use a different approach
      // Since we can't generate file tokens without authentication,
      // we'll need to transform the URLs to work with public access
      
      // Transform legacy image URLs in the note content
      processedContent = normalizeImageUrls(processedContent);
      
      // For now, we'll rely on the collection rules being configured properly
      // The admin needs to set the collection's file access rules to allow public access
      // when isPublic = true
    }

    const noteWithFixedUrls = {
      ...record,
      content: processedContent
    };
    
    console.log("[getNoteByPublicId] Returning note:", (noteWithFixedUrls as { title?: string }).title);
    return noteWithFixedUrls as unknown as Note;
  } catch (error: unknown) {
    console.error("[getNoteByPublicId] Error fetching public note:", error);
    
    // Log more details about the error
    if (error && typeof error === 'object') {
      const errorObj = error as { message?: string; status?: number; data?: unknown };
      console.error("[getNoteByPublicId] Error details:", {
        message: errorObj.message,
        status: errorObj.status,
        data: errorObj.data
      });
    }
    
    if (isAutoCancelled(error)) {
      console.log('Get note by public ID request was auto-cancelled');
      throw new Error('Request cancelled');
    }
    
    const err = error as { status?: number };
    if (err.status === 404) {
      console.log("[getNoteByPublicId] Note not found (404)");
      return null; // Note not found is not an error here, just return null
    }
    
    console.error('Failed to fetch note by public ID:', error);
    return null;
  }
}

// Pin note functionality
export async function pinNote(id: string): Promise<Note> {
  ensureAuth()
  
  try {
    // Update the note to set pinned to true
    const record = await pb.collection(notesCollection).update(id, { pinned: true })
    
    return record as unknown as Note
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Pin note request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api pinNote failed:', error)
    throw error
  }
}

// Unpin note functionality
export async function unpinNote(id: string): Promise<Note> {
  ensureAuth()
  
  try {
    // Update the note to set pinned to false
    const record = await pb.collection(notesCollection).update(id, { pinned: false })
    
    return record as unknown as Note
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Unpin note request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api unpinNote failed:', error)
    throw error
  }
}

// Folder management functions
export async function createFolder(name: string, profileId?: string): Promise<Folder> {
  const userId = ensureAuth()
  
  try {
    // Determine target profile (explicit or default)
    let targetProfileId: string | undefined = profileId
    if (!targetProfileId) {
      const defaultProfile = await getDefaultProfile()
      targetProfileId = defaultProfile?.id
    }

    const folderData: Partial<Folder> & { name: string; expanded: boolean; user: string } = {
      name,
      expanded: true,
      user: userId,
      ...(targetProfileId ? { profile_id: targetProfileId } : {})
    }
    
    const record = await pb.collection(foldersCollection).create(folderData)
    
    // Legacy mapping for backwards-compatibility
    if (profileId) {
      assignFolderToProfile(record.id, profileId)
    }
    
    // Also store mapping when targetProfileId came from default selection
    if (!profileId && targetProfileId) {
      assignFolderToProfile(record.id, targetProfileId as string)
    }
    
    return record as unknown as Folder
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Create folder request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    
    // Try with minimal data
    const minimalFolderData: Partial<Folder> & { name: string; expanded: boolean; user: string } = {
      name,
      expanded: true,
      user: userId,
      ...(profileId ? { profile_id: profileId } : {})
    }
    const minimalRecord = await pb.collection(foldersCollection).create(minimalFolderData)
    
    // Assign to profile client-side
    if (profileId) {
      assignFolderToProfile(minimalRecord.id, profileId)
    }
    
    // Additional mapping not needed here when profileId is absent
    
    return minimalRecord as unknown as Folder
  }
}

export async function getFolders(profileId?: string): Promise<Folder[]> {
  const userId = ensureAuth()
  
  try {
    // Fetch all user folders first (server cannot yet filter null profile reliably)
    const records = await pb.collection(foldersCollection).getFullList({
      sort: 'name',
      filter: `user = "${userId}"`
    })
    
    const foldersWithProfile = records.map(r => r as unknown as Folder & { profile_id?: string })
    
    // Filter by profile id (server-side field) or legacy mapping fallback
    const filteredFolders = foldersWithProfile.filter(folder => {
      const folderProfileId = folder.profile_id ?? null
      if (profileId) {
        if (folderProfileId === profileId) return true
        if (folderProfileId === null && folder.id) return folderMatchesProfile(folder.id, profileId)
        return false
      }
      // Viewing default/unassigned profile
      if (!folderProfileId) {
        return true
      }
      return folder.id ? folderMatchesProfile(folder.id, null) : false
    })
    
    return filteredFolders as unknown as Folder[]
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get folders request was auto-cancelled')
      return []
    }
    
    const err = error as { status?: number; message?: string }
    
    // If user filter doesn't work, try without any filter and then filter client-side
    if (err.status === 400) {
      console.warn('User filter failed for folders, trying without filter')
      try {
        const records = await pb.collection(foldersCollection).getFullList({
          sort: 'name'
        })
        
        // Filter by profile client-side
        const filteredFolders = records.filter(folder => 
          folderMatchesProfile(folder.id, profileId || null)
        )
        
        return filteredFolders as unknown as Folder[]
      } catch (_fallbackError) {
        console.error('Even no-filter query failed for folders:', _fallbackError)
        return []
      }
    }
    
    console.error('Failed to fetch folders:', error)
    return []
  }
}

export async function updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
  ensureAuth()
  
  try {
    const record = await pb.collection(foldersCollection).update(id, data)
    return record as unknown as Folder
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Update folder request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api updateFolder failed:', error)
    throw error
  }
}

export async function deleteFolder(id: string): Promise<boolean> {
  ensureAuth()
  
  try {
    // First, update all notes in this folder to have no folder
    const notesInFolder = await pb.collection(notesCollection).getFullList({
      filter: `folder_id = "${id}"`
    })
    
    // Move notes out of folder before deleting the folder
    await Promise.all(
      notesInFolder.map(note => 
        pb.collection(notesCollection).update(note.id, { folder_id: null })
      )
    )
    
    // Delete the folder
    await pb.collection(foldersCollection).delete(id)
    return true
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Delete folder request was auto-cancelled')
      return false
    }
    console.error('notes-api deleteFolder failed:', error)
    throw error
  }
}

export async function moveNoteToFolder(noteId: string, folderId: string | null): Promise<Note> {
  ensureAuth()
  
  try {
    const record = await pb.collection(notesCollection).update(noteId, { 
      folder_id: folderId 
    })
    return record as unknown as Note
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Move note to folder request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api moveNoteToFolder failed:', error)
    throw error
  }
}

export async function toggleFolderExpanded(id: string, expanded: boolean): Promise<Folder> {
  ensureAuth()
  
  try {
    const record = await pb.collection(foldersCollection).update(id, { expanded })
    return record as unknown as Folder
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Toggle folder expanded request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api toggleFolderExpanded failed:', error)
    throw error
  }
}

// ==================== PROFILE MANAGEMENT ====================

export async function createProfile(name: string, description?: string, color?: string, icon?: string): Promise<Profile> {
  const userId = ensureAuth()
  
  try {
    const record = await pb.collection(profilesCollection).create({
      name,
      description: description || '',
      color: color || '#3b82f6', // Default blue color
      icon: icon || 'User',
      user: userId,
      is_default: false
    })
    return record as unknown as Profile
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Create profile request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api createProfile failed:', error)
    throw error
  }
}

export async function createDefaultProfile(): Promise<Profile> {
  const userId = ensureAuth()
  
  try {
    const defaultProfile = await pb.collection(profilesCollection).create({
      name: 'Default',
      description: 'Your default profile for notes',
      color: '#3b82f6',
      icon: 'home',
      user: userId,
      is_default: true
    })
    
    return defaultProfile as unknown as Profile
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Create default profile request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api createDefaultProfile failed:', error)
    throw error
  }
}

export async function getProfiles(): Promise<Profile[]> {
  const userId = ensureAuth()
  
  try {
    const records = await pb.collection(profilesCollection).getFullList({
      sort: 'created',
      filter: `user = "${userId}"`
    })
    return records as unknown as Profile[]
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get profiles request was auto-cancelled')
      return []
    }
    console.error('notes-api getProfiles failed:', error)
    throw error
  }
}

export async function getProfile(id: string): Promise<Profile> {
  const userId = ensureAuth()
  
  try {
    const record = await pb.collection(profilesCollection).getOne(id)
    
    // Check ownership
    if (record.user !== userId) {
      throw new Error('Profile not found or access denied')
    }
    
    return record as unknown as Profile
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get profile request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    
    const err = error as { status?: number }
    if (err.status === 404) {
      throw new Error('Profile not found')
    }
    console.error('notes-api getProfile failed:', error)
    throw error
  }
}

export async function updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
  ensureAuth()
  
  try {
    // If setting as default, unset other defaults first
    if (data.is_default) {
      const profiles = await getProfiles()
      const currentDefault = profiles.find(p => p.is_default && p.id !== id)
      if (currentDefault) {
        await pb.collection(profilesCollection).update(currentDefault.id!, { is_default: false })
      }
    }
    
    const record = await pb.collection(profilesCollection).update(id, data)
    return record as unknown as Profile
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Update profile request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api updateProfile failed:', error)
    throw error
  }
}

export async function deleteProfile(id: string): Promise<boolean> {
  ensureAuth()
  
  try {
    // Check if this is the last profile - prevent deletion
    const profiles = await getProfiles()
    if (profiles.length <= 1) {
      throw new Error('Cannot delete the last profile. Create another profile first.')
    }
    
    // If deleting default profile, make another one default
    const profile = profiles.find(p => p.id === id)
    if (profile?.is_default) {
      const nextProfile = profiles.find(p => p.id !== id)
      if (nextProfile) {
        await updateProfile(nextProfile.id!, { is_default: true })
      }
    }
    
    // Move all notes from this profile to the default profile
    const defaultProfile = profiles.find(p => p.is_default && p.id !== id) || profiles.find(p => p.id !== id)
    if (defaultProfile) {
      const notesInProfile = await getNotesByProfile(id)
      for (const note of notesInProfile) {
        await moveNoteToProfile(note.id!, defaultProfile.id!)
      }
    }
    
    await pb.collection(profilesCollection).delete(id)
    return true
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Delete profile request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api deleteProfile failed:', error)
    throw error
  }
}

export async function getDefaultProfile(): Promise<Profile | null> {
  const userId = ensureAuth()
  
  try {
    const records = await pb.collection(profilesCollection).getFullList({
      filter: `user = "${userId}" && is_default = true`,
      limit: 1
    })
    return records.length > 0 ? records[0] as unknown as Profile : null
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get default profile request was auto-cancelled')
      return null
    }
    console.error('notes-api getDefaultProfile failed:', error)
    return null
  }
}

// ==================== PROFILE-AWARE NOTE FUNCTIONS ====================

export async function getNotesByProfile(profileId: string | null): Promise<Note[]> {
  const userId = ensureAuth()
  
  try {
    // Get all user notes first
    const records = await pb.collection(notesCollection).getFullList({
      sort: '-updated',
      filter: `user = "${userId}"`
    })
    
    // Transform legacy image URLs in all notes
    const notesWithFixedUrls = records.map(record => ({
      ...record,
      content: normalizeImageUrls(record.content || '')
    }))
    
    // Filter by profile_id field (preferred) or legacy local assignment fallback
    const filteredNotes = notesWithFixedUrls.filter(note => {
      const noteProfileId = (note as unknown as Note & { profile_id?: string }).profile_id ?? null

      if (profileId) {
        if (noteProfileId === profileId) {
          return true
        }
        if (noteProfileId === null && note.id) {
          // legacy mapping fallback
          return noteMatchesProfile(note.id, profileId)
        }
        return false
      }

      // When profileId is null (default/unassigned) include notes that have no profile
      if (!noteProfileId) {
        return true
      }

      // Legacy fallback: use local assignment mapping if available
      return note.id ? noteMatchesProfile(note.id, profileId) : false
    })
    
    return filteredNotes as unknown as Note[]
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Get notes by profile request was auto-cancelled')
      return []
    }
    
    const err = error as { status?: number; message?: string }
    
    // If user filter doesn't work, try without any filter and then filter client-side
    if (err.status === 400) {
      console.warn('User filter failed, trying without filter')
      try {
        const records = await pb.collection(notesCollection).getFullList({
          sort: '-updated'
        })
        
        const notesWithFixedUrls = records.map(record => ({
          ...record,
          content: normalizeImageUrls(record.content || '')
        }))
        
        // Filter by profile_id field (preferred) or legacy local assignment fallback
        const filteredNotes = notesWithFixedUrls.filter(note => {
          const noteProfileId = (note as unknown as Note & { profile_id?: string }).profile_id ?? null

          if (profileId) {
            if (noteProfileId === profileId) return true
            if (noteProfileId === null && note.id) return noteMatchesProfile(note.id, profileId)
            return false
          }

          // When profileId is null (default/unassigned) include notes that have no profile
          if (!noteProfileId) {
            return true
          }

          // Legacy fallback: use local assignment mapping if available
          return note.id ? noteMatchesProfile(note.id, profileId) : false
        })
        
        return filteredNotes as unknown as Note[]
      } catch (fallbackError) {
        console.error('Even no-filter query failed:', fallbackError)
        return []
      }
    }
    
    console.error('notes-api getNotesByProfile failed:', error)
    return []
  }
}

export async function moveNoteToProfile(noteId: string, profileId: string | null): Promise<Note> {
  ensureAuth()
  
  try {
    const record = await pb.collection(notesCollection).update(noteId, { 
      profile_id: profileId || null
    })
    
    // Transform legacy image URLs in the updated note
    const noteWithFixedUrls = {
      ...record,
      content: normalizeImageUrls(record.content || '')
    }
    
    return noteWithFixedUrls as unknown as Note
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Move note to profile request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api moveNoteToProfile failed:', error)
    throw error
  }
}

export async function createNoteInProfile(title: string, content: string = '', profileId?: string): Promise<Note> {
  const userId = ensureAuth()
  
  try {
    // If no profileId provided, use the default profile
    let targetProfileId: string | undefined = profileId
    if (!targetProfileId) {
      const defaultProfile = await getDefaultProfile()
      targetProfileId = defaultProfile?.id || undefined
    }
    
    const record = await pb.collection(notesCollection).create({
      title,
      content,
      user: userId,
      profile_id: targetProfileId || undefined
    })
    return record as unknown as Note
  } catch (error: unknown) {
    if (isAutoCancelled(error)) {
      console.log('Create note in profile request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('notes-api createNoteInProfile failed:', error)
    throw error
  }
} 