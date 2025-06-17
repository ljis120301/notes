/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // CRITICAL FIX: Increase content field limits to support large documents
  // This fixes the 400 Bad Request errors when pasting large content
  
  const notesCollection = app.findCollectionByNameOrId("pbc_3395098727")
  
  if (!notesCollection) {
    throw new Error("Notes collection not found")
  }

  console.log("[CRITICAL FIX] Applying content field limits for large document support...")

  // Find the content field
  let contentField = null
  
  for (const field of notesCollection.fields) {
    if (field.name === "content") {
      contentField = field
      break
    }
  }

  if (contentField) {
    console.log(`[CRITICAL FIX] Current content field max: ${contentField.max} (defaults to 5000 chars)`)
    
    // Set to 50MB worth of characters - this should handle very large documents
    contentField.max = 50000000 // 50 million characters (~50MB)
    
    console.log(`[CRITICAL FIX] Updated content field max to: ${contentField.max} characters`)
    console.log("[CRITICAL FIX] This will fix 400 Bad Request errors for large content")
  } else {
    console.log("[CRITICAL FIX] Content field not found - this is unexpected!")
  }

  return app.save(notesCollection)
}, (app) => {
  // Revert the content field limit change
  const notesCollection = app.findCollectionByNameOrId("pbc_3395098727")
  
  if (!notesCollection) {
    return
  }

  let contentField = null
  
  for (const field of notesCollection.fields) {
    if (field.name === "content") {
      contentField = field
      break
    }
  }

  if (contentField) {
    console.log(`[ROLLBACK] Reverting content field max from ${contentField.max} to 0`)
    contentField.max = 0 // Revert to original (5000 char default)
  }

  return app.save(notesCollection)
}) 