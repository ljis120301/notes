"use client"

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [redirectAttempted, setRedirectAttempted] = useState(false)

  // Only log auth state during initial load or significant changes
  // Removed excessive debug logging that was causing performance issues

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated && !redirectAttempted) {
      console.log('🚀 ProtectedRoute: Attempting redirect to /auth')
      setRedirectAttempted(true)
      router.replace('/auth')
    }
  }, [loading, isAuthenticated, router, redirectAttempted])

  // Fallback timeout - if loading takes too long, show manual redirect option
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('⚠️ ProtectedRoute: Loading timeout, auth may be stuck')
      }, 5000) // 5 second timeout
      
      return () => clearTimeout(timeout)
    }
  }, [loading])

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // If not authenticated, show fallback or redirect message
  if (!isAuthenticated) {
    return fallback || (
      <div className="h-screen flex flex-col bg-background">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              {redirectAttempted ? 'Redirecting to login...' : 'Authentication required'}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {redirectAttempted 
                  ? "If you're not redirected automatically:" 
                  : "Please log in to continue:"
                }
              </p>
              <Link href="/auth">
                <Button variant="outline" className="hover:cursor-pointer">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
} 