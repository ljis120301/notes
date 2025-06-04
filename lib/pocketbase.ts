import PocketBase from 'pocketbase'

// Hardcoded PocketBase URL using machine's IP address
// This ensures all clients (localhost and network) connect to the same PocketBase instance
const POCKETBASE_URL = 'http://10.0.0.15:6969'

console.log('🚀 PocketBase: Initializing PocketBase client with IP address:', POCKETBASE_URL)

// PocketBase instance with hardcoded IP and default localStorage auth store
export const pb = new PocketBase(POCKETBASE_URL)

// Debug auth state on initialization
if (typeof window !== 'undefined') {
  console.log('🌐 PocketBase: Client-side initialization starting')
  console.log('🔗 PocketBase: Connecting to:', POCKETBASE_URL)
  console.log('🍪 PocketBase: Initial auth state - isValid:', pb.authStore.isValid)
  console.log('🍪 PocketBase: Initial auth token:', pb.authStore.token ? 'present' : 'none')
  console.log('🏁 PocketBase: Client-side initialization complete')
}

export interface Note {
  id?: string
  title: string
  content: string
  user?: string  // Optional for backward compatibility
  created?: string
  updated?: string
}

export const notesCollection = 'notes' 