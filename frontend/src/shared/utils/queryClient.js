import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes: data remains fresh and prevents redundant network trips
      gcTime: 10 * 60 * 1000,    // 10 minutes: keep unused queries in cache before garbage collecting
      refetchOnWindowFocus: false, // Prevents sudden flashes when switching browser tabs
      retry: 1,                  // Retry failed queries once before marking as error
    },
    mutations: {
      retry: 0,
    },
  },
});

