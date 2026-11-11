import { QueryClient } from '@tanstack/react-query';

const SESSION_CACHE_KEY = 'MOONPULSE_SESSION_QUERY_CACHE';
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes tab cache lifetime

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 minutes: data remains fresh and prevents redundant network trips
      gcTime: 15 * 60 * 1000,    // 15 minutes: keep unused queries in cache before garbage collecting
      refetchOnWindowFocus: false, // Prevents sudden flashes when switching browser tabs
      retry: 1,                  // Retry failed queries once before marking as error
    },
    mutations: {
      retry: 0,
    },
  },
});

// ============================================================================
// ENTERPRISE SESSIONSTORAGE REHYDRATION & PERSISTENCE
// Guarantees 0ms instant renders across browser Back/Forward and F5 hard refreshes
// ============================================================================
const rehydrateFromSessionStorage = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const now = Date.now();

    if (Array.isArray(parsed)) {
      parsed.forEach(({ queryKey, data, timestamp }) => {
        if (now - timestamp < MAX_AGE_MS && data !== undefined) {
          queryClient.setQueryData(queryKey, data, { updatedAt: timestamp });
        }
      });
    }
  } catch (err) {
    console.warn('Failed to rehydrate query cache from sessionStorage:', err);
  }
};

// Rehydrate immediately on startup (< 1ms before React tree renders)
rehydrateFromSessionStorage();

// Debounced synchronization of successful queries into sessionStorage
let saveTimeout = null;
const persistToSessionStorage = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    try {
      const allQueries = queryClient.getQueryCache().getAll();
      const now = Date.now();
      const serializableQueries = [];

      allQueries.forEach((q) => {
        if (q.state.status === 'success' && q.state.data !== undefined) {
          const firstKey = Array.isArray(q.queryKey) ? String(q.queryKey[0]) : '';
          // Whitelist key features for persistence: brands, pages, missions, posts, statistics
          if (['brands', 'pages', 'missions', 'posts', 'statistics'].includes(firstKey)) {
            serializableQueries.push({
              queryKey: q.queryKey,
              data: q.state.data,
              timestamp: q.state.dataUpdatedAt || now,
            });
          }
        }
      });

      window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(serializableQueries));
    } catch {
      // Ignore quota exceeded or serialization errors
    }
  }, 400);
};

queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'updated' && event.action?.type === 'success') {
    persistToSessionStorage();
  }
});

