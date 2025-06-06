"use client"

import { useState, useMemo, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, Plus, Pin, Folder, FolderOpen, FolderPlus, Edit3, Trash2, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger, 
  ContextMenuSeparator 
} from '@/components/ui/context-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import { Note, Folder as FolderType } from '@/lib/pocketbase'
import { getNotes, searchNotes, createNote, pinNote, unpinNote, getFolders, createFolder, updateFolder, deleteFolder, moveNoteToFolder, toggleFolderExpanded } from '@/lib/notes-api'
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
function isAutoCancelled(error: unknown): boolean {
  const err = error as { isAbort?: boolean; message?: string; status?: number }
  return err?.isAbort === true || 
         err?.message?.includes('autocancelled') || 
         err?.status === 0
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

// Smart sort function: Pinned notes first, then preserve original chronological order for unpinned notes
function smartSortNotes(notes: Note[], originalOrder: Note[]): Note[] {
  // Separate pinned and unpinned notes
  const pinnedNotes = notes.filter(note => note.pinned)
  const unpinnedNotes = notes.filter(note => !note.pinned)
  
  // Sort pinned notes by their pin time (most recently pinned first)
  const sortedPinnedNotes = pinnedNotes.sort((a, b) => {
    const aUpdated = a.updated ? new Date(a.updated).getTime() : 0
    const bUpdated = b.updated ? new Date(b.updated).getTime() : 0
    return bUpdated - aUpdated
  })
  
  // For unpinned notes, try to preserve their original chronological order
  // Create a map of original positions
  const originalPositionMap = new Map(originalOrder.map((note, index) => [note.id, index]))
  
  // Sort unpinned notes by their original position, falling back to updated time for new notes
  const sortedUnpinnedNotes = unpinnedNotes.sort((a, b) => {
    const aOriginalPos = originalPositionMap.get(a.id)
    const bOriginalPos = originalPositionMap.get(b.id)
    
    // If both notes have original positions, use those
    if (aOriginalPos !== undefined && bOriginalPos !== undefined) {
      return aOriginalPos - bOriginalPos
    }
    
    // If only one has original position, prioritize the one without (it's newer)
    if (aOriginalPos === undefined && bOriginalPos !== undefined) return -1
    if (aOriginalPos !== undefined && bOriginalPos === undefined) return 1
    
    // If neither has original position, sort by updated time (newest first)
    const aUpdated = a.updated ? new Date(a.updated).getTime() : 0
    const bUpdated = b.updated ? new Date(b.updated).getTime() : 0
    return bUpdated - aUpdated
  })
  
  // Return pinned notes first, then unpinned notes in their original order
  return [...sortedPinnedNotes, ...sortedUnpinnedNotes]
}

// Fallback sort function for when we don't have original order
function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    // First, sort by pinned status (pinned notes first)
    const aPinned = Boolean(a.pinned)
    const bPinned = Boolean(b.pinned)
    
    if (aPinned && !bPinned) return -1  // a is pinned, b is not
    if (!aPinned && bPinned) return 1   // b is pinned, a is not
    
    // If both have same pinned status, sort by updated date (most recent first)
    const aUpdated = a.updated ? new Date(a.updated).getTime() : 0
    const bUpdated = b.updated ? new Date(b.updated).getTime() : 0
    
    return bUpdated - aUpdated
  })
}

// Skeleton component for note items using Card
function NoteSkeleton() {
  return (
    <Card className="transition-colors duration-150">
      <CardContent className="p-2 sm:p-2.5">
        <div className="flex items-start space-x-2 sm:space-x-3">
          <Skeleton className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Note item component with context menu and drag/drop support
interface NoteItemProps {
  note: Note
  selectedNote: Note | null
  onSelectNote: (note: Note) => void
  onTogglePin: (note: Note, event: React.MouseEvent) => void
  onMoveToFolder: (noteId: string, folderId: string | null) => void
  folders: FolderType[]
  pinNoteMutation: { isPending: boolean }
  unpinNoteMutation: { isPending: boolean }
  isInFolder?: boolean
}

function NoteItem({ 
  note, 
  selectedNote, 
  onSelectNote, 
  onTogglePin, 
  onMoveToFolder, 
  folders,
  pinNoteMutation,
  unpinNoteMutation,
  isInFolder = false
}: NoteItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable={true}
          data-note-id={note.id}
          onDragStart={(e: React.DragEvent) => {
            if (note.id) {
              e.dataTransfer.setData('text/plain', note.id)
              e.dataTransfer.effectAllowed = 'move'
              // Add visual class for drag state
              e.currentTarget.classList.add('dragging')
            }
          }}
          onDragEnd={(e: React.DragEvent) => {
            // Remove drag visual state
            e.currentTarget.classList.remove('dragging')
          }}
          className="draggable-note"
        >
          <motion.div
            key={note.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              zIndex: (note.pinned && !isInFolder) ? 10 : 1
            }}
            exit={{ 
              opacity: 0, 
              y: -20, 
              scale: 0.95,
              transition: { duration: 0.2 }
            }}
            whileHover={{
              y: (note.pinned && !isInFolder) ? -4 : -2,
              scale: 1.02,
              transition: { duration: 0.15, ease: "easeOut" }
            }}
            transition={{
              layout: { 
                duration: 0.4, 
                ease: "easeInOut",
                type: "spring",
                stiffness: 300,
                damping: 30
              },
              default: { duration: 0.3, ease: "easeOut" }
            }}
            onClick={() => onSelectNote(note)}
            className={`motion-div group cursor-pointer rounded-xl flex items-center backdrop-blur-sm h-16 relative transition-all duration-200 ${
              note.pinned && !isInFolder
                ? 'bg-sidebar-primary/15 border border-sidebar-primary/40 shadow-lg'
                : selectedNote?.id === note.id
                ? 'bg-sidebar-primary/20 border border-sidebar-primary/30 shadow-md'
                : 'bg-sidebar-muted/50 border border-sidebar-border/50'
            } cursor-grab active:cursor-grabbing hover:shadow-lg`}
            style={{
              boxShadow: (note.pinned && !isInFolder) ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : undefined
            }}
          >
          {/* File Icon */}
          <div className={`w-10 h-10 ml-3 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            note.pinned && !isInFolder
              ? 'bg-sidebar-primary/40 shadow-md'
              : 'bg-sidebar-primary/25'
          }`}>
            <FileText className={`h-5 w-5 transition-colors duration-300 ${
              (note.pinned && !isInFolder) ? 'text-sidebar-primary' : 'text-sidebar-primary/80'
            }`} />
          </div>
          
          {/* Content */}
          <div className="flex-1 ml-3 mr-3 min-w-0 text-sidebar-foreground">
            {/* Title and Pin Row */}
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                <span className="font-semibold text-sm truncate leading-tight">
                  {note.title || 'Untitled'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-sidebar-foreground/50 whitespace-nowrap">
                  {note.updated ? formatDistanceToNow(new Date(note.updated), { addSuffix: true }) : 'Just now'}
                </span>
                {!isInFolder && (
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div 
                        className="relative"
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseLeave={(e) => e.stopPropagation()}
                      >
                        <motion.div
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.1 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 transition-all duration-200 flex-shrink-0 hover:bg-sidebar-accent/50 rounded ${
                              note.pinned ? 'opacity-80 hover:opacity-100' : 'opacity-40 group-hover:opacity-80 hover:opacity-100'
                            }`}
                            onClick={(event) => onTogglePin(note, event)}
                            disabled={pinNoteMutation.isPending || unpinNoteMutation.isPending}
                          >
                            <motion.div
                              animate={{ 
                                rotate: note.pinned ? 25 : 0,
                                scale: note.pinned ? 1.1 : 1
                              }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                              <Pin 
                                className={`h-4 w-4 transition-all duration-200 ${
                                  note.pinned 
                                    ? 'text-sidebar-primary hover:text-red-500' 
                                    : 'text-sidebar-foreground/60 hover:text-sidebar-primary'
                                }`}
                                fill={note.pinned ? 'currentColor' : 'none'}
                              />
                            </motion.div>
                          </Button>
                        </motion.div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="pointer-events-none">
                      {note.pinned ? 'Unpin note' : 'Pin note'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            
            {/* Content Preview */}
            <div className="text-xs text-sidebar-foreground/70 truncate leading-tight">
              {note.content ? 
                (() => {
                  const plainText = stripHtmlTags(note.content)
                  const maxLength = window.innerWidth < 768 ? 45 : 60
                  return plainText.length > maxLength 
                    ? plainText.substring(0, maxLength) + '...' 
                    : plainText
                })()
                : 'No content'
              }
            </div>
                                    </div>
        </motion.div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {!isInFolder && (
          <>
            <ContextMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(note, e); }}>
              <Pin className="h-4 w-4 mr-2" />
              {note.pinned ? 'Unpin Note' : 'Pin Note'}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => onMoveToFolder(note.id!, null)}>
          <FileText className="h-4 w-4 mr-2" />
          Move to Root
        </ContextMenuItem>
        {folders.map((folder) => (
          <ContextMenuItem 
            key={folder.id} 
            onClick={() => onMoveToFolder(note.id!, folder.id!)}
            disabled={note.folder_id === folder.id}
          >
            <Folder className="h-4 w-4 mr-2" />
            Move to {folder.name}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

// Folder component with proper animations
interface FolderItemProps {
  folder: FolderType
  editingFolderId: string | null
  editingFolderName: string
  notesCount: number
  onToggleFolder: (folder: FolderType) => void
  onRenameFolder: (folderId: string, currentName: string) => void
  onDeleteFolder: (folderId: string) => void
  onSaveRename: (folderId: string) => void
  onCancelRename: () => void
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => void
  setEditingFolderName: (name: string) => void
  children: React.ReactNode
}

function FolderItem({
  folder,
  editingFolderId,
  editingFolderName,
  notesCount,
  onToggleFolder,
  onRenameFolder,
  onDeleteFolder,
  onSaveRename,
  onCancelRename,
  onMoveNoteToFolder,
  setEditingFolderName,
  children
}: FolderItemProps) {
  return (
    <motion.div
      key={`folder-container-${folder.id}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      data-folder-id={folder.id}
    >
      {/* Folder header */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer group"
            onClick={() => onToggleFolder(folder)}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('bg-sidebar-primary/20', 'border-sidebar-primary/50')
            }}
            onDragLeave={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX
              const y = e.clientY
              if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                e.currentTarget.classList.remove('bg-sidebar-primary/20', 'border-sidebar-primary/50')
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('bg-sidebar-primary/20', 'border-sidebar-primary/50')
              const noteId = e.dataTransfer.getData('text/plain')
              if (noteId && noteId !== folder.id) {
                onMoveNoteToFolder(noteId, folder.id!)
              }
            }}
          >
            <motion.div
              animate={{ rotate: folder.expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
            </motion.div>
            
            {folder.expanded ? (
              <FolderOpen className="h-4 w-4 text-sidebar-primary" />
            ) : (
              <Folder className="h-4 w-4 text-sidebar-primary/70" />
            )}
            
            {editingFolderId === folder.id ? (
              <input
                type="text"
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                onBlur={() => onSaveRename(folder.id!)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveRename(folder.id!)
                  } else if (e.key === 'Escape') {
                    onCancelRename()
                  }
                }}
                className="flex-1 text-sm font-medium bg-transparent border-none outline-none focus:ring-0 text-sidebar-foreground"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm font-medium text-sidebar-foreground">
                {folder.name}
              </span>
            )}
            
            <span className="text-xs text-sidebar-foreground/50">
              {notesCount}
            </span>
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onRenameFolder(folder.id!, folder.name)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Rename Folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => onDeleteFolder(folder.id!)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Folder
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Folder contents */}
      <AnimatePresence mode="wait">
        {folder.expanded && (
          <motion.div
            key={`folder-content-${folder.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-6 space-y-1 pb-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Root drop zone component
function RootDropZone({ onMoveNoteToFolder }: { onMoveNoteToFolder: (noteId: string, folderId: string | null) => void }) {
  return (
    <motion.div
      key="root-drop-zone"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-16 rounded-lg border-2 border-dashed border-transparent transition-colors duration-200 flex items-center justify-center text-sidebar-foreground/50"
      onDragOver={(e) => {
        e.preventDefault()
        e.currentTarget.classList.add('border-sidebar-primary/50', 'bg-sidebar-primary/10')
        e.currentTarget.querySelector('.drop-text')?.classList.remove('opacity-0')
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove('border-sidebar-primary/50', 'bg-sidebar-primary/10')
        e.currentTarget.querySelector('.drop-text')?.classList.add('opacity-0')
      }}
      onDrop={(e) => {
        e.preventDefault()
        const noteId = e.dataTransfer.getData('text/plain')
        if (noteId) {
          onMoveNoteToFolder(noteId, null)
        }
        e.currentTarget.classList.remove('border-sidebar-primary/50', 'bg-sidebar-primary/10')
        e.currentTarget.querySelector('.drop-text')?.classList.add('opacity-0')
      }}
    >
      <span className="drop-text opacity-0 transition-opacity duration-200 text-xs">
        Drop here to move to root
      </span>
    </motion.div>
  )
}

const NotesSidebarComponent = forwardRef<NotesSidebarRef, NotesSidebarProps>(
  ({ selectedNote, onSelectNote, onCreateNote, isAuthenticated = false }, ref) => {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [editingFolderName, setEditingFolderName] = useState('')
    // Keep track of original note positions to restore them when unpinning
    const [originalNotesOrder, setOriginalNotesOrder] = useState<Note[]>([])

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

    // Use React Query for folders list
    const { 
      data: folders = [], 
      refetch: refetchFolders 
    } = useQuery({
      queryKey: ['folders'],
      queryFn: getFolders,
      enabled: isAuthenticated && pb.authStore.isValid,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    })

    // Update original order when notes are first loaded
    useEffect(() => {
      if (notes.length > 0 && originalNotesOrder.length === 0) {
        // Sort notes by their actual chronological order (newest first) to establish baseline
        const chronologicalOrder = [...notes].sort((a, b) => {
          const aUpdated = a.updated ? new Date(a.updated).getTime() : 0
          const bUpdated = b.updated ? new Date(b.updated).getTime() : 0
          return bUpdated - aUpdated
        })
        setOriginalNotesOrder(chronologicalOrder)
      }
    }, [notes, originalNotesOrder.length])

    // Create note mutation
    const createNoteMutation = useMutation({
      mutationFn: async () => {
        const newNote = await createNote('Untitled Note', '<h1>New Note</h1><p>Start writing your note here...</p>')
        return newNote
      },
      onSuccess: (newNote) => {
        // Add to cache immediately with animation-friendly structure
        queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
          const updatedNotes = [newNote, ...oldNotes]
          return smartSortNotes(updatedNotes, originalNotesOrder)
        })
        queryClient.setQueryData(['note', newNote.id], newNote)
        // Update original order to include the new note at the beginning
        setOriginalNotesOrder(prev => [newNote, ...prev])
        onCreateNote(newNote)
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error creating note:', error)
        }
      }
    })

    // Pin note mutation
    const pinNoteMutation = useMutation({
      mutationFn: pinNote,
      onSuccess: (updatedNote) => {
        // Update the notes list in cache with proper sorting
        queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
          const updatedNotes = oldNotes.map(note => note.id === updatedNote.id ? updatedNote : note)
          return smartSortNotes(updatedNotes, originalNotesOrder) // Apply smart sorting to maintain correct order
        })
        // Update the individual note cache
        queryClient.setQueryData(['note', updatedNote.id], updatedNote)
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error pinning note:', error)
        }
      }
    })

    // Unpin note mutation
    const unpinNoteMutation = useMutation({
      mutationFn: unpinNote,
      onSuccess: (updatedNote) => {
        // Update the notes list in cache with smart sorting to restore original position
        queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
          const updatedNotes = oldNotes.map(note => note.id === updatedNote.id ? updatedNote : note)
          return smartSortNotes(updatedNotes, originalNotesOrder) // Apply smart sorting to restore unpinned note to its original timeline position
        })
        // Update the individual note cache
        queryClient.setQueryData(['note', updatedNote.id], updatedNote)
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error unpinning note:', error)
        }
      }
    })

    // Create folder mutation
    const createFolderMutation = useMutation({
      mutationFn: async (name: string) => {
        return await createFolder(name)
      },
      onSuccess: (newFolder) => {
        queryClient.setQueryData(['folders'], (oldFolders: FolderType[] = []) => {
          return [...oldFolders, newFolder].sort((a, b) => a.name.localeCompare(b.name))
        })
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error creating folder:', error)
        }
      }
    })

    // Update folder mutation
    const updateFolderMutation = useMutation({
      mutationFn: async ({ id, data }: { id: string, data: Partial<FolderType> }) => {
        return await updateFolder(id, data)
      },
      onSuccess: (updatedFolder) => {
        queryClient.setQueryData(['folders'], (oldFolders: FolderType[] = []) => {
          return oldFolders.map(folder => 
            folder.id === updatedFolder.id ? updatedFolder : folder
          ).sort((a, b) => a.name.localeCompare(b.name))
        })
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error updating folder:', error)
        }
      }
    })

    // Delete folder mutation
    const deleteFolderMutation = useMutation({
      mutationFn: deleteFolder,
      onSuccess: (_, deletedFolderId) => {
        queryClient.setQueryData(['folders'], (oldFolders: FolderType[] = []) => {
          return oldFolders.filter(folder => folder.id !== deletedFolderId)
        })
        // Refresh notes to show any that were moved out of the deleted folder
        refetch()
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error deleting folder:', error)
        }
      }
    })

    // Move note to folder mutation
    const moveNoteToFolderMutation = useMutation({
      mutationFn: async ({ noteId, folderId }: { noteId: string, folderId: string | null }) => {
        return await moveNoteToFolder(noteId, folderId)
      },
      onSuccess: (updatedNote) => {
        queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) => {
          return oldNotes.map(note => note.id === updatedNote.id ? updatedNote : note)
        })
        queryClient.setQueryData(['note', updatedNote.id], updatedNote)
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error moving note to folder:', error)
        }
      }
    })

    // Toggle folder expanded mutation
    const toggleFolderExpandedMutation = useMutation({
      mutationFn: async ({ id, expanded }: { id: string, expanded: boolean }) => {
        return await toggleFolderExpanded(id, expanded)
      },
      onSuccess: (updatedFolder) => {
        queryClient.setQueryData(['folders'], (oldFolders: FolderType[] = []) => {
          return oldFolders.map(folder => 
            folder.id === updatedFolder.id ? updatedFolder : folder
          )
        })
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error toggling folder:', error)
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
        refetchFolders()
      }
    }), [refetch, refetchFolders])

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

    // Handle pin/unpin toggle
    const handleTogglePin = useCallback((note: Note, event: React.MouseEvent) => {
      event.stopPropagation() // Prevent note selection when clicking pin button
      
      if (!note.id || pinNoteMutation.isPending || unpinNoteMutation.isPending) {
        return
      }

      if (note.pinned) {
        unpinNoteMutation.mutate(note.id)
      } else {
        pinNoteMutation.mutate(note.id)
      }
    }, [pinNoteMutation, unpinNoteMutation])

    // Folder management handlers
    const handleCreateFolder = useCallback(() => {
      if (!pb.authStore.isValid || createFolderMutation.isPending) {
        return
      }
      const folderName = `New Folder ${folders.length + 1}`
      createFolderMutation.mutate(folderName)
    }, [createFolderMutation, folders.length])

    const handleToggleFolder = useCallback((folder: FolderType) => {
      if (!folder.id || toggleFolderExpandedMutation.isPending) {
        return
      }
      toggleFolderExpandedMutation.mutate({ 
        id: folder.id, 
        expanded: !folder.expanded 
      })
    }, [toggleFolderExpandedMutation])

    const handleRenameFolder = useCallback((folderId: string, currentName: string) => {
      setEditingFolderId(folderId)
      setEditingFolderName(currentName)
    }, [])

    const handleSaveRename = useCallback((folderId: string) => {
      if (!editingFolderName.trim() || updateFolderMutation.isPending) {
        setEditingFolderId(null)
        setEditingFolderName('')
        return
      }
      
      updateFolderMutation.mutate({
        id: folderId,
        data: { name: editingFolderName.trim() }
      })
      setEditingFolderId(null)
      setEditingFolderName('')
    }, [editingFolderName, updateFolderMutation])

    const handleCancelRename = useCallback(() => {
      setEditingFolderId(null)
      setEditingFolderName('')
    }, [])

    const handleDeleteFolder = useCallback((folderId: string) => {
      if (!folderId || deleteFolderMutation.isPending) {
        return
      }
      deleteFolderMutation.mutate(folderId)
    }, [deleteFolderMutation])

    const handleMoveNoteToFolder = useCallback((noteId: string, folderId: string | null) => {
      if (!noteId || moveNoteToFolderMutation.isPending) {
        return
      }
      moveNoteToFolderMutation.mutate({ noteId, folderId })
    }, [moveNoteToFolderMutation])

    // Organize notes by folders and standalone notes
    const organizedData = useMemo(() => {
      let notesToDisplay = searchQuery.trim() ? (searchResults || []) : notes
      
      // Deduplicate notes by ID to prevent duplicate keys error
      const seenIds = new Set<string>()
      notesToDisplay = notesToDisplay.filter(note => {
        if (note.id && seenIds.has(note.id)) {
          return false
        }
        if (note.id) seenIds.add(note.id)
        return true
      })
      
      // When searching, show flat list
      if (searchQuery.trim()) {
        return {
          folders: [],
          standaloneNotes: sortNotes(notesToDisplay),
          notesInFolders: new Map<string, Note[]>()
        }
      }
      
      // Separate notes by folder
      const standaloneNotes: Note[] = []
      const notesInFolders = new Map<string, Note[]>()
      
      notesToDisplay.forEach(note => {
        if (note.folder_id) {
          if (!notesInFolders.has(note.folder_id)) {
            notesInFolders.set(note.folder_id, [])
          }
          notesInFolders.get(note.folder_id)!.push(note)
        } else {
          standaloneNotes.push(note)
        }
      })
      
      // Sort notes within each folder and standalone notes
      const sortedStandaloneNotes = originalNotesOrder.length > 0 
        ? smartSortNotes(standaloneNotes, originalNotesOrder)
        : sortNotes(standaloneNotes)
      
      // Sort notes within folders
      notesInFolders.forEach((folderNotes, folderId) => {
        const sortedFolderNotes = originalNotesOrder.length > 0 
          ? smartSortNotes(folderNotes, originalNotesOrder)
          : sortNotes(folderNotes)
        notesInFolders.set(folderId, sortedFolderNotes)
      })
      
      return {
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
        standaloneNotes: sortedStandaloneNotes,
        notesInFolders
      }
    }, [searchQuery, searchResults, notes, folders, originalNotesOrder])

    // Don't render anything if not authenticated
    if (!isAuthenticated) {
      return (
        <div className="h-full flex items-center justify-center bg-sidebar">
          <div className="text-center text-sidebar-foreground/70">
            Please log in to view your notes
          </div>
        </div>
      )
    }

    return (
      <TooltipProvider>
        <style jsx>{`
          .draggable-note.dragging .motion-div {
            transform: scale(1.05) rotate(5deg) !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
            z-index: 50 !important;
            transition: all 0.1s ease !important;
          }
          .draggable-note.dragging {
            pointer-events: none;
          }
        `}</style>
        <div className="h-full flex flex-col bg-sidebar">
          {/* Header */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-4 sm:pb-[18px] border-b border-sidebar-border bg-sidebar" >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="font-semibold text-base sm:text-lg text-sidebar-foreground">Notes</h2>
              <div className="flex items-center space-x-2">
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleCreateFolder} 
                      size="sm" 
                      variant="ghost"
                      disabled={isLoading || createFolderMutation.isPending} 
                      className="transition-colors h-8 w-8 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    New Folder
                  </TooltipContent>
                </Tooltip>
                <Button 
                  onClick={handleCreateNote} 
                  size="sm" 
                  disabled={isLoading || createNoteMutation.isPending} 
                  className="transition-colors min-w-[60px] sm:min-w-[70px] text-xs sm:text-sm bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
                >
                  {createNoteMutation.isPending ? (
                    <div className="flex items-center space-x-1">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <span className="text-xs">...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">New</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-sidebar-foreground/60" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-sidebar-accent/50 border border-sidebar-border rounded-md focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:border-sidebar-primary transition-colors text-sidebar-foreground placeholder:text-sidebar-foreground/50"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && !isLoading && (
              <Card className="mt-2 border-destructive/20 bg-destructive/10">
                <CardContent className="p-2">
                  <p className="text-sm text-destructive">Failed to load notes</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => refetch()}
                    className="mt-1 h-6 text-xs"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notes List with Folders */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="flex-1 overflow-y-auto bg-sidebar">
                {isLoading ? (
                  <div className="space-y-2 p-2">
                    {[...Array(6)].map((_, index) => (
                      <NoteSkeleton key={index} />
                    ))}
                  </div>
                ) : organizedData.standaloneNotes.length === 0 && organizedData.folders.length === 0 ? (
                  <div className="p-3 sm:p-4 text-center">
                    <div className="text-xs sm:text-sm text-sidebar-foreground/70">
                      {searchQuery ? 'No notes found' : 'No notes yet. Create your first note!'}
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    className="space-y-1 p-2"
                    onDragOver={(e) => {
                      e.preventDefault()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const noteId = e.dataTransfer.getData('text/plain')
                      if (noteId) {
                        // Check if we're dropping in the main area (not on a specific folder)
                        const target = e.target as HTMLElement
                        if (!target.closest('[data-folder-id]') && !target.closest('[data-note-id]')) {
                          handleMoveNoteToFolder(noteId, null)
                        }
                      }
                    }}
                  >
                    <AnimatePresence mode="popLayout">
                      {/* Render folders and notes when not searching */}
                      {!searchQuery.trim() ? [
                        <motion.div
                          key="folders-and-notes-container"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Folders */}
                          {organizedData.folders.map((folder) => (
                            <FolderItem 
                              key={`folder-${folder.id}`}
                              folder={folder}
                              editingFolderId={editingFolderId}
                              editingFolderName={editingFolderName}
                              notesCount={organizedData.notesInFolders.get(folder.id!)?.length || 0}
                              onToggleFolder={handleToggleFolder}
                              onRenameFolder={handleRenameFolder}
                              onDeleteFolder={handleDeleteFolder}
                              onSaveRename={handleSaveRename}
                              onCancelRename={handleCancelRename}
                              onMoveNoteToFolder={handleMoveNoteToFolder}
                              setEditingFolderName={setEditingFolderName}
                            >
                              {organizedData.notesInFolders.get(folder.id!)?.map((note) => (
                                <NoteItem 
                                  key={`folder-${folder.id}-note-${note.id}`} 
                                  note={note} 
                                  selectedNote={selectedNote}
                                  onSelectNote={onSelectNote}
                                  onTogglePin={handleTogglePin}
                                  onMoveToFolder={handleMoveNoteToFolder}
                                  folders={organizedData.folders}
                                  pinNoteMutation={pinNoteMutation}
                                  unpinNoteMutation={unpinNoteMutation}
                                  isInFolder={true}
                                />
                              ))}
                            </FolderItem>
                          ))}
                          
                          {/* Standalone notes */}
                          <div className="space-y-2">
                            {organizedData.standaloneNotes.map((note) => (
                              <NoteItem 
                                key={`standalone-note-${note.id}`} 
                                note={note} 
                                selectedNote={selectedNote}
                                onSelectNote={onSelectNote}
                                onTogglePin={handleTogglePin}
                                onMoveToFolder={handleMoveNoteToFolder}
                                folders={organizedData.folders}
                                pinNoteMutation={pinNoteMutation}
                                unpinNoteMutation={unpinNoteMutation}
                                isInFolder={false}
                              />
                            ))}
                          </div>
                        </motion.div>,
                        <RootDropZone key="root-drop-zone-main" onMoveNoteToFolder={handleMoveNoteToFolder} />
                      ] : 
                      /* Show flat list when searching */
                      organizedData.standaloneNotes.map((note) => (
                        <NoteItem 
                          key={`search-note-${note.id}`} 
                          note={note} 
                          selectedNote={selectedNote}
                          onSelectNote={onSelectNote}
                          onTogglePin={handleTogglePin}
                          onMoveToFolder={handleMoveNoteToFolder}
                          folders={organizedData.folders}
                          pinNoteMutation={pinNoteMutation}
                          unpinNoteMutation={unpinNoteMutation}
                          isInFolder={false}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={handleCreateFolder}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCreateNote}>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </TooltipProvider>
    )
  }
)

NotesSidebarComponent.displayName = 'NotesSidebar'

export { NotesSidebarComponent as NotesSidebar } 