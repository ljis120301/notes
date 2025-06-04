"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
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
        } catch (refreshError: any) {
          console.log('⚠️ Auth token refresh failed, clearing auth:', refreshError.message)
          pb.authStore.clear()
          setUser(null)
        }
      } else {
        console.log('❌ No valid auth token found')
        setUser(null)
      }
    } catch (error: any) {
      console.error('❌ Error initializing auth:', error.message)
      pb.authStore.clear()
      setUser(null)
    } finally {
      console.log('🔐 AuthContext: Setting loading to false')
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
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
    } catch (error: any) {
      console.error('❌ Login failed:', error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, name?: string) => {
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
      await login(email, password)
      
      console.log('✅ Registration and auto-login successful')
    } catch (error: any) {
      console.error('❌ Registration failed:', error.message)
      throw error
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
    } catch (error: any) {
      console.error('❌ Auth refresh failed:', error.message)
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