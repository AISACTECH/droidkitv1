import { QueryClient } from '@tanstack/react-query'

/**
 * Production-grade QueryClient with reliability-focused defaults
 * - Stale time 30s to reduce ADB polling pressure
 * - GC 5m to keep device cache warm
 * - Smart retry: no retry on device not found/permission denied
 * - Exponential backoff for transient ADB errors
 * - Window focus refetch disabled for performance mode (can re-enable via settings)
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - balances freshness vs ADB load
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          const msg = error.message.toLowerCase()
          // Don't retry on permanent failures
          if (
            msg.includes('device not found') ||
            msg.includes('permission denied') ||
            msg.includes('no device connected') ||
            msg.includes('unauthorized') ||
            msg.includes('offline')
          ) {
            return false
          }
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false, // production: avoid aggressive refetch that spikes CPU
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: 'offlineFirst', // serve cache first for consistency on flaky networks
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
})
