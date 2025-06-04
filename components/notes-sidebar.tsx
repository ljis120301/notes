"use client"

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Note } from '@/lib/pocketbase'
import { getNotes, searchNotes, createNote } from '@/lib/notes-api'
import { formatDistanceToNow } from 'date-fns'
import { pb } from '@/lib/pocketbase'

interface NotesSidebarProps {
  selectedNote: Note | null
  onSelectNote: (note: Note) => void
  onCreateNote: (note: Note) => void
  isAuthenticated?: boolean
}

export interface NotesSidebarRef {
  refreshNotes: () => void
}

// Helper function to check if error is auto-cancellation
function isAutoCancelled(error: any): boolean {
  return error?.isAbort === true || 
         error?.message?.includes('autocancelled') || 
         error?.status === 0
}

// Helper function to strip HTML tags and get plain text
function stripHtmlTags(html: string): string {
  // Create a temporary div element to parse HTML
  const tempDiv = document.createElement('div')
  
  // Add spaces around block-level elements to preserve spacing
  const htmlWithSpaces = html.replace(/<\/(h[1-6]|p|div|section|article|header|footer|main|aside|nav|blockquote|pre|hr|br)>/gi, '</$1> ')
  
  tempDiv.innerHTML = htmlWithSpaces
  // Get text content and clean up extra whitespace
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  // Clean up multiple spaces and line breaks
  return textContent.replace(/\s+/g, ' ').trim()
}

// Skeleton component for note items
function NoteSkeleton() {
  return (
    <div className="p-3 rounded-md border border-border">
      <div className="flex items-start space-x-3">
        <Skeleton className="w-4 h-4 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  )
}

const NotesSidebarComponent = forwardRef<NotesSidebarRef, NotesSidebarProps>(
  ({ selectedNote, onSelectNote, onCreateNote, isAuthenticated = false }, ref) => {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

    // Use React Query for notes list
    const { 
      data: notes = [], 
      isLoading, 
      error, 
      refetch 
    } = useQuery({
      queryKey: ['notes'],
      queryFn: getNotes,
      enabled: isAuthenticated && pb.authStore.isValid,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    })

    // Create note mutation
    const createNoteMutation = useMutation({
      mutationFn: async () => {
        const newNote = await createNote('Untitled Note', '<h1>New Note</h1><p>Start writing your note here...</p>')
        return newNote
      },
      onSuccess: (newNote) => {
        // Add to cache immediately
        queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => [newNote, ...oldNotes])
        queryClient.setQueryData(['note', newNote.id], newNote)
        onCreateNote(newNote)
      },
      onError: (error: any) => {
        if (!isAutoCancelled(error)) {
          console.error('Error creating note:', error)
        }
      }
    })

    // Search notes
    const { data: searchResults } = useQuery({
      queryKey: ['notes', 'search', searchQuery],
      queryFn: () => searchNotes(searchQuery),
      enabled: isAuthenticated && pb.authStore.isValid && searchQuery.trim().length > 0,
      staleTime: 1 * 60 * 1000, // 1 minute for search results
    })

    // Expose refreshNotes method to parent
    useImperativeHandle(ref, () => ({
      refreshNotes: () => {
        refetch()
      }
    }), [refetch])

    // Debounced search function
    const handleSearch = useCallback((query: string) => {
      setSearchQuery(query)
    }, [])

    const handleCreateNote = useCallback(() => {
      if (!pb.authStore.isValid || createNoteMutation.isPending) {
        return
      }
      createNoteMutation.mutate()
    }, [createNoteMutation])

    // Use search results if searching, otherwise use all notes
    const displayedNotes = searchQuery.trim() ? (searchResults || []) : notes

    // Cleanup timeouts
    useEffect(() => {
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }, [])

    // Don't render anything if not authenticated
    if (!isAuthenticated) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            Please log in to view your notes
          </div>
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Notes</h2>
            <Button 
              onClick={handleCreateNote} 
              size="sm" 
              disabled={isLoading || createNoteMutation.isPending} 
              className="transition-colors min-w-[70px]"
            >
              {createNoteMutation.isPending ? (
                <div className="flex items-center space-x-1">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <span className="text-xs">...</span>
                </div>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </>
              )}
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && !isLoading && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">Failed to load notes</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                className="mt-1 h-6 text-xs"
              >
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[...Array(6)].map((_, index) => (
                <NoteSkeleton key={index} />
              ))}
            </div>
          ) : displayedNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No notes found' : 'No notes yet. Create your first note!'}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {displayedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors duration-150 ${
                    selectedNote?.id === note.id
                      ? 'bg-accent border-accent-foreground/20'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate mb-1 cursor-pointer">
                        {note.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mb-2 cursor-pointer">
                        {note.content ? 
                          (() => {
                            const plainText = stripHtmlTags(note.content)
                            return plainText.length > 60 
                              ? plainText.substring(0, 60) + '...' 
                              : plainText
                          })()
                          : 'No content'
                        }
                      </div>
                      <div className="text-xs text-muted-foreground cursor-pointer">
                        {note.updated ? formatDistanceToNow(new Date(note.updated), { addSuffix: true }) : 'Just now'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)

NotesSidebarComponent.displayName = 'NotesSidebar'

export { NotesSidebarComponent as NotesSidebar } 