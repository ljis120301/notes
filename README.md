# Enhanced Notes App

A powerful notes application with a **unified inline markdown editor** that renders markdown in real-time as you type. Built with Next.js, TypeScript, TanStack Query, and PocketBase.

## ✨ Key Features

### 🖋️ Unified Inline Markdown Editor
- **Real-time markdown rendering** - See formatted content as you type
- **Single editing space** - No separate preview/edit modes needed
- **Inline styling** - Headers, bold, italic, code rendered live
- **Cursor preservation** - No interruption to your typing flow
- **Performance optimized** - Zero-lag typing with contentEditable

### 📸 Seamless Image Upload
- **Click to upload** images from toolbar
- **Instant insertion** - Images added at cursor position
- **Automatic markdown** - `![filename](url)` syntax handled automatically
- **Error handling** - Graceful fallbacks for failed uploads
- **Multiple formats** - Supports JPEG, PNG, GIF, WebP, SVG

### 💾 Smart Auto-Save with Cursor Preservation
- **Never lose your typing position** - Server saves don't interrupt editing
- **Ultra-performance optimized** - No typing lag or UI blocking
- **Local backup** - Automatic backup to localStorage
- **Real-time sync** - Changes saved every 3 seconds
- **Visual status** - Clear indication of save state
- **Manual save** - Cmd/Ctrl+S for instant save

### 🎨 Rich Formatting Support
- **Headers** (H1, H2, H3) with live rendering
- **Text formatting** - Bold, italic, underline with instant preview
- **Code blocks** with proper theming (light/dark mode)
- **Lists** - Bullet and numbered lists with live formatting
- **Tables** - Full table support with markdown syntax
- **Links** - Easy link insertion with live preview
- **Quotes** - Blockquote formatting with visual styling
- **Inline code** - Backtick formatting with immediate styling

### ⚡ Performance Features
- **ContentEditable optimization** for zero-lag typing
- **Aggressive debouncing** - UI updates optimized
- **Smart cursor management** - Position preserved across saves
- **Minimal re-renders** - Optimized React patterns
- **Server update detection** - Prevents cursor reset on auto-save

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup PocketBase
The app uses PocketBase for the backend. You need to run the migration to add image upload support:

```bash
# Navigate to the PocketBase directory
cd pocketbase

# Run PocketBase (this will apply the new migration automatically)
./pocketbase serve
```

The migration `1748896000_created_note_images.js` will automatically create the `note_images` collection for file uploads.

### 3. Start the Development Server
```bash
# In the project root (not in pocketbase directory)
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **PocketBase Admin**: http://localhost:8090/_/
- **PocketBase API**: http://localhost:8090/api/

## 📝 Usage Guide

### Creating and Editing Notes
1. **Create a note** - Click the "+" button in the sidebar
2. **Start typing** - Markdown renders in real-time as you type
3. **Use formatting** - Click toolbar buttons or use keyboard shortcuts
4. **Upload images** - Click the image button to upload at cursor position
5. **Auto-save** - Changes saved automatically without interrupting typing

### Inline Markdown Rendering
- **Type `# Heading`** - Instantly becomes a large header
- **Type `**bold**`** - Text becomes bold in real-time
- **Type `*italic*`** - Text becomes italic as you type
- **Type `` `code` ``** - Inline code styling appears immediately
- **Type `> quote`** - Blockquote styling with border appears
- **Upload images** - Markdown syntax inserted and styled automatically

### Keyboard Shortcuts
- `Cmd/Ctrl + B` - Bold text
- `Cmd/Ctrl + I` - Italic text
- `Cmd/Ctrl + U` - Underline text
- `Cmd/Ctrl + K` - Insert link
- `Cmd/Ctrl + `` ` `` - Inline code
- `Cmd/Ctrl + S` - Manual save

### Markdown Features
The editor supports all standard markdown with live rendering:
- ✅ Headers (H1, H2, H3) with real-time sizing
- ✅ Bold and italic with instant formatting
- ✅ Code blocks with proper theming
- ✅ Tables with live structure
- ✅ Lists with automatic indentation
- ✅ Links with instant styling
- ✅ Images with immediate preview
- ✅ Quotes with visual borders

## 🏗️ Architecture

### Performance Optimizations
1. **ContentEditable with cursor preservation** - Direct DOM manipulation
2. **Server update detection** - Prevents cursor reset during auto-save
3. **Debounced sync** - Content synced to React state every 300ms
4. **Real-time CSS styling** - No heavy markdown parsing
5. **Local backup** - Automatic localStorage backup for data safety

### Cursor Preservation System
1. **Save cursor position** before any content updates
2. **Detect server updates** vs user input
3. **Restore cursor position** only for user-initiated changes
4. **Maintain typing flow** during auto-save operations

### File Upload Flow
1. User clicks image upload button
2. File validated and uploaded to PocketBase
3. PocketBase returns secure file URL
4. Markdown image syntax inserted at cursor position
5. Real-time CSS styling shows the markdown syntax

### Data Management
- **TanStack Query** for server state management
- **Optimistic updates** for instant UI feedback
- **Background sync** for reliable data persistence
- **Cursor-aware updates** for seamless editing experience

## 🔧 Technical Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Editor**: ContentEditable with real-time CSS styling
- **State Management**: TanStack Query, React hooks
- **UI Components**: shadcn/ui
- **Backend**: PocketBase with file storage
- **Icons**: Lucide React

## 🎯 User Experience Philosophy

This editor provides a **seamless writing experience** that combines the best of both worlds:

- **Familiar typing experience** - Just type and see results instantly
- **No mode switching** - No need to switch between edit/preview
- **Visual feedback** - See formatting as you type markdown
- **Never lose your place** - Cursor position preserved during saves
- **Progressive enhancement** - Raw markdown works, styling enhances it

## 🔒 Data Safety

- **Auto-save with cursor preservation** prevents data loss without interruption
- **Local backup** in localStorage as secondary safety net
- **Server update detection** prevents cursor jumping
- **Error recovery** with manual save retry options
- **Graceful degradation** if JavaScript fails

---

The unified editor provides the fastest and most natural markdown editing experience while maintaining all the performance benefits and data safety of the original implementation.

### 1. PocketBase Configuration

#### Collection Rules for Public Sharing

To enable public sharing with image access, you need to configure your PocketBase collection rules:

1. Open PocketBase Admin UI (usually at `http://localhost:6969/_/`)
2. Go to Collections → `notes`
3. Click on the "API Rules" tab
4. Update the rules as follows:

**List Rule:**
```
@request.auth.id != "" || isPublic = true
```

**View Rule:**
```
@request.auth.id != "" || isPublic = true
```

**Create Rule:**
```
@request.auth.id != ""
```

**Update Rule:**
```
@request.auth.id != "" && (@request.auth.id = user || @request.auth.id = author)
```

**Delete Rule:**
```
@request.auth.id != "" && (@request.auth.id = user || @request.auth.id = author)
```

#### File Access Configuration

For images in shared notes to be publicly accessible:

1. In the `notes` collection, find any file fields (like image uploads)
2. For each file field, check the "Protected" option
3. The file access will automatically follow the collection's View rule

This ensures that:
- Private notes and their images require authentication
- Public notes (where `isPublic = true`) and their images are accessible without authentication
- Only authenticated users can create, update, or delete notes

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:6969
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
# Start PocketBase (in one terminal)
cd pocketbase
./pocketbase serve --dev

# Start Next.js (in another terminal)
npm run dev
```

## Public Sharing

The public sharing feature allows users to:

1. Click the Share button on any note
2. Generate a public link using the note's existing ID
3. Share the link with anyone
4. Viewers can access the note without authentication
5. Images and formatting are preserved in shared notes

**Security Notes:**
- Only notes explicitly marked as `isPublic = true` are accessible via public links
- Private notes remain protected even if someone guesses the URL
- File access follows the same rules as note access

## Architecture

- **Frontend:** Next.js 14 with App Router
- **Backend:** PocketBase (SQLite + REST API)
- **Editor:** Tiptap (rich text editor)
- **UI:** Shadcn/ui components
- **State:** TanStack Query + Zustand
- **Styling:** Tailwind CSS

## Development

The app uses a simplified sharing system:
- No separate UUID generation
- Uses PocketBase's existing record IDs
- Relies on `isPublic` boolean field for access control
- Collection rules handle security automatically
