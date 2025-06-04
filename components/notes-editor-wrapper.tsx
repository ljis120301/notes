"use client"

import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SimpleEditor } from './tiptap-templates/simple/simple-editor'
import { Button } from '@/components/ui/button'
import { Save, Trash2, Check, Clock } from 'lucide-react'
import { Note } from '@/lib/pocketbase'
import { updateNote, deleteNote } from '@/lib/notes-api'
import { toast } from 'sonner'

interface NotesEditorWrapperProps {
  note: Note
  onSave: (note: Note) => void
  onDelete: (noteId: string) => void
  onTitleChange: (title: string) => void
}

export default function NotesEditorWrapper({ 
  note, 
  onSave, 
  onDelete, 
  onTitleChange 
}: NotesEditorWrapperProps) {
  const queryClient = useQueryClient()
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Manual save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!note.id) throw new Error('No note selected')
      const result = await updateNote(note.id, { 
        title: noteTitle.trim() || 'Untitled', 
        content: noteContent 
      })
      return result
    },
    onSuccess: (updatedNote) => {
      queryClient.setQueryData(['note', updatedNote.id], updatedNote)
      queryClient.setQueryData(['notes'], (oldNotes: Note[] = []) =>
        oldNotes.map(n => n.id === updatedNote.id ? updatedNote : n)
      )
      onSave(updatedNote)
      setHasUnsavedChanges(false)
      toast.success('Note saved successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to save note: ' + error.message)
    }
  })

  // Delete note mutation  
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      if (!note.id) throw new Error('No note ID')
      await deleteNote(note.id)
      return note.id
    },
    onSuccess: (noteId) => {
      onDelete(noteId)
      toast.success('Note deleted')
    },
    onError: (error: any) => {
      toast.error('Failed to delete note: ' + error.message)
    }
  })

  // Load note content when note changes
  useEffect(() => {
    if (note) {
      const newContent = note.content || ''
      const newTitle = note.title || ''
      
      setNoteContent(newContent)
      setNoteTitle(newTitle)
      setHasUnsavedChanges(false)
    }
  }, [note.id, note.content, note.title])

  const handleContentChange = useCallback((content: string) => {
    setNoteContent(content)
    setHasUnsavedChanges(true)
  }, [])

  const handleTitleChange = useCallback((title: string) => {
    setNoteTitle(title)
    onTitleChange(title)
    setHasUnsavedChanges(true)
  }, [onTitleChange])

  const handleSave = () => {
    if (hasUnsavedChanges) {
      saveMutation.mutate()
    }
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate()
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none outline-none w-full text-foreground"
            placeholder="Note title..."
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {hasUnsavedChanges && (
              <span className="text-orange-500">Unsaved changes</span>
            )}
            {!hasUnsavedChanges && !saveMutation.isPending && (
              <>
                <Check className="h-3 w-3" />
                <span>Saved</span>
              </>
            )}
            {saveMutation.isPending && (
              <>
                <Clock className="h-3 w-3" />
                <span>Saving...</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleteNoteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-background">
        <SimpleEditor 
          initialContent={note.content || ''}
          onContentChange={handleContentChange}
          noteId={note.id}
          noteTitle={note.title || ''}
        />
      </div>
    </div>
  )
} 