import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../utils/queryKeys';
import { getBrandStats, getBrandDetail, getCombinedBrandDetail } from '../../../features/statistics/services/brandStatsService';

/**
 * High-performance TanStack Query hook for Brand Statistics list
 */
export const useBrandStats = (params = {}, options = {}) => {
  const range = params?.range || 'this_month';

  return useQuery({
    queryKey: queryKeys.statistics.dashboard(range, params),
    queryFn: () => getBrandStats(params),
    staleTime: 3 * 60 * 1000,
    select: (data) => (Array.isArray(data) ? data : []),
    ...options,
  });
};

/**
 * High-performance TanStack Query hook for single or combined Brand Detail
 */
export const useBrandDetail = (brandId, params = {}, options = {}) => {
  const isCombined = Array.isArray(brandId);
  const key = isCombined ? `combined_${[...brandId].sort().join(',')}` : String(brandId);

  return useQuery({
    queryKey: queryKeys.statistics.brand(key, params),
    queryFn: () => {
      if (isCombined) {
        return getCombinedBrandDetail(brandId, params);
      }
      return getBrandDetail(brandId, params);
    },
    staleTime: 3 * 60 * 1000,
    enabled: Boolean(brandId && (isCombined ? brandId.length > 0 : true)),
    ...options,
  });
};

