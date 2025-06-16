# Enhanced Notes App

A powerful notes application with real-time markdown rendering, built with Next.js, TypeScript, TanStack Query, and PocketBase.

https://github.com/user-attachments/assets/bbcfb7fe-f781-49ba-a633-da69a7b9ff8b

## ✨ Features

- **Real-time markdown rendering** - See formatted content as you type
- **Seamless image upload** - Click to upload and insert images
- **Smart auto-save** - Never lose your work with cursor preservation
- **Rich formatting** - Headers, bold, italic, code blocks, lists, tables, links
- **Performance optimized** - Zero-lag typing with contentEditable

## 🚀 Setup Instructions

### Option 1: Docker (Recommended)

The easiest way to run the project is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/ljis120301/notes.git
cd notes

# Start the application using Docker Compose
sudo docker compose up -d
```

This will start both the Next.js frontend and PocketBase backend in containers.

### Option 2: Development Setup

For local development:

```bash
# Clone the repository
git clone https://github.com/ljis120301/notes.git
cd notes

# Install dependencies
npm install

# Start PocketBase (in a separate terminal)
cd pocketbase
./pocketbase serve --http="127.0.0.1:6969"    
# Note: PocketBase must run on port 6969 

# Start Next.js development server (in another terminal)
cd ..  # Return to project root
npm run dev
```

### Access the Application

- Frontend: http://localhost:3000
- PocketBase Admin: http://localhost:6969/_/
- PocketBase API: http://localhost:6969/api/

## 🔧 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Editor**: ContentEditable with real-time CSS styling
- **State Management**: TanStack Query
- **UI Components**: shadcn/ui
- **Backend**: PocketBase

## 📝 Environment Setup

Create `.env.local`:
```env
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:6969
```
