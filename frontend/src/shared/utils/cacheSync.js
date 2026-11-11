import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import { clearBrandCache } from '../../features/statistics/services/brandStatsService';
import { clearDashboardCache } from '../../features/dashboard/pages/DashboardPage';

/**
 * Enterprise Cache Invalidation & Synchronization
 * Ensures that whenever a post or mission slot is created, updated, or deleted,
 * ALL cache tiers (TanStack Query RAM, sessionStorage, and module caches) are
 * instantly invalidated and refetched with fresh data across all tabs and routes.
 */

export const invalidatePostAndMissionCaches = async () => {
  try {
    // 1. Invalidate TanStack Query caches (Posts, Missions, Statistics)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all }),
    ]);

    // 2. Clear module-level in-memory caches
    if (typeof clearBrandCache === 'function') {
      clearBrandCache();
    }
    if (typeof clearDashboardCache === 'function') {
      clearDashboardCache();
    }

    // 3. Clear window ad-hoc caches if present
    if (typeof window !== 'undefined' && window.__moonpulse_mission_cache) {
      window.__moonpulse_mission_cache.clear();
    }

    // 4. Clear persisted sessionStorage query cache so stale snapshots never resurrect
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('MOONPULSE_SESSION_QUERY_CACHE');
    }
  } catch (err) {
    console.warn('[cacheSync] Failed to invalidate all caches cleanly:', err);
  }
};

export const invalidateMissionCaches = async () => {
  try {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all }),
    ]);

    if (typeof clearBrandCache === 'function') {
      clearBrandCache();
    }
    if (typeof window !== 'undefined' && window.__moonpulse_mission_cache) {
      window.__moonpulse_mission_cache.clear();
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('MOONPULSE_SESSION_QUERY_CACHE');
    }
  } catch (err) {
    console.warn('[cacheSync] Failed to invalidate mission caches:', err);
  }
};

