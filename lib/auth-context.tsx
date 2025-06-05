"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { pb } from './pocketbase'

interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name?: string) => Promise<boolean>
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user && pb.authStore.isValid

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth()
  }, []) // Empty dependency array - only run once on mount

  const initializeAuth = async () => {
    console.log('🔐 AuthContext: Starting auth initialization...')
    
    // Handle SSR case - only run auth logic on client side
    if (typeof window === 'undefined') {
      console.log('🔐 AuthContext: Server-side rendering, skipping auth init')
      setLoading(false)
      return
    }

    try {
      // Check if we have a valid token
      if (pb.authStore.isValid && pb.authStore.record) {
        console.log('✅ Found valid auth token, verifying...')
        
        try {
          // Try to refresh the token to ensure it's still valid
          await pb.collection('users').authRefresh()
          console.log('✅ Auth token verified successfully')
          
          const record = pb.authStore.record
          const userData = {
            id: record.id,
            email: record.email,
            name: record.name,
            avatar: record.avatar
          }
          
          setUser(userData)
          console.log('✅ User set from valid token:', userData.email)
        } catch (refreshError: unknown) {
          const errorMessage = refreshError instanceof Error ? refreshError.message : 'Unknown error'
          console.log('⚠️ Auth token refresh failed, clearing auth:', errorMessage)
          pb.authStore.clear()
          setUser(null)
        }
      } else {
        console.log('❌ No valid auth token found')
        setUser(null)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error initializing auth:', errorMessage)
      pb.authStore.clear()
      setUser(null)
    } finally {
      console.log('🔐 AuthContext: Setting loading to false')
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Attempting login for:', email)
      
      const authData = await pb.collection('users').authWithPassword(email.trim(), password)
      console.log('✅ Login successful!')
      
      const userData = {
        id: authData.record.id,
        email: authData.record.email,
        name: authData.record.name,
        avatar: authData.record.avatar
      }
      
      setUser(userData)
      console.log('✅ Login process complete for:', userData.email)
      toast.success('Welcome back!')
      return true
    } catch (error: unknown) {
      console.error('❌ Login failed:', error)
      
      // Handle specific PocketBase authentication errors
      if (error && typeof error === 'object' && 'status' in error) {
        const pbError = error as { status: number; message?: string }
        if (pbError.status === 400) {
          toast.error('Invalid email or password. Please check your credentials and try again.')
        } else {
          toast.error('Login failed. Please try again later.')
        }
      } else {
        toast.error('An unexpected error occurred. Please try again.')
      }
      
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, name?: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Attempting registration for:', email)
      
      // Create the user account
      await pb.collection('users').create({
        email: email.trim(),
        password,
        passwordConfirm: password,
        name: name?.trim() || email.split('@')[0]
      })
      
      console.log('✅ User account created successfully!')
      
      // Auto-login after registration
      const loginSuccess = await login(email, password)
      
      if (loginSuccess) {
        console.log('✅ Registration and auto-login successful')
        toast.success('Account created successfully! Welcome!')
        return true
      } else {
        // Login failed after successful registration
        toast.error('Account created but login failed. Please try signing in manually.')
        return false
      }
    } catch (error: unknown) {
      console.error('❌ Registration failed:', error)
      
      // Handle specific PocketBase registration errors
      if (error && typeof error === 'object' && 'status' in error) {
        const pbError = error as { status: number; message?: string; data?: Record<string, unknown> }
        if (pbError.status === 400) {
          // Check for specific validation errors
          if (pbError.data && pbError.data.email) {
            toast.error('This email is already registered. Please use a different email or try signing in.')
          } else if (pbError.data && pbError.data.password) {
            toast.error('Password must be at least 8 characters long.')
          } else {
            toast.error('Please check your information and try again.')
          }
        } else {
          toast.error('Registration failed. Please try again later.')
        }
      } else {
        toast.error('An unexpected error occurred during registration.')
      }
      
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    console.log('🚪 Logging out user')
    pb.authStore.clear()
    setUser(null)
    router.push('/auth')
  }

  const refreshAuth = async () => {
    if (!pb.authStore.isValid) {
      return
    }
    
    try {
      await pb.collection('users').authRefresh()
      const record = pb.authStore.record
      if (record) {
        setUser({
          id: record.id,
          email: record.email,
          name: record.name,
          avatar: record.avatar
        })
        console.log('✅ Auth refresh successful')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Auth refresh failed:', errorMessage)
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 