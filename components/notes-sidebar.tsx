"use client"

import { useState, useMemo, forwardRef, useImperativeHandle, useCallback, useEffect, memo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, Plus, Pin, Folder, FolderOpen, FolderPlus, Edit3, Trash2, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Note, Folder as FolderType } from '@/lib/pocketbase'
import { searchNotes, createNote, pinNote, unpinNote, getFolders, createFolder, updateFolder, deleteFolder, moveNoteToFolder, bulkDeleteNotes, getNotesByProfile, getNote } from '@/lib/notes-api'
import { ProfileSelector } from '@/components/profile-selector'
import { useProfile } from '@/lib/profile-context'

import { formatDistanceToNow } from 'date-fns'
import { pb } from '@/lib/pocketbase'
import { useVirtualizer } from '@tanstack/react-virtual'

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

// Ultra-lightweight tag stripper for quick preview – avoids DOM allocations
function quickStrip(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Lightweight preview cache to avoid recomputing strip/regex on every mount
const previewCache = new Map<string, { raw: string; preview: string }>()

function getPreview(noteId: string | undefined, html: string | undefined): string {
  if (!noteId || !html) return 'No content'
  const cached = previewCache.get(noteId)
  if (cached && cached.raw === html) return cached.preview
  const plain = quickStrip(html)
  const max = typeof window === 'undefined' || window.innerWidth < 768 ? 45 : 60
  const preview = plain.length > max ? plain.slice(0, max) + '...' : plain
  previewCache.set(noteId, { raw: html, preview })
  return preview
}

// Smart sort function: Pinned notes first, then preserve original chronological order for unpinned notes
// Removed legacy smartSortNotes to avoid unused-vars; consistent sorting now uses sortNotes

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
          <Skeleton className="w-4 h-4 mt-0.5 shrink-0" />
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
  /** Whether this note is the currently active (opened) note */
  isActive: boolean
  onSelectNote: (note: Note) => void
  onTogglePin: (note: Note, event: React.MouseEvent) => void
  onMoveToFolder: (noteId: string, folderId: string | null) => void
  folders: FolderType[]
  pinNoteMutation: { isPending: boolean }
  unpinNoteMutation: { isPending: boolean }
  isInFolder?: boolean
  // Edit mode props
  isEditMode?: boolean
  isSelected?: boolean
  onSelectionChange?: (noteId: string, checked: boolean) => void
}

const NoteItem = memo(function NoteItem({ 
  note, 
  isActive,
  onSelectNote, 
  onTogglePin, 
  onMoveToFolder, 
  folders,
  pinNoteMutation,
  unpinNoteMutation,
  isInFolder = false,
  isEditMode = false,
  isSelected = false,
  onSelectionChange
}: NoteItemProps) {
  const queryClient = useQueryClient()

  // Prefetch note data on hover for instant open
  const handleMouseEnter = useCallback(() => {
    if (note.id) {
      queryClient.prefetchQuery({
        queryKey: ['note', note.id],
        queryFn: () => getNote(note.id!)
      })
    }
  }, [note.id, queryClient])

  // Memoised preview text & relative date – heavy ops only when data changes
  const previewText = useMemo(() => getPreview(note.id, note.content), [note.id, note.content])

  const relativeUpdated = useMemo(() => {
    return note.updated
      ? formatDistanceToNow(new Date(note.updated), { addSuffix: true })
      : 'Just now'
  }, [note.updated])

  return (
    <>
      <style jsx>{`
        .note-card-wrapper,
        .note-card-wrapper :global(*) {
          cursor: pointer;
        }

        /* Allow buttons within the card to have their own cursor behavior */
        .note-card-wrapper :global(button),
        .note-card-wrapper :global(button *) {
          cursor: auto;
        }

        .note-card-wrapper.dragging,
        .note-card-wrapper.dragging :global(*) {
          cursor: grabbing !important;
        }
      `}</style>
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
            className={`note-card-wrapper motion-div group rounded-xl flex items-center h-16 relative transition-transform duration-150 ${
              note.pinned && !isInFolder
                ? 'bg-sidebar-primary/15 border border-sidebar-primary/40 shadow-lg'
                : isActive
                ? 'bg-sidebar-primary/20 border border-sidebar-primary/30 shadow-md'
                : 'bg-sidebar-muted/50 border border-sidebar-border/50'
            } hover:shadow-lg hover:-translate-y-[2px] hover:scale-[1.02]`}
            style={{
              boxShadow: (note.pinned && !isInFolder) ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : undefined
            }}
            onMouseEnter={handleMouseEnter}
            onClick={() => {
              if (isEditMode) {
                onSelectionChange?.(note.id!, !isSelected)
              } else {
                onSelectNote(note)
              }
            }}
          >
            {/* Selection Checkbox (in edit mode) */}
            {isEditMode && (
              <div className="ml-3 flex items-center justify-center shrink-0">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    onSelectionChange?.(note.id!, !!checked)
                  }}
                  className="h-4 w-4"
                />
              </div>
            )}
            
            {/* File Icon */}
            <div className={`w-10 h-10 ${isEditMode ? 'ml-2' : 'ml-3'} rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
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
                    {relativeUpdated}
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
                              className={`pin-button h-6 w-6 p-0 transition-opacity duration-200 shrink-0 hover:bg-sidebar-accent/50 rounded ${
                                note.pinned ? 'opacity-80 hover:opacity-100' : 'opacity-40 hover:opacity-80'
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
                {previewText}
              </div>
            </div>
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
          {folders.map((f) => (
            <ContextMenuItem
              key={f.id}
              onClick={() => onMoveToFolder(note.id!, f.id!)}
              disabled={note.folder_id === f.id}
            >
              <Folder className="h-4 w-4 mr-2" />
              Move to {f.name}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
    </>
  )
}, areEqualNoteItem)

function areEqualNoteItem(prev: NoteItemProps, next: NoteItemProps) {
  return (
    prev.note === next.note &&
    prev.isActive === next.isActive &&
    prev.isInFolder === next.isInFolder &&
    prev.isEditMode === next.isEditMode &&
    prev.isSelected === next.isSelected &&
    prev.pinNoteMutation.isPending === next.pinNoteMutation.isPending &&
    prev.unpinNoteMutation.isPending === next.unpinNoteMutation.isPending
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
              <Input
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
                className="flex-1 h-7 text-sm font-medium bg-background/60"
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

// ---------- Local folder expanded persistence helpers ----------
function getExpandedKey(userId?: string) {
  return `folder_expanded_${userId || 'anonymous'}`
}

function loadExpandedMap(userId?: string): Record<string, boolean> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(getExpandedKey(userId)) : null
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveExpandedMap(userId: string | undefined, map: Record<string, boolean>) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getExpandedKey(userId), JSON.stringify(map))
    }
  } catch {}
}

// ---------- Virtualized list wrapper to render large note arrays efficiently ----------
interface VirtualizedNoteListProps {
  notes: Note[]
  render: (note: Note) => React.ReactNode
}

function VirtualizedNoteList({ notes, render }: VirtualizedNoteListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const rowVirtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // typical row height incl. margin
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="relative overflow-y-auto overflow-x-hidden max-h-full">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const note = notes[virtualRow.index]
          return (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {render(note)}
            </div>
          )
        })}
      </div>
    </div>
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
    
    // Edit mode and bulk selection state
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

    // Profile context
    const { selectedProfile, setSelectedProfile } = useProfile()

    // Map of folderId -> expanded (local only)
    const [folderExpandedMap, setFolderExpandedMap] = useState<Record<string, boolean>>(() =>
      loadExpandedMap(pb.authStore.model?.id)
    )

    // Use React Query for notes list - unified cache key with client-side filtering
    const { 
      data: notes = [], 
      isLoading, 
      error, 
      refetch 
    } = useQuery({
      queryKey: ['notes-by-profile', selectedProfile?.id || 'no-profile'],
      queryFn: () => getNotesByProfile(selectedProfile?.id || null),
      enabled: isAuthenticated && pb.authStore.isValid,
      staleTime: 1 * 60 * 1000, // 1 minute (shorter for profile switches)
      gcTime: 3 * 60 * 1000, // 3 minutes
    })

    // Use React Query for folders list - unified cache key with client-side filtering
    const { 
      data: folders = [], 
      refetch: refetchFolders 
    } = useQuery({
      queryKey: ['folders-by-profile', selectedProfile?.id || 'no-profile'],
      queryFn: () => getFolders(selectedProfile?.id),
      enabled: isAuthenticated && pb.authStore.isValid,
      staleTime: 1 * 60 * 1000, // 1 minute (shorter for profile switches)
      gcTime: 3 * 60 * 1000, // 3 minutes
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
      mutationFn: async (templateContent?: string) => {
        const content = templateContent || '<h1>New Note</h1><p>Start writing your note here...</p>'
        const newNote = await createNote('Untitled Note', content, selectedProfile?.id)
        return newNote
      },
      onSuccess: (newNote) => {
        // Invalidate and refetch profile-specific cache
        queryClient.invalidateQueries({ queryKey: ['notes-by-profile', selectedProfile?.id || 'no-profile'] })
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
        // Invalidate cache to refetch with new pin status
        queryClient.invalidateQueries({ queryKey: ['notes-by-profile', selectedProfile?.id || 'no-profile'] })
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
        // Invalidate cache to refetch with new pin status
        queryClient.invalidateQueries({ queryKey: ['notes-by-profile', selectedProfile?.id || 'no-profile'] })
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
        return await createFolder(name, selectedProfile?.id)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['folders-by-profile', selectedProfile?.id || 'no-profile'] })
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['folders-by-profile', selectedProfile?.id || 'no-profile'] })
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['folders-by-profile', selectedProfile?.id || 'no-profile'] })
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
        queryClient.invalidateQueries({ queryKey: ['notes-by-profile', selectedProfile?.id || 'no-profile'] })
        queryClient.setQueryData(['note', updatedNote.id], updatedNote)
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error moving note to folder:', error)
        }
      }
    })

    // Toggle folder expanded local handler (no server write)
    const handleToggleFolder = useCallback(
      (folder: FolderType) => {
        setFolderExpandedMap((prev) => {
          const newMap = { ...prev, [folder.id!]: !prev[folder.id!] }
          saveExpandedMap(pb.authStore.model?.id, newMap)
          return newMap
        })
        // Update cache so UI re-renders without refetch
        queryClient.setQueryData<FolderType[]>(
          ['folders-by-profile', selectedProfile?.id || 'no-profile'],
          (old) => old?.map((f) => (f.id === folder.id ? { ...f, expanded: !f.expanded } : f)) || []
        )
      },
      [queryClient, selectedProfile?.id]
    )

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
      mutationFn: async (noteIds: string[]) => {
        return await bulkDeleteNotes(noteIds)
      },
      onSuccess: (result) => {
        // Invalidate cache to refetch without deleted notes
        queryClient.invalidateQueries({ queryKey: ['notes-by-profile', selectedProfile?.id || 'no-profile'] })
        
        // Remove from individual caches
        result.success.forEach(noteId => {
          queryClient.removeQueries({ queryKey: ['note', noteId] })
        })
        
        // Update original order to remove deleted notes
        setOriginalNotesOrder(prev => prev.filter(note => !result.success.includes(note.id!)))
        
        // Clear selection and exit edit mode
        setSelectedNoteIds(new Set())
        setIsEditMode(false)
        setBulkDeleteDialogOpen(false)
        
        // If currently selected note was deleted, clear selection
        if (selectedNote?.id && result.success.includes(selectedNote.id)) {
          // Find the first remaining note to select
          const remainingNotes = notes.filter(note => !result.success.includes(note.id!))
          if (remainingNotes.length > 0) {
            onSelectNote(remainingNotes[0])
          }
        }
        
        // Show success message
        const totalRequested = selectedNoteIds.size
        const successCount = result.success.length
        const failedCount = result.failed.length
        
        if (failedCount === 0) {
          console.log(`Successfully deleted ${successCount} note${successCount !== 1 ? 's' : ''}`)
        } else {
          console.log(`Deleted ${successCount}/${totalRequested} notes. ${failedCount} failed.`)
        }
      },
      onError: (error: unknown) => {
        if (!isAutoCancelled(error)) {
          console.error('Error bulk deleting notes:', error)
        }
        setBulkDeleteDialogOpen(false)
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
      createNoteMutation.mutate(undefined)
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
      
      // Sort notes within each folder and standalone notes by recency (and pinned)
      const sortedStandaloneNotes = sortNotes(standaloneNotes)
      
      // Sort notes within folders
      notesInFolders.forEach((folderNotes, folderId) => {
        const sortedFolderNotes = sortNotes(folderNotes)
        notesInFolders.set(folderId, sortedFolderNotes)
      })
      
      return {
        folders: folders.slice().sort((a, b) => a.name.localeCompare(b.name)),
        standaloneNotes: sortedStandaloneNotes,
        notesInFolders
      }
    }, [searchQuery, searchResults, notes, folders])

    // Reset edit mode when switching profiles to prevent stale state
    useEffect(() => {
      setIsEditMode(false)
      setSelectedNoteIds(new Set())
    }, [selectedProfile?.id])

    // Edit mode and selection handlers (defined after organizedData)
    const handleToggleEditMode = useCallback(() => {
      setIsEditMode(prev => {
        if (prev) {
          // Exiting edit mode, clear selections
          setSelectedNoteIds(new Set())
        }
        return !prev
      })
    }, [])

    const handleSelectNote = useCallback((noteId: string, checked: boolean) => {
      setSelectedNoteIds(prev => {
        const newSet = new Set(prev)
        if (checked) {
          newSet.add(noteId)
        } else {
          newSet.delete(noteId)
        }
        return newSet
      })
    }, [])

    const handleSelectAll = useCallback((checked: boolean) => {
      if (checked) {
        // Select all visible notes
        const visibleNotes = searchQuery.trim() 
          ? (searchResults || [])
          : organizedData.standaloneNotes.concat(
              Array.from(organizedData.notesInFolders.values()).flat()
            )
        setSelectedNoteIds(new Set(visibleNotes.map(note => note.id!).filter(Boolean)))
      } else {
        setSelectedNoteIds(new Set())
      }
    }, [searchQuery, searchResults, organizedData])

    const handleBulkDelete = useCallback(() => {
      if (selectedNoteIds.size === 0) return
      setBulkDeleteDialogOpen(true)
    }, [selectedNoteIds])

    const confirmBulkDelete = useCallback(() => {
      if (selectedNoteIds.size === 0 || bulkDeleteMutation.isPending) return
      bulkDeleteMutation.mutate(Array.from(selectedNoteIds))
    }, [selectedNoteIds, bulkDeleteMutation])

    // Apply local expanded map whenever folders list updates
    useEffect(() => {
      if (folders.length === 0) return
      const mapped = folders.map((f) => ({ ...f, expanded: folderExpandedMap[f.id!] ?? f.expanded }))
      queryClient.setQueryData(['folders-by-profile', selectedProfile?.id || 'no-profile'], mapped)
    }, [folders, folderExpandedMap, selectedProfile?.id, queryClient])

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
        <div key={selectedProfile?.id || 'no-profile'} className="h-full flex flex-col bg-sidebar">
          {/* Header */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-4 sm:pb-[18px] border-b border-sidebar-border bg-sidebar" >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="font-semibold text-base sm:text-lg text-sidebar-foreground">Notes</h2>
              <div className="flex items-center space-x-2">
                {!isEditMode ? (
                  <>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={handleToggleEditMode}
                          size="sm" 
                          variant="ghost"
                          disabled={isLoading || notes.length === 0} 
                          className="transition-colors h-8 w-8 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Edit Mode
                      </TooltipContent>
                    </Tooltip>
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
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={handleToggleEditMode}
                      size="sm" 
                      variant="ghost"
                      className="transition-colors h-8 w-8 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {selectedNoteIds.size > 0 && (
                      <Button 
                        onClick={handleBulkDelete}
                        size="sm" 
                        variant="destructive"
                        disabled={bulkDeleteMutation.isPending}
                        className="transition-colors text-xs sm:text-sm"
                      >
                        {bulkDeleteMutation.isPending ? (
                          <div className="flex items-center space-x-1">
                            <Skeleton className="w-3 h-3 rounded-full" />
                            <span className="text-xs">...</span>
                          </div>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span>Delete ({selectedNoteIds.size})</span>
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Profile Selector */}
            {isAuthenticated && (
              <div className="mb-3 sm:mb-4">
                <ProfileSelector
                  selectedProfile={selectedProfile}
                  onSelectProfile={setSelectedProfile}
                  isAuthenticated={isAuthenticated}
                  className="w-full"
                />
              </div>
            )}
            
            {/* Selection controls in edit mode */}
            {isEditMode && (
              <div className="flex items-center justify-between mb-3 text-sm text-sidebar-foreground/70">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedNoteIds.size > 0}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    className="h-4 w-4"
                  />
                  <span>
                    {selectedNoteIds.size === 0 
                      ? 'Select All' 
                      : `${selectedNoteIds.size} selected`
                    }
                  </span>
                </div>
              </div>
            )}
            
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
                    key={`notes-container-${selectedProfile?.id || 'no-profile'}`}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                        <AnimatePresence mode="wait">
                      {/* Render folders and notes when not searching */}
                      {!searchQuery.trim() ? (
                        <motion.div
                          key={`folders-and-notes-${selectedProfile?.id || 'no-profile'}`}
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
                                  isActive={selectedNote?.id === note.id}
                                  onSelectNote={onSelectNote}
                                  onTogglePin={handleTogglePin}
                                  onMoveToFolder={handleMoveNoteToFolder}
                                  folders={organizedData.folders}
                                  pinNoteMutation={pinNoteMutation}
                                  unpinNoteMutation={unpinNoteMutation}
                                  isInFolder={true}
                                  isEditMode={isEditMode}
                                  isSelected={selectedNoteIds.has(note.id!)}
                                  onSelectionChange={handleSelectNote}
                                />
                              ))}
                            </FolderItem>
                          ))}
                          
                          {/* Standalone notes (virtualized) */}
                          <VirtualizedNoteList
                            notes={organizedData.standaloneNotes}
                            render={(note) => (
                              <NoteItem
                                key={`standalone-note-${note.id}`}
                                note={note}
                                isActive={selectedNote?.id === note.id}
                                onSelectNote={onSelectNote}
                                onTogglePin={handleTogglePin}
                                onMoveToFolder={handleMoveNoteToFolder}
                                folders={organizedData.folders}
                                pinNoteMutation={pinNoteMutation}
                                unpinNoteMutation={unpinNoteMutation}
                                isInFolder={false}
                                isEditMode={isEditMode}
                                isSelected={selectedNoteIds.has(note.id!)}
                                onSelectionChange={handleSelectNote}
                              />
                            )}
                          />
                          
                          <RootDropZone onMoveNoteToFolder={handleMoveNoteToFolder} />
                        </motion.div>
                      ) : (
                        /* Show flat list when searching */
                        <motion.div
                          key={`search-results-${selectedProfile?.id || 'no-profile'}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <VirtualizedNoteList
                            notes={organizedData.standaloneNotes}
                            render={(note) => (
                              <NoteItem
                                key={`search-note-${note.id}`}
                                note={note}
                                isActive={selectedNote?.id === note.id}
                                onSelectNote={onSelectNote}
                                onTogglePin={handleTogglePin}
                                onMoveToFolder={handleMoveNoteToFolder}
                                folders={organizedData.folders}
                                pinNoteMutation={pinNoteMutation}
                                unpinNoteMutation={unpinNoteMutation}
                                isInFolder={false}
                                isEditMode={isEditMode}
                                isSelected={selectedNoteIds.has(note.id!)}
                                onSelectionChange={handleSelectNote}
                              />
                            )}
                          />
                        </motion.div>
                      )}
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
          
          {/* Bulk Delete Confirmation Dialog */}
          <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Notes</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedNoteIds.size} note{selectedNoteIds.size !== 1 ? 's' : ''}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    )
  }
)

NotesSidebarComponent.displayName = 'NotesSidebar'

export { NotesSidebarComponent as NotesSidebar } 