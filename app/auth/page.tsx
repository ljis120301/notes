"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Zap, Search, Edit3, Sparkles, Star } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ModeToggle } from '@/components/mode-toggle'
import { OTPAuthModal } from '@/components/otp-auth-modal'
import { HeroParallax } from '@/components/ui/hero-parallax'

// Mock data for the parallax showcase - representing different note-taking scenarios
const showcaseProducts = [
  {
    title: "Meeting Notes",
    link: "#",
    thumbnail: "/background/sync2.png"
  },
  {
    title: "Project Planning",
    link: "#",
    thumbnail: "/background/image.png"
  },
  {
    title: "Research Notes",
    link: "#",
    thumbnail: "/background/cat.png"
  },
  {
    title: "Daily Journal",
    link: "#",
    thumbnail: "/background/editorDemo.png"
  },
  {
    title: "Code Snippets",
    link: "#",
    thumbnail: "/background/sync.png"
  },
  {
    title: "Creative Writing",
    link: "#",
    thumbnail: "/background/folders.png"
  },
  {
    title: "Study Notes",
    link: "#",
    thumbnail: "/background/docs.png"
  },
  {
    title: "Recipe Collection",
    link: "#",
    thumbnail: "/background/template.png"
  },
  {
    title: "Travel Plans",
    link: "#",
    thumbnail: "/background/pinned.png"
  },
  {
    title: "Business Ideas",
    link: "#",
    thumbnail: "/background/folder.png"
  },
  {
    title: "Book Reviews",
    link: "#",
    thumbnail: "/background/code.png"
  },
  {
    title: "Workout Log",
    link: "#",
    thumbnail: "/background/coolNote.png"
  },
  {
    title: "Design Ideas",
    link: "#",
    thumbnail: "/background/demo.png"
  },
  {
    title: "Learning Path",
    link: "#",
    thumbnail: "/background/rating.png"
  },
  {
    title: "Quick Thoughts",
    link: "#",
    thumbnail: "/background/shrek.png"
  }
]

// Custom Header for the Hero Parallax
const NotesHeroHeader = () => {
  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 md:h-12 md:w-12 text-primary" />
        <Badge variant="secondary" className="text-sm">
          <Sparkles className="h-3 w-3 mr-1" />
          Markdown Powered
        </Badge>
      </div>
      <h1 className="text-3xl md:text-7xl font-bold dark:text-white bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
        Notes that think <br />
        <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          with you
        </span>
      </h1>
      <p className="max-w-2xl text-base md:text-xl mt-8 dark:text-neutral-200 text-muted-foreground leading-relaxed">
        The most intuitive markdown editor for capturing ideas, planning projects, and organizing thoughts. 
        Lightning-fast search, beautiful formatting, and seamless sync across all your devices.
      </p>
      
      {/* Feature highlights */}
      <div className="flex flex-wrap gap-4 mt-8">
        <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm rounded-full px-4 py-2 border border-border/20">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Lightning Fast</span>
        </div>
        <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm rounded-full px-4 py-2 border border-border/20">
          <Search className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Instant Search</span>
        </div>
        <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm rounded-full px-4 py-2 border border-border/20">
          <Edit3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Live Preview</span>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const redirectAttempted = useRef(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading && !redirectAttempted.current) {
      console.log('🚀 AuthPage: User is authenticated, redirecting to home')
      redirectAttempted.current = true
      router.replace('/')
    }
  }, [isAuthenticated, loading, router])

  // Reset redirect attempt when user logs out
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      redirectAttempted.current = false
    }
  }, [isAuthenticated, loading])

  // Show loading state while redirecting
  if (isAuthenticated && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <FileText className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Welcome back!</h2>
            <p className="text-muted-foreground">Taking you to your notes...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleAuthSuccess = () => {
    console.log('✅ AuthPage: Authentication successful')
    setShowModal(false)
  }

  return (
    <div className="relative min-h-screen">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Floating CTA Card */}
      <div className="fixed top-1/2 right-8 transform -translate-y-1/2 z-40 hidden lg:block">
        <Card className="w-80 bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <Badge variant="secondary" className="text-xs">Ready to start?</Badge>
            </div>
            <CardTitle className="text-xl">
              Join thousands of writers
            </CardTitle>
            <CardDescription>
              Start capturing your best ideas today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time markdown preview</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Advanced search & organization</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Sync across all devices</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowModal(true)}
              className="w-full h-11 text-base font-medium"
              size="lg"
            >
              Start writing for free
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              No credit card required • Setup in 30 seconds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mobile CTA - Bottom */}
      <div className="fixed bottom-6 left-4 right-4 z-40 lg:hidden">
        <Card className="bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to start?</h3>
                <p className="text-sm text-muted-foreground">Join thousands of writers</p>
              </div>
              <Button 
                onClick={() => setShowModal(true)}
                className="h-10"
              >
                Get started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hero Parallax Background */}
      <div className="relative">
        <HeroParallax 
          products={showcaseProducts}
          Header={NotesHeroHeader}
        />
      </div>

      {/* OTP Authentication Modal */}
      <OTPAuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  )
} 