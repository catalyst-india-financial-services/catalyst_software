import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './routes'
import { Toaster } from 'sonner'

/**
 * Production QueryClient configuration:
 * - staleTime: 2 min  — data is considered fresh for 2 minutes (no refetch on every nav)
 * - gcTime: 10 min    — unused data stays in cache for 10 minutes
 * - refetchOnWindowFocus: true  — ALWAYS refetch when the tab comes back into focus
 * - refetchOnReconnect: true    — refetch when internet reconnects
 * - refetchOnMount: true        — always load latest data when component mounts
 * - retry: 2                   — retry failed requests twice before showing error
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 minutes
      gcTime: 1000 * 60 * 10,        // 10 minutes
      refetchOnWindowFocus: true,     // refresh when user returns to tab
      refetchOnReconnect: true,       // refresh after network reconnect
      refetchOnMount: true,           // always fetch latest on mount
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
