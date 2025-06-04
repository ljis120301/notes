# Image URL Migration Guide

## Problem

When using PocketBase for file storage, images are stored with **absolute URLs** that include the specific server IP and port. When you change your PocketBase server configuration (different IP, port, or deploy to a new server), all previously uploaded images become inaccessible because they still reference the old server URL.

### Example of the Problem

```html
<!-- Old absolute URL that breaks when server changes -->
<img src="http://10.1.9.143:8090/api/files/pbc_3395098728/031g32592i82i68/cat_3wv5px2djc.png" />

<!-- Fixed relative URL that works with any server -->
<img src="/api/files/pbc_3395098728/031g32592i82i68/cat_3wv5px2djc.png" />
```

## Solution

This solution provides:

1. **Automatic URL fixing for new uploads** - New images use relative URLs
2. **Runtime URL transformation** - Legacy URLs are fixed when notes are loaded
3. **Database migration utility** - Permanently fix all existing notes

## How It Works

### 1. New Image Uploads (Fixed)

- Image uploads now generate **relative URLs** instead of absolute ones
- URLs are stored as `/api/files/collection/record/filename` 
- These work with any PocketBase server URL

### 2. Runtime URL Transformation

When notes are loaded from the database, the system automatically:
- Detects legacy absolute URLs in image tags
- Converts them to work with the current server
- Displays images correctly regardless of server changes

### 3. Database Migration (Optional)

You can permanently fix all existing notes in the database using the migration script.

## Usage

### Check What Needs Migration

```bash
# Check how many notes need updating (no changes made)
npx tsx scripts/migrate-image-urls.ts --check
```

This will show you:
- Total number of notes
- How many need updating
- Sample problematic URLs

### Run the Migration

```bash
# Actually fix all the URLs in the database
npx tsx scripts/migrate-image-urls.ts
```

This will:
- Update all notes with legacy image URLs
- Convert absolute URLs to relative ones
- Preserve all other content unchanged

## Technical Details

### Files Modified

- `lib/pocketbase.ts` - Added URL transformation utilities
- `lib/notes-api.ts` - Updated to use relative URLs and transform legacy content
- `lib/tiptap-utils.ts` - Updated image upload to use relative URLs
- `components/tiptap-node/image-upload-node/image-upload-node.tsx` - Fixed crypto.randomUUID fallback

### Key Functions

#### `getRelativeFileUrl(record, filename)`
Generates relative URLs for new uploads:
```typescript
// Returns: "/api/files/collection123/record456/image.png"
const url = getRelativeFileUrl(record, record.image)
```

#### `transformLegacyImageUrls(htmlContent)`
Converts absolute URLs in HTML content to relative ones:
```typescript
const fixed = transformLegacyImageUrls('<img src="http://old-server:8090/api/files/..." />')
// Returns: '<img src="/api/files/..." />'
```

#### `normalizeImageUrls(htmlContent)`
Ensures all image URLs work with current server:
```typescript
const normalized = normalizeImageUrls(noteContent)
// Fixes legacy URLs and makes relative URLs absolute for display
```

## Why This Happened

1. **PocketBase Design**: PocketBase's `pb.files.getUrl()` method returns absolute URLs by design
2. **Caching**: Browsers and the app cache these URLs, so they persist even after server changes
3. **Database Storage**: The absolute URLs get saved in the database, making them permanent

## Prevention

Going forward, this solution prevents the issue by:
- Using relative URLs for all new image uploads
- Automatically fixing legacy URLs when content is loaded
- Providing migration tools for permanent fixes

## Troubleshooting

### Images Still Not Loading

1. **Check PocketBase is running** on the expected port
2. **Verify file permissions** in PocketBase collections
3. **Run the migration** to fix database records permanently
4. **Clear browser cache** to remove cached broken URLs

### Migration Fails

1. **Ensure you're authenticated** as an admin user
2. **Check PocketBase connection** is working
3. **Verify write permissions** to the notes collection
4. **Run with --check first** to see what would be changed

### Network Access

The solution works whether you access the app via:
- `localhost:3000`
- `192.168.1.100:3000` 
- Any other IP/domain

All image URLs will automatically resolve to the current PocketBase server.

## Security Note

This migration preserves the security model:
- User authentication is still required
- File access permissions are unchanged  
- Only the URL format is modified, not the access controls 