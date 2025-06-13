"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, 
  FileText, 
  Star,
  Grid3X3,
  List,
  Clock,
  User,
  Globe,
  BookOpen,
  Users,
  Briefcase,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Template } from '@/lib/pocketbase'
import { 
  getTemplates, 
  incrementTemplateUsage,
  setupDefaultTemplates 
} from '@/lib/templates-api'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

// Icon mapping for categories
const CATEGORY_ICONS = {
  'meeting': Users,
  'project': Briefcase, 
  'personal': User,
  'learning': BookOpen,
  'default': FileText
} as const

interface TemplatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: Template) => void
}

interface TemplateCardProps {
  template: Template
  onSelect: (template: Template) => void
  viewMode: 'grid' | 'list'
}

function TemplateCard({ template, onSelect, viewMode }: TemplateCardProps) {
  const handleSelect = useCallback(() => {
    onSelect(template)
  }, [template, onSelect])

  // Extract first few lines of content for preview
  const previewText = useMemo(() => {
    if (!template.content) return 'No preview available'
    // Remove HTML tags and get first 100 characters
    const text = template.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }, [template.content])

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full"
      >
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 bg-background/50 backdrop-blur-sm border-muted w-full overflow-hidden"
          onClick={handleSelect}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm truncate">{template.name}</h3>
                  {template.is_public && (
                    <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {template.description || previewText}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                  {template.usage_count && template.usage_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {template.usage_count}
                    </span>
                  )}
                  {template.updated && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(template.updated), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full"
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-background/50 backdrop-blur-sm border-muted group h-full w-full overflow-hidden"
        onClick={handleSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {template.name}
            </CardTitle>
            {template.is_public && (
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <CardDescription className="text-xs line-clamp-2 min-h-[2.5rem]">
            {template.description || previewText}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {template.usage_count && template.usage_count > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {template.usage_count}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Used {template.usage_count} times</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {template.updated && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Clock className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Updated {formatDistanceToNow(new Date(template.updated), { addSuffix: true })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TemplateSkeletons({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const count = viewMode === 'grid' ? 6 : 4
  
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-background/50">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

export function TemplatePicker({ open, onOpenChange, onSelectTemplate }: TemplatePickerProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showPublic, setShowPublic] = useState(false)

  // Setup default templates on first load
  useEffect(() => {
    if (open) {
      setupDefaultTemplates().catch(error => {
        console.warn('Failed to setup default templates:', error)
      })
    }
  }, [open])

  // Fetch templates
  const { 
    data: templates = [], 
    isLoading: isLoadingTemplates,
    error: templatesError
  } = useQuery({
    queryKey: ['templates', selectedCategory, showPublic, searchQuery],
    queryFn: () => getTemplates({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      isPublic: showPublic,
      search: searchQuery.trim() || undefined
    }),
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })



  // Template usage mutation
  const incrementUsageMutation = useMutation({
    mutationFn: incrementTemplateUsage,
    onError: (error) => {
      console.warn('Failed to increment template usage:', error)
      // Don't show error to user - this is not critical
    }
  })

  const handleSelectTemplate = useCallback(async (template: Template) => {
    try {
      // Increment usage count (non-blocking)
      if (template.id) {
        incrementUsageMutation.mutate(template.id)
      }
      
      // Close dialog and pass template to parent
      onOpenChange(false)
      onSelectTemplate(template)
      
      toast.success(`Applied template: ${template.name}`)
    } catch (error) {
      console.error('Error selecting template:', error)
      toast.error('Failed to apply template')
    }
  }, [onOpenChange, onSelectTemplate, incrementUsageMutation])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    // Apply search filter (client-side for better UX)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Sort by usage count and updated date
    return filtered.sort((a, b) => {
      // First by usage count (descending)
      const usageA = a.usage_count || 0
      const usageB = b.usage_count || 0
      if (usageA !== usageB) {
        return usageB - usageA
      }
      
      // Then by updated date (descending)
      const dateA = a.updated ? new Date(a.updated).getTime() : 0
      const dateB = b.updated ? new Date(b.updated).getTime() : 0
      return dateB - dateA
    })
  }, [templates, selectedCategory, searchQuery])

  // Get available categories from templates
  const availableCategories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category))
    return Array.from(cats).sort()
  }, [templates])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] max-h-[800px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose a Template
          </DialogTitle>
          <DialogDescription>
            Select a pre-formatted template to start your note, or browse for inspiration
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.default
                        return <IconComponent className="h-4 w-4" />
                      })()}
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-muted rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant={showPublic ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPublic(!showPublic)}
              className="h-8"
            >
              <Globe className="h-3 w-3 mr-1" />
              Public Templates
            </Button>
            
            {filteredTemplates.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        </div>

        {/* Templates Grid/List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {isLoadingTemplates ? (
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  <TemplateSkeletons viewMode={viewMode} />
                </div>
              ) : templatesError ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Failed to load templates</p>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['templates'] })}>
                    Try Again
                  </Button>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No templates match your filters' 
                      : 'No templates available'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory('all')
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="w-full overflow-hidden">
                  <motion.div 
                    layout
                    className={`grid gap-4 w-full ${
                      viewMode === 'grid' 
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                        : 'grid-cols-1'
                    }`}
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onSelect={handleSelectTemplate}
                          viewMode={viewMode}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
} 