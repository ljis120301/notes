"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create QueryClient with simpler, more reliable defaults
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // More reasonable defaults for a notes app
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on authentication errors
          if (error?.status === 401 || error?.status === 403) {
            return false
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: false, // Prevent disruptions
        refetchOnReconnect: true, // Do refetch when connection is restored
        refetchOnMount: true, // Allow refetch on mount for fresh data
      },
      mutations: {
        retry: (failureCount, error: any) => {
          if (error?.status === 401 || error?.status === 403) {
            return false
          }
          return failureCount < 2
        },
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
} 