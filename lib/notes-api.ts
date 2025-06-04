import { pb, Note, notesCollection } from './pocketbase'

// Helper function to ensure user is authenticated
function ensureAuth() {
  if (!pb.authStore.isValid || !pb.authStore.model?.id) {
    throw new Error('User not authenticated')
  }
  return pb.authStore.model.id
}

// Helper function to check if error is auto-cancellation
function isAutoCancelled(error: any): boolean {
  return error?.isAbort === true || 
         error?.message?.includes('autocancelled') || 
         error?.status === 0
}

// Image upload function for markdown notes
export async function uploadImage(file: File): Promise<string> {
  const userId = ensureAuth()
  
  const formData = new FormData()
  formData.append('image', file)
  formData.append('user', userId)

  try {
    const record = await pb.collection('note_images').create(formData)
    // Return the file URL that can be used in markdown
    const imageUrl = pb.files.getURL(record, record.image)
    return imageUrl
  } catch (error: any) {
    if (isAutoCancelled(error)) {
      console.log('Upload image request was auto-cancelled')
      throw new Error('Upload cancelled')
    }
    console.error('Failed to upload image:', error)
    throw new Error('Failed to upload image')
  }
}

// Helper function to check if user field exists in notes collection
async function checkUserFieldExists(): Promise<boolean> {
  try {
    // Try to get collection info to check if user field exists
    const result = await pb.collection(notesCollection).getFullList({
      page: 1,
      perPage: 1,
      filter: 'id != ""'
    })
    return true
  } catch (error: any) {
    if (error.message?.includes('user') || error.status === 400) {
      return false
    }
    throw error
  }
}

export async function createNote(title: string, content: string = ''): Promise<Note> {
  const userId = ensureAuth()
  
  try {
    const record = await pb.collection(notesCollection).create({
      title,
      content,
      user: userId
    })
    return record as unknown as Note
  } catch (error: any) {
    if (isAutoCancelled(error)) {
      // Auto-cancelled request, silently ignore
      console.log('Create note request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    
    if (error.status === 400 && error.message?.includes('user')) {
      // User field doesn't exist, create without it for now
      console.warn('User field not found in notes collection. Creating note without user association.')
      const record = await pb.collection(notesCollection).create({
        title,
        content
      })
      return record as unknown as Note
    }
    throw error
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
    return records as unknown as Note[]
  } catch (error: any) {
    if (isAutoCancelled(error)) {
      // Auto-cancelled request, silently return empty array and let other request complete
      console.log('Get notes request was auto-cancelled')
      return []
    }
    
    if (error.status === 400) {
      // User field doesn't exist, get all notes for now
      console.warn('User field not found in notes collection. Showing all notes.')
      try {
        const records = await pb.collection(notesCollection).getFullList({
          sort: '-updated'
        })
        return records as unknown as Note[]
      } catch (fallbackError: any) {
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
    
    return record as unknown as Note
  } catch (error: any) {
    if (isAutoCancelled(error)) {
      console.log('Get note request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    
    if (error.status === 404) {
      throw new Error('Note not found')
    }
    throw error
  }
}

export async function updateNote(id: string, data: Partial<Note>): Promise<Note> {
  const userId = ensureAuth()
  
  console.log('🔄 notes-api updateNote called with:', {
    id,
    data: {
      title: data.title,
      contentLength: data.content?.length || 0,
      contentPreview: data.content?.substring(0, 100) || 'NO CONTENT'
    }
  })
  
  try {
    // First verify we can access the note
    await getNote(id)
    
    // Update the note
    const record = await pb.collection(notesCollection).update(id, data)
    
    console.log('✅ notes-api updateNote successful, returned:', {
      id: record.id,
      title: record.title,
      contentLength: record.content?.length || 0,
      contentPreview: record.content?.substring(0, 100) || 'NO CONTENT'
    })
    
    return record as unknown as Note
  } catch (error: any) {
    if (isAutoCancelled(error)) {
      console.log('Update note request was auto-cancelled')
      throw new Error('Request cancelled')
    }
    console.error('❌ notes-api updateNote failed:', error)
    throw error
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  const userId = ensureAuth()
  
  try {
    // First verify we can access the note
    await getNote(id)
    
    // Delete the note
    await pb.collection(notesCollection).delete(id)
    return true
  } catch (error: any) {
    if (isAutoCancelled(error)) {
      console.log('Delete note request was auto-cancelled')
      return false
    }
    throw error
  }
}

export async function searchNotes(query: string): Promise<Note[]> {
  const userId = ensureAuth()
  
  if (!query.trim()) {
    return getNotes()
  }
  
  try {
    // First try with user filter
    const records = await pb.collection(notesCollection).getFullList({
      filter: `user = "${userId}" && (title ~ "${query}" || content ~ "${query}")`,
      sort: '-updated'
    })
    return records as unknown as Note[]
  } catch (error: any) {
    if (isAutoCancelled(error)) {
      console.log('Search notes request was auto-cancelled')
      return []
    }
    
    if (error.status === 400) {
      // User field doesn't exist, search all notes for now
      console.warn('User field not found in notes collection. Searching all notes.')
      try {
        const records = await pb.collection(notesCollection).getFullList({
          filter: `title ~ "${query}" || content ~ "${query}"`,
          sort: '-updated'
        })
        return records as unknown as Note[]
      } catch (fallbackError: any) {
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