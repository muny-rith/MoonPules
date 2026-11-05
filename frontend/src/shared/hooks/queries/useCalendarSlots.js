import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../utils/queryKeys';
import * as missionApi from '../../../features/missions/api/missionApi';

export const useCalendarSlots = (brandId = 'all', month, year, options = {}) => {
  return useQuery({
    queryKey: queryKeys.missions.slots(brandId, month, year),
    queryFn: () => missionApi.getCalendarSlots(brandId, month, year),
    staleTime: 2 * 60 * 1000, // 2 minutes fresh cache
    select: (data) => (Array.isArray(data) ? data : []),
    enabled: Boolean(month && year),
    ...options,
  });
};

