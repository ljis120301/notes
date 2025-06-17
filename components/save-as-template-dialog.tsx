"use client"

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { createTemplate, getTemplateCategories } from '@/lib/templates-api'
import { toast } from 'sonner'

interface SaveAsTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteTitle: string
  noteContent: string
}

export function SaveAsTemplateDialog({ open, onOpenChange, noteTitle, noteContent }: SaveAsTemplateDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(noteTitle)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    if (open) {
      setName(noteTitle)
      setDescription('')
      setCategory('')
    }
  }, [open, noteTitle])

  const { data: categories = [] } = useQuery({
    queryKey: ['templateCategories'],
    queryFn: getTemplateCategories,
    enabled: open,
  })

  const availableCategories = useMemo(() => {
    // Site categories are those without a user
    const publicCategories = new Set(categories.filter(c => !c.users).map(c => c.name))
    // User categories are those with a user
    const userCategories = new Set(categories.filter(c => c.users).map(c => c.name))
    return {
      user: Array.from(userCategories).sort(),
      public: Array.from(publicCategories).sort(),
    }
  }, [categories])

  const createTemplateMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success('Template created successfully!')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })

  const handleSubmit = () => {
    if (!name.trim() || !category) {
      toast.error('Template name and category are required.')
      return
    }

    createTemplateMutation.mutate({
      name,
      description,
      content: noteContent,
      category,
      is_public: false,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Create a new personal template from your current note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Project Brief"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this template is for."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Select onValueChange={setCategory} value={category}>
              <SelectTrigger id="template-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.user.length > 0 && (
                  <>
                    <Label className="px-2 text-xs text-muted-foreground">My Categories</Label>
                    {availableCategories.user.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </>
                )}
                {availableCategories.public.length > 0 && (
                  <>
                     <Label className="px-2 text-xs text-muted-foreground">Site Categories</Label>
                    {availableCategories.public.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTemplateMutation.isPending}>
            {createTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 