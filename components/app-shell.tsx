"use client"

import * as React from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import Logo from "./logo"

interface AppShellProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  userActions?: React.ReactNode
  onLogoClick?: () => void
}

export function AppShell({ children, sidebar, userActions, onLogoClick }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false) // Start closed on mobile
  const isMobile = useMobile()
  const sidebarRef = React.useRef<HTMLDivElement>(null)
  const toggleTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Close sidebar when clicking outside on mobile
  React.useEffect(() => {
    if (!isMobile || !sidebarOpen) return

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node
      
      // Check if click is outside sidebar and not on the toggle button
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        const toggleButton = document.querySelector('[aria-label*="sidebar"]')
        if (toggleButton && !toggleButton.contains(target)) {
          setSidebarOpen(false)
        }
      }
    }

    // Add a small delay to prevent immediate triggering
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, { passive: true })
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [sidebarOpen, isMobile])

  // Close sidebar on escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  // Auto-open sidebar on desktop, close on mobile
  React.useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  // Prevent body scroll when mobile sidebar is open
  React.useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isMobile, sidebarOpen])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-3 sm:px-4 py-3 flex items-center justify-between relative z-50 h-[73px]">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              
              // Clear any existing timeout
              if (toggleTimeoutRef.current) {
                clearTimeout(toggleTimeoutRef.current)
              }
              
              // Debounce the toggle to prevent rapid open/close
              toggleTimeoutRef.current = setTimeout(() => {
                setSidebarOpen(!sidebarOpen)
              }, 50)
            }}
            className="h-9 w-9 lg:hidden"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="flex items-center space-x-2">
            <Logo onLogoClick={onLogoClick} />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {userActions}
          <ModeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setSidebarOpen(false)
            }}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          className={`
            ${isMobile 
              ? `fixed left-0 z-50 transform transition-transform duration-300 ease-in-out ${
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`
              : `relative transition-all duration-300 ${
                  sidebarOpen ? 'w-80' : 'w-0'
                }`
            }
            ${isMobile ? 'w-80 max-w-[85vw] top-[73px] bottom-0' : 'h-full'}
            bg-sidebar border-r border-sidebar-border overflow-hidden
          `}
        >
          <div className="h-full overflow-hidden">
            {sidebar}
          </div>
        </aside>

        {/* Main Editor Area */}
        <main className={`
          flex-1 overflow-hidden
          ${isMobile ? 'w-full' : ''}
        `}>
          {children}
        </main>
      </div>
    </div>
  )
} 