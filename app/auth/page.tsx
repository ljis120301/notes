"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, LogIn, UserPlus, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { pb } from '@/lib/pocketbase'
import { ModeToggle } from '@/components/mode-toggle'

export default function AuthPage() {
  const router = useRouter()
  const { login, register, loading, isAuthenticated } = useAuth()
  const [isLogin, setIsLogin] = useState(false)
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

  const handleTestLogin = async () => {
    setLocalLoading(true)
    setError('')
    
    try {
      await login('test@example.com', 'testpassword123')
      console.log('✅ AuthPage: Test login successful')
    } catch {
      console.log('⚠️ AuthPage: Test login failed, trying to create test account...')
      try {
        await pb.collection('users').create({
          email: 'test@example.com',
          password: 'testpassword123',
          passwordConfirm: 'testpassword123',
          name: 'Test User'
        })
        console.log('✅ AuthPage: Test account created, now logging in...')
        await login('test@example.com', 'testpassword123')
        console.log('✅ AuthPage: Test account created and logged in')
      } catch (createError: unknown) {
        console.error('❌ AuthPage: Failed to create test account:', createError)
        const errorMessage = createError instanceof Error ? createError.message : 'Unknown error occurred'
        setError('Failed to create test account: ' + errorMessage)
      }
    } finally {
      setLocalLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalLoading(true)
    setError('')

    try {
      if (isLogin) {
        await login(email, password)
        console.log('✅ AuthPage: Login successful')
      } else {
        await register(email, password, name)
        console.log('✅ AuthPage: Registration successful')
      }
    } catch (err: unknown) {
      console.error(`❌ AuthPage: ${isLogin ? 'Login' : 'Registration'} failed:`, err)
      const errorMessage = err instanceof Error ? err.message : `Failed to ${isLogin ? 'login' : 'create account'}`
      setError(errorMessage)
    } finally {
      setLocalLoading(false)
    }
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
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>

          {/* Quick Test Login */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-center space-y-3">
              <h3 className="font-medium">Quick Test Access</h3>
              <p className="text-sm text-muted-foreground">
                Use our test account to try the app immediately
              </p>
              <Button
                onClick={handleTestLogin}
                disabled={isFormLoading}
                variant="outline"
                className="w-full hover:cursor-pointer"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {isFormLoading ? 'Signing in...' : 'Test Login'}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Auth Form */}
          <div className="bg-card border border-border rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your name (optional)"
                  />
                </div>
              )}
              
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
                ) : isLogin ? (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                }}
                disabled={isFormLoading}
                className="text-sm text-primary hover:underline disabled:opacity-50 hover:cursor-pointer"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 