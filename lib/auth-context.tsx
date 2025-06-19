"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { pb } from './pocketbase'
import { requestOTP, verifyOTP, signupWithOTP } from './auth'

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
  // Traditional password auth (kept for compatibility)
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name?: string) => Promise<boolean>
  // OTP-based auth methods
  requestLoginOTP: (email: string) => Promise<{ otpId: string } | null>
  verifyLoginOTP: (otpId: string, otpCode: string) => Promise<boolean>
  requestSignupOTP: (email: string, name?: string) => Promise<{ otpId: string } | null>
  verifySignupOTP: (otpId: string, otpCode: string) => Promise<boolean>
  // Common methods
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
            avatar: (record as { avatar?: string }).avatar
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

  // Traditional password-based login (kept for compatibility)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Attempting password login for:', email)
      
      const authData = await pb.collection('users').authWithPassword(email.trim(), password)
      console.log('✅ Password login successful!')
      
      const userData = {
        id: authData.record.id,
        email: authData.record.email,
        name: authData.record.name,
        avatar: authData.record.avatar
      }
      
      setUser(userData)
      console.log('✅ Password login process complete for:', userData.email)
      toast.success('Welcome back!')
      return true
    } catch (error: unknown) {
      console.error('❌ Password login failed:', error)
      handleAuthError(error, 'Login failed. Please check your credentials and try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Traditional registration (kept for compatibility)
  const register = async (email: string, password: string, name?: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Attempting password registration for:', email)
      
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
        toast.error('Account created but login failed. Please try signing in manually.')
        return false
      }
    } catch (error: unknown) {
      console.error('❌ Registration failed:', error)
      handleAuthError(error, 'Registration failed. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  // OTP-based login request
  const requestLoginOTP = async (email: string): Promise<{ otpId: string } | null> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Requesting login OTP for:', email)
      
      const result = await requestOTP(email)
      console.log('✅ Login OTP request successful')
      
      toast.success('Login code sent to your email!')
      return result
    } catch (error: unknown) {
      console.error('❌ Login OTP request failed:', error)
      handleAuthError(error, 'Failed to send login code. Please check your email and try again.')
      return null
    } finally {
      setLoading(false)
    }
  }

  // OTP-based login verification
  const verifyLoginOTP = async (otpId: string, otpCode: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Verifying login OTP')
      
      const authData = await verifyOTP(otpId, otpCode)
      console.log('✅ Login OTP verification successful!')
      
      const userData = {
        id: authData.id,
        email: authData.email,
        name: authData.name,
        avatar: (authData as User & { avatar?: string }).avatar
      }
      
      setUser(userData)
      console.log('✅ OTP login process complete for:', userData.email)
      toast.success('Welcome back!')
      return true
    } catch (error: unknown) {
      console.error('❌ Login OTP verification failed:', error)
      handleAuthError(error, 'Invalid or expired code. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  // OTP-based signup request
  const requestSignupOTP = async (email: string, name?: string): Promise<{ otpId: string } | null> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Requesting signup OTP for:', email)
      
      const result = await signupWithOTP(email, name)
      console.log('✅ Signup OTP request successful')
      
      toast.success('Welcome! A verification code has been sent to your email.')
      return result
    } catch (error: unknown) {
      console.error('❌ Signup OTP request failed:', error)
      handleAuthError(error, 'Failed to create account. Please try again.')
      return null
    } finally {
      setLoading(false)
    }
  }

  // OTP-based signup verification
  const verifySignupOTP = async (otpId: string, otpCode: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('🔐 AuthContext: Verifying signup OTP')
      
      const authData = await verifyOTP(otpId, otpCode)
      console.log('✅ Signup OTP verification successful!')
      
      const userData = {
        id: authData.id,
        email: authData.email,
        name: authData.name,
        avatar: (authData as User & { avatar?: string }).avatar
      }
      
      setUser(userData)
      console.log('✅ OTP signup process complete for:', userData.email)
      toast.success('Account created successfully! Welcome!')
      return true
    } catch (error: unknown) {
      console.error('❌ Signup OTP verification failed:', error)
      handleAuthError(error, 'Invalid or expired code. Please try again.')
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
          avatar: (record as { avatar?: string }).avatar
        })
        console.log('✅ Auth refresh successful')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Auth refresh failed:', errorMessage)
      logout()
    }
  }

  // Helper function to handle authentication errors
  const handleAuthError = (error: unknown, defaultMessage: string) => {
    if (error && typeof error === 'object' && 'status' in error) {
      const pbError = error as { status: number; message?: string; data?: Record<string, unknown> }
      if (pbError.status === 400) {
        if (pbError.data && pbError.data.email) {
          toast.error('This email is already registered. Please try signing in instead.')
        } else if (pbError.data && pbError.data.password) {
          toast.error('Password must be at least 8 characters long.')
        } else {
          toast.error('Please check your information and try again.')
        }
      } else if (pbError.status === 404) {
        toast.error('No account found with this email. Please check your email or create a new account.')
      } else {
        toast.error(defaultMessage)
      }
    } else {
      toast.error(defaultMessage)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    requestLoginOTP,
    verifyLoginOTP,
    requestSignupOTP,
    verifySignupOTP,
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