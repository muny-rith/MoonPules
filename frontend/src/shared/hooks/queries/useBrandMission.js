import { useQuery } from '@tanstack/react-query';
import * as missionApi from '../../../features/missions/api/missionApi';

/**
 * High-performance TanStack Query hook for single Brand Monthly Mission & Deliverables
 */
export const useBrandMission = (brandId, month, year, options = {}) => {
  return useQuery({
    queryKey: ['missions', 'detail', String(brandId), month, year],
    queryFn: () => missionApi.getMission(brandId, month, year),
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(brandId && month && year),
    ...options,
  });
};

