"use client"

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, FileText, Sparkles, Plus, Clock, User, Tag, Eye, Globe } from 'lucide-react'
import { getTemplates, incrementTemplateUsage, DEFAULT_TEMPLATES } from '@/lib/templates-api'
import { Template, Note } from '@/lib/pocketbase'
import { createNote } from '@/lib/notes-api'
import { toast } from 'sonner'

// Template preview component
function TemplatePreview({ content }: { content: string }) {
  const previewContent = content
    // Clean up the HTML for preview
    .replace(/<h1>/g, '<div class="preview-h1">')
    .replace(/<\/h1>/g, '</div>')
    .replace(/<h2>/g, '<div class="preview-h2">')
    .replace(/<\/h2>/g, '</div>')
    .replace(/<h3>/g, '<div class="preview-h3">')
    .replace(/<\/h3>/g, '</div>')
    .replace(/<p>/g, '<div class="preview-p">')
    .replace(/<\/p>/g, '</div>')
    .replace(/<ul>/g, '<div class="preview-ul">')
    .replace(/<\/ul>/g, '</div>')
    .replace(/<li>/g, '<div class="preview-li">• ')
    .replace(/<\/li>/g, '</div>')
    .replace(/<strong>/g, '<span class="preview-strong">')
    .replace(/<\/strong>/g, '</span>')
    .replace(/<em>/g, '<span class="preview-em">')
    .replace(/<\/em>/g, '</span>')

  return (
    <motion.div 
      className="relative w-full h-32 bg-background border border-border rounded-md overflow-hidden"
      whileHover={{ 
        borderColor: 'hsl(var(--primary) / 0.3)',
        scale: 1.005,
        y: -2
      }}
      transition={{ 
        duration: 0.2, 
        ease: "easeOut" 
      }}
    >
      {/* Preview Header - Document-like styling */}
      <motion.div 
        className="bg-muted/50 border-b border-border/50"
        whileHover={{ 
          backgroundColor: 'hsl(var(--muted) / 0.7)' 
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Preview Content */}
      <div className="p-2 h-40 overflow-hidden">
        <motion.div 
          className="text-[6px] leading-tight text-foreground/70 preview-content"
          dangerouslySetInnerHTML={{ __html: previewContent }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      
      {/* Preview Overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none"
        whileHover={{ 
          background: 'linear-gradient(to bottom, transparent, transparent, hsl(var(--background) / 0.6))' 
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Preview Icon */}
      <motion.div 
        className="absolute top-1 right-1"
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ 
          opacity: 1, 
          scale: 1,
          rotate: [0, -10, 10, 0]
        }}
        transition={{ 
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
          rotate: { duration: 0.4, ease: "easeInOut" }
        }}
      >
        <motion.div 
          className="bg-background/90 backdrop-blur-sm rounded-full p-1"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.1 }}
        >
          <Eye className="h-3 w-3 text-muted-foreground" />
        </motion.div>
      </motion.div>
      
      <style jsx>{`
        .preview-content .preview-h1 {
          font-size: 8px;
          font-weight: 600;
          margin-bottom: 2px;
          color: rgb(15 23 42);
        }
        .preview-content .preview-h2 {
          font-size: 7px;
          font-weight: 600;
          margin-bottom: 1px;
          color: rgb(30 41 59);
        }
        .preview-content .preview-h3 {
          font-size: 6px;
          font-weight: 500;
          margin-bottom: 1px;
          color: rgb(51 65 85);
        }
        .preview-content .preview-p {
          font-size: 5px;
          line-height: 1.2;
          margin-bottom: 1px;
          color: rgb(71 85 105);
        }
        .preview-content .preview-ul {
          margin-bottom: 1px;
        }
        .preview-content .preview-li {
          font-size: 5px;
          line-height: 1.1;
          margin-bottom: 0.5px;
          margin-left: 4px;
          color: rgb(71 85 105);
        }
        .preview-content .preview-strong {
          font-weight: 600;
        }
        .preview-content .preview-em {
          font-style: italic;
        }
        
        /* Dark mode support */
        .dark .preview-content .preview-h1 {
          color: rgb(248 250 252);
        }
        .dark .preview-content .preview-h2 {
          color: rgb(226 232 240);
        }
        .dark .preview-content .preview-h3 {
          color: rgb(203 213 225);
        }
        .dark .preview-content .preview-p,
        .dark .preview-content .preview-li {
          color: rgb(148 163 184);
        }
      `}</style>
    </motion.div>
  )
}

interface TemplateGalleryProps {
  onCreateNote: (note: Note) => void
}

export function TemplateGallery({ onCreateNote }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getTemplates({ isPublic: true }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Template usage mutation
  const incrementUsageMutation = useMutation({
    mutationFn: incrementTemplateUsage,
    onError: (error) => {
      console.warn('Failed to increment template usage:', error)
      // Don't show error to user - this is not critical
    }
  })

  // Filter templates based on search
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Group templates by their name to correctly categorize legacy templates.
  const defaultTemplateNames = new Set(DEFAULT_TEMPLATES.map(t => t.name));
  const groupedTemplates = filteredTemplates.reduce((groups, template) => {
    const category = defaultTemplateNames.has(template.name) ? 'Site Templates' : 'My Templates'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(template)
    return groups
  }, {} as Record<string, Template[]>)

  const handleCreateBlankNote = async () => {
    try {
      setIsCreating(true)
      const newNote = await createNote('New Note', '<h1>New Note</h1><p>Start writing your note here...</p>')
      onCreateNote(newNote)
      toast.success('New note created')
    } catch (error) {
      console.error('Failed to create note:', error)
      toast.error('Failed to create note')
    } finally {
      setIsCreating(false)
    }
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
  }

  const handleConfirmTemplate = async () => {
    if (!selectedTemplate) return

    try {
      setIsCreating(true)
      
      // Create note with template content
      const noteTitle = `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`
      const newNote = await createNote(noteTitle, selectedTemplate.content)
      
      // Increment usage count (non-blocking)
      if (selectedTemplate.id) {
        incrementUsageMutation.mutate(selectedTemplate.id)
      }
      
      onCreateNote(newNote)
      toast.success(`Note created from "${selectedTemplate.name}" template`)
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Failed to create note from template:', error)
      toast.error('Failed to create note from template')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancelTemplate = () => {
    setSelectedTemplate(null)
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Templates Unavailable</h2>
            <p className="text-muted-foreground">
              Unable to load templates. You can still create a blank note.
            </p>
            <Button onClick={handleCreateBlankNote} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Create Blank Note
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Choose a Template</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start with a pre-designed template or create a blank note. Templates help you get started quickly with common note structures.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-6">
            <Button 
              onClick={handleCreateBlankNote} 
              disabled={isCreating}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create Blank Note'}
            </Button>
            
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  {/* Preview Skeleton */}
                  <div className="p-4 pb-0">
                    <div className="w-full h-32 bg-muted/50 rounded-md">
                      <div className="h-2 bg-muted border-b"></div>
                      <div className="p-2 space-y-1">
                        <Skeleton className="h-1.5 w-3/4" />
                        <Skeleton className="h-1 w-full" />
                        <Skeleton className="h-1 w-5/6" />
                        <Skeleton className="h-1 w-2/3" />
                        <Skeleton className="h-1 w-4/5" />
                      </div>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-10" />
                      </div>
                      <Skeleton className="h-3 w-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : Object.keys(groupedTemplates).length === 0 ? (
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {searchQuery ? 'No templates found' : 'No templates available'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? `No templates match "${searchQuery}". Try a different search term.`
                    : 'No templates have been set up yet. You can create a blank note to get started.'
                  }
                </p>
                <Button onClick={handleCreateBlankNote} disabled={isCreating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Blank Note
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    {category === 'Site Templates' ? (
                      <Globe className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                    <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                      {category}
                    </h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryTemplates.map((template) => (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] group overflow-hidden"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        {/* Template Preview */}
                        <div className="p-4 pb-0">
                          <TemplatePreview content={template.content || ''} />
                        </div>
                        
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
                                {template.name}
                              </CardTitle>
                              <CardDescription className="text-sm mt-1 line-clamp-2 min-h-[2.5rem]">
                                {template.description}
                              </CardDescription>
                            </div>
                            <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-2 flex-shrink-0" />
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {template.tags?.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {template.tags && template.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                            {template.usage_count && template.usage_count > 0 && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <User className="h-3 w-3 mr-1" />
                                {template.usage_count}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {selectedTemplate && (
        <AlertDialog open onOpenChange={handleCancelTemplate}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create Note from Template</AlertDialogTitle>
              <AlertDialogDescription>
                {`Create a new note using "${selectedTemplate.name}"?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelTemplate} disabled={isCreating}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmTemplate} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
} 