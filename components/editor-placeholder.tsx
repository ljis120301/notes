"use client"

import { FileText } from "lucide-react"

export function EditorPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Welcome to Markdown Notes</h2>
          <p className="text-muted-foreground max-w-md">
            Select a note from the sidebar to start editing, or create a new note to get started.
          </p>
        </div>
      </div>
    </div>
  )
} 