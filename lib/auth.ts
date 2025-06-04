import { pb } from './pocketbase'

export interface User {
  id: string
  email: string
  name?: string
  created: string
  updated: string
}

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

export function logout(): void {
  pb.authStore.clear()
}

export function getCurrentUser(): User | null {
  return pb.authStore.model as User | null
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid
} 