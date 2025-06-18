import { pb } from './pocketbase'

export interface User {
  id: string
  email: string
  name?: string
  created: string
  updated: string
}

export interface OTPRequestResult {
  otpId: string
}

// Traditional password-based authentication
export async function login(email: string, password: string): Promise<User> {
  const authData = await pb.collection('users').authWithPassword(email, password)
  return authData.record as unknown as User
}

export async function signup(email: string, password: string, passwordConfirm: string, name?: string): Promise<User> {
  const data = {
    email,
    password,
    passwordConfirm,
    name: name || '',
  }
  
  const record = await pb.collection('users').create(data)
  return record as unknown as User
}

// OTP-based authentication
export async function requestOTP(email: string): Promise<OTPRequestResult> {
  console.log('🔐 Requesting OTP for email:', email)
  
  try {
    const result = await pb.collection('users').requestOTP(email.trim())
    console.log('✅ OTP request successful, otpId:', result.otpId)
    return result
  } catch (error) {
    console.error('❌ OTP request failed:', error)
    throw error
  }
}

export async function verifyOTP(otpId: string, otpCode: string): Promise<User> {
  console.log('🔐 Verifying OTP with otpId:', otpId)
  
  try {
    const authData = await pb.collection('users').authWithOTP(otpId, otpCode.trim())
    console.log('✅ OTP verification successful')
    return authData.record as unknown as User
  } catch (error) {
    console.error('❌ OTP verification failed:', error)
    throw error
  }
}

// OTP-based signup (creates account if email doesn't exist, then sends OTP)
export async function signupWithOTP(email: string, name?: string): Promise<OTPRequestResult> {
  console.log('🔐 Attempting OTP signup for email:', email)
  
  try {
    // First, try to create the user with a temporary password
    // This will fail if the user already exists, which is fine
    try {
      const tempPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
      await pb.collection('users').create({
        email: email.trim(),
        password: tempPassword,
        passwordConfirm: tempPassword,
        name: name?.trim() || email.split('@')[0],
        emailVisibility: false
      })
      console.log('✅ New user account created')
    } catch {
      // If user already exists, that's okay - we'll proceed with OTP
      console.log('ℹ️ User might already exist, proceeding with OTP request')
    }
    
    // Now request OTP for the email
    const result = await requestOTP(email)
    console.log('✅ OTP signup process initiated')
    return result
  } catch (error) {
    console.error('❌ OTP signup failed:', error)
    throw error
  }
}

export function logout(): void {
  pb.authStore.clear()
}

export function getCurrentUser(): User | null {
  return pb.authStore.model as User | null
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid
} 