"use client"

import { pb } from '@/lib/pocketbase'
import { defaultTemplates, defaultCategories } from '@/lib/default-templates'
import { toast } from 'sonner'

export async function setupDefaultTemplates(userId?: string) {
  if (!userId) {
    const auth = pb.authStore.model
    if (!auth?.id) {
      throw new Error('User must be authenticated to set up templates')
    }
    userId = auth.id
  }

  try {
    console.log('Setting up default templates...')
    
    // First, set up categories
    const createdCategories = []
    for (const category of defaultCategories) {
      try {
        const existingCategory = await pb.collection('template_categories').getFirstListItem(
          `name="${category.name}" && users="${userId}"`
        ).catch(() => null)
        
        if (!existingCategory) {
          const createdCategory = await pb.collection('template_categories').create({
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color,
            users: userId
          })
          createdCategories.push(createdCategory)
          console.log(`Created category: ${category.name}`)
        } else {
          createdCategories.push(existingCategory)
          console.log(`Category already exists: ${category.name}`)
        }
      } catch (error) {
        console.error(`Failed to create category ${category.name}:`, error)
        // Don't continue if categories fail
        throw new Error(`Failed to create category "${category.name}": ${error}`)
      }
    }

    // Then, set up templates
    const createdTemplates = []
    for (const template of defaultTemplates) {
      try {
        const existingTemplate = await pb.collection('templates').getFirstListItem(
          `name="${template.name}" && users="${userId}"`
        ).catch(() => null)
        
        if (!existingTemplate) {
          const createdTemplate = await pb.collection('templates').create({
            name: template.name,
            description: template.description,
            content: template.content.trim(),
            category: template.category,
            tags: template.tags,
            is_public: false,
            users: userId,
            usage_count: 0
          })
          createdTemplates.push(createdTemplate)
          console.log(`Created template: ${template.name}`)
        } else {
          createdTemplates.push(existingTemplate)
          console.log(`Template already exists: ${template.name}`)
        }
      } catch (error) {
        console.error(`Failed to create template ${template.name}:`, error)
        // Don't continue if templates fail
        throw new Error(`Failed to create template "${template.name}": ${error}`)
      }
    }

    console.log(`Setup complete! Created ${createdCategories.length} categories and ${createdTemplates.length} templates`)
    return {
      categories: createdCategories,
      templates: createdTemplates
    }
  } catch (error) {
    console.error('Failed to setup default templates:', error)
    throw error
  }
}

export async function checkTemplateSetup(): Promise<boolean> {
  try {
    const auth = pb.authStore.model
    if (!auth?.id) return false

    // Check if user has any templates
    const templates = await pb.collection('templates').getList(1, 1, {
      filter: `users="${auth.id}"`
    })

    return templates.totalItems > 0
  } catch (error) {
    console.error('Failed to check template setup:', error)
    return false
  }
}

export async function autoSetupTemplatesIfNeeded() {
  try {
    const hasTemplates = await checkTemplateSetup()
    if (!hasTemplates) {
      console.log('No templates found, setting up defaults...')
      await setupDefaultTemplates()
      toast.success('Default templates have been set up!')
    } else {
      console.log('Templates already exist, skipping auto-setup')
    }
  } catch (error) {
    console.error('Auto-setup failed:', error)
    
    // Better error handling
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('404') || errorMessage.includes('collection')) {
      console.warn('Templates collections not found - they need to be created in PocketBase admin')
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      console.warn('Authentication or permission error setting up templates')
    } else {
      console.warn('Unknown error during template setup:', errorMessage)
    }
  }
} 