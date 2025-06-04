import { pb, notesCollection, transformLegacyImageUrls } from './pocketbase'

/**
 * Migration utility to fix legacy image URLs in all existing notes
 * This will permanently update the database records to use relative URLs
 */
export async function migrateImageUrls(): Promise<{ success: number; total: number; errors: string[] }> {
  console.log('🚀 Starting image URL migration...')
  
  const results = {
    success: 0,
    total: 0,
    errors: [] as string[]
  }
  
  try {
    // Get all notes (admin access needed for this)
    console.log('📥 Fetching all notes...')
    const allNotes = await pb.collection(notesCollection).getFullList({
      sort: '-updated'
    })
    
    results.total = allNotes.length
    console.log(`📊 Found ${results.total} notes to process`)
    
    for (const note of allNotes) {
      try {
        const originalContent = note.content || ''
        const transformedContent = transformLegacyImageUrls(originalContent)
        
        // Only update if content actually changed
        if (originalContent !== transformedContent) {
          console.log(`🔄 Updating note ${note.id}: ${note.title}`)
          
          await pb.collection(notesCollection).update(note.id, {
            content: transformedContent
          })
          
          console.log(`✅ Successfully updated note ${note.id}`)
          results.success++
        } else {
          // No changes needed, but count as success
          results.success++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const noteInfo = `${note.id} (${note.title})`
        results.errors.push(`Failed to update note ${noteInfo}: ${errorMessage}`)
        console.error(`❌ Failed to update note ${noteInfo}:`, error)
      }
    }
    
    console.log('🎉 Migration completed!')
    console.log(`✅ Successfully updated: ${results.success}/${results.total}`)
    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.length}`)
      results.errors.forEach(error => console.error(`  - ${error}`))
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    results.errors.push(`Migration failed: ${errorMessage}`)
    console.error('❌ Migration failed:', error)
  }
  
  return results
}

/**
 * Check how many notes would be affected by the migration without actually updating them
 */
export async function checkImageUrlMigration(): Promise<{ 
  total: number
  needsUpdate: number
  alreadyFixed: number
  problematicUrls: string[]
}> {
  console.log('🔍 Checking image URL migration needs...')
  
  const results = {
    total: 0,
    needsUpdate: 0,
    alreadyFixed: 0,
    problematicUrls: [] as string[]
  }
  
  try {
    const allNotes = await pb.collection(notesCollection).getFullList({
      sort: '-updated'
    })
    
    results.total = allNotes.length
    
    for (const note of allNotes) {
      const originalContent = note.content || ''
      const transformedContent = transformLegacyImageUrls(originalContent)
      
      if (originalContent !== transformedContent) {
        results.needsUpdate++
        
        // Extract problematic URLs for reporting
        const legacyUrlPattern = /https?:\/\/[^\/]+\/api\/files\/[^"'\s]+/gi
        const matches = originalContent.match(legacyUrlPattern)
        if (matches) {
          results.problematicUrls.push(...matches)
        }
      } else {
        results.alreadyFixed++
      }
    }
    
    console.log(`📊 Migration check results:`)
    console.log(`  Total notes: ${results.total}`)
    console.log(`  Need updating: ${results.needsUpdate}`)
    console.log(`  Already fixed: ${results.alreadyFixed}`)
    console.log(`  Problematic URLs found: ${results.problematicUrls.length}`)
    
    if (results.problematicUrls.length > 0) {
      console.log(`  Sample problematic URLs:`)
      const uniqueUrls = [...new Set(results.problematicUrls)].slice(0, 5)
      uniqueUrls.forEach(url => console.log(`    - ${url}`))
    }
    
  } catch (error) {
    console.error('❌ Migration check failed:', error)
  }
  
  return results
} 