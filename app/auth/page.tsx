"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FileText, LogIn, UserPlus, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ModeToggle } from '@/components/mode-toggle'

export default function AuthPage() {
  const router = useRouter()
  const { login, register, loading, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('signin')
  const [localLoading, setLocalLoading] = useState(false)
  const [error, setError] = useState('')
  const redirectAttempted = useRef(false)
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const isFormLoading = loading || localLoading

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
            <p className="text-muted-foreground">Redirecting to your notes...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent, isSignIn: boolean) => {
    e.preventDefault()
    setLocalLoading(true)
    setError('')

    try {
      let success = false
      
      if (isSignIn) {
        success = await login(email, password)
        if (success) {
          console.log('✅ AuthPage: Login successful')
        }
      } else {
        success = await register(email, password, name)
        if (success) {
          console.log('✅ AuthPage: Registration successful')
        }
      }
      
      // Error handling is now done in auth-context with toast notifications
      // We don't need to handle errors here since they're shown via toast
      
    } catch (err: unknown) {
      // Handle any unexpected errors that aren't caught in auth-context
      console.error(`❌ AuthPage: Unexpected error during ${isSignIn ? 'login' : 'registration'}:`, err)
      const errorMessage = err instanceof Error ? err.message : `Failed to ${isSignIn ? 'login' : 'create account'}`
      setError(errorMessage)
    } finally {
      setLocalLoading(false)
    }
  }

  // Clear error when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Theme Toggle - positioned in top-right corner */}
      <div className="absolute top-4 right-4 z-10">
        <ModeToggle />
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Markdown Notes</h1>
            <p className="text-muted-foreground mt-2">
              Your personal note-taking workspace
            </p>
          </div>

          {/* Auth Card with Tabs */}
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 hover:cursor-pointer">
                  <TabsTrigger value="signin" className="hover:cursor-pointer">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="hover:cursor-pointer">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Welcome Back</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your credentials to access your notes
                    </p>
                  </div>
                  
                  <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isFormLoading}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isFormLoading}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        placeholder="Password (min 8 characters)"
                      />
                    </div>
                    
                    {error && (
                      <div className="flex items-center space-x-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    <Button type="submit" disabled={isFormLoading} className="w-full hover:cursor-pointer">
                      {isFormLoading ? (
                        'Loading...'
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold">Get Started</h3>
                    <p className="text-sm text-muted-foreground">
                      Create your account to start taking notes
                    </p>
                  </div>
                  
                  <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isFormLoading}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isFormLoading}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        placeholder="Password (min 8 characters)"
                      />
                    </div>
                    
                    {error && (
                      <div className="flex items-center space-x-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    <Button type="submit" disabled={isFormLoading} className="w-full hover:cursor-pointer">
                      {isFormLoading ? (
                        'Loading...'
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 