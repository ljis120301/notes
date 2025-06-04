"use client"

import * as React from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { FileText, Menu } from "lucide-react"

interface AppShellProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  userActions?: React.ReactNode
}

export function AppShell({ children, sidebar, userActions }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Notes</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {userActions}
          <ModeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`bg-card border-r border-border transition-all duration-300 ${
            sidebarOpen ? "w-80" : "w-0"
          } overflow-hidden md:w-80`}
        >
          {sidebar}
        </aside>

        {/* Main Editor Area */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
} 