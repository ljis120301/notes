/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fix notes collection field constraints to support large documents
  const notesCollection = app.findCollectionByNameOrId("pbc_3395098727")
  
  if (!notesCollection) {
    throw new Error("Notes collection not found")
  }

  console.log("[Migration] Starting notes field constraint fixes for large content support...")

  // Find and update title field
  let titleField = null
  let contentField = null
  
  for (const field of notesCollection.fields) {
    if (field.name === "title") {
      titleField = field
    } else if (field.name === "content") {
      contentField = field
    }
  }

  if (titleField) {
    console.log(`[Migration] Current title field max length: ${titleField.max}`)
    titleField.max = 2000 // Increase from 255 to 2000 characters for long titles
    console.log(`[Migration] Updated title field max length to: ${titleField.max}`)
  } else {
    console.log("[Migration] Title field not found in notes collection")
  }

  if (contentField) {
    console.log(`[Migration] Current content field max length: ${contentField.max}`)
    // PocketBase text fields with max=0 default to 5000 characters
    // We need to increase this for large document support
    contentField.max = 10000000 // 10MB worth of characters (very large documents)
    console.log(`[Migration] Updated content field max length to: ${contentField.max}`)
  } else {
    console.log("[Migration] Content field not found in notes collection")
  }

  console.log("[Migration] Saving notes collection with updated field constraints...")
  return app.save(notesCollection)
}, (app) => {
  // Revert the field constraint changes
  const notesCollection = app.findCollectionByNameOrId("pbc_3395098727")
  
  if (!notesCollection) {
    return
  }

  console.log("[Migration Rollback] Reverting notes field constraints...")

  let titleField = null
  let contentField = null
  
  for (const field of notesCollection.fields) {
    if (field.name === "title") {
      titleField = field
    } else if (field.name === "content") {
      contentField = field
    }
  }

  if (titleField) {
    console.log(`[Migration Rollback] Reverting title field max length from ${titleField.max} to 255`)
    titleField.max = 255 // Revert to original constraint
  }

  if (contentField) {
    console.log(`[Migration Rollback] Reverting content field max length from ${contentField.max} to 0`)
    contentField.max = 0 // Revert to original constraint (5000 char default)
  }

  return app.save(notesCollection)
}) 