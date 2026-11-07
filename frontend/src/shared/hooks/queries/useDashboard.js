import { useQuery } from '@tanstack/react-query';
import apiClient from '../../utils/apiClient';

/**
 * High-performance TanStack Query hook for Executive Dashboard statistics
 */
export const useDashboardStats = (range = 'this_week', platform = 'all', options = {}) => {
  const timezone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh'
    : 'Asia/Phnom_Penh';

  return useQuery({
    queryKey: ['statistics', 'dashboard', { range, platform, timezone }],
    queryFn: async () => {
      const res = await apiClient.get('/statistics/dashboard', {
        params: { range, platform, timezone },
      });
      return res.data?.data || null;
    },
    staleTime: 3 * 60 * 1000,
    ...options,
  });
};

/**
 * High-performance TanStack Query hook for Executive Dashboard profit metrics
 */
export const useDashboardProfit = (range = 'this_week', platform = 'all', options = {}) => {
  const timezone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh'
    : 'Asia/Phnom_Penh';

  return useQuery({
    queryKey: ['statistics', 'profit', { range, platform, timezone }],
    queryFn: async () => {
      const res = await apiClient.get('/profit/dashboard', {
        params: { range, platform, timezone },
      });
      return res.data?.data || null;
    },
    staleTime: 3 * 60 * 1000,
    ...options,
  });
};

