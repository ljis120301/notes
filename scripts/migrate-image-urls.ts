#!/usr/bin/env tsx

/**
 * Migration script to fix legacy PocketBase image URLs
 * 
 * Usage:
 *   npx tsx scripts/migrate-image-urls.ts [--check]
 * 
 * Options:
 *   --check    Only check what needs to be updated without making changes
 */

import { checkImageUrlMigration, migrateImageUrls } from '../lib/image-url-migration'

async function main() {
  const args = process.argv.slice(2)
  const checkOnly = args.includes('--check')
  
  if (checkOnly) {
    console.log('🔍 Running migration check (no changes will be made)...\n')
    
    const results = await checkImageUrlMigration()
    
    console.log('\n📊 Migration Check Results:')
    console.log('=' .repeat(50))
    console.log(`Total notes: ${results.total}`)
    console.log(`Notes needing update: ${results.needsUpdate}`)
    console.log(`Notes already fixed: ${results.alreadyFixed}`)
    console.log(`Problematic URLs found: ${results.problematicUrls.length}`)
    
    if (results.problematicUrls.length > 0) {
      console.log('\n🔗 Sample problematic URLs:')
      const uniqueUrls = [...new Set(results.problematicUrls)].slice(0, 10)
      uniqueUrls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`)
      })
      
      if (results.problematicUrls.length > 10) {
        console.log(`  ... and ${results.problematicUrls.length - 10} more`)
      }
    }
    
    if (results.needsUpdate > 0) {
      console.log('\n💡 To fix these URLs, run:')
      console.log('   npx tsx scripts/migrate-image-urls.ts')
    } else {
      console.log('\n✅ All image URLs are already properly formatted!')
    }
    
  } else {
    console.log('🚀 Running image URL migration...\n')
    
    const results = await migrateImageUrls()
    
    console.log('\n📊 Migration Results:')
    console.log('=' .repeat(50))
    console.log(`Total notes processed: ${results.total}`)
    console.log(`Successfully updated: ${results.success}`)
    console.log(`Errors encountered: ${results.errors.length}`)
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:')
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }
    
    if (results.success === results.total && results.errors.length === 0) {
      console.log('\n🎉 Migration completed successfully!')
      console.log('All image URLs have been updated to work with any PocketBase server.')
    } else if (results.errors.length > 0) {
      console.log('\n⚠️  Migration completed with some errors.')
      console.log('Please review the errors above and fix any issues.')
    }
  }
  
  console.log('\n' + '=' .repeat(50))
}

// Run the script
main().catch((error) => {
  console.error('💥 Script failed:', error)
  process.exit(1)
}) 