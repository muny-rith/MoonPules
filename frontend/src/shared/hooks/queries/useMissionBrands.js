import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../utils/queryKeys';
import * as missionApi from '../../../features/missions/api/missionApi';

export const useMissionBrands = (month, year, options = {}) => {
  return useQuery({
    queryKey: queryKeys.missions.brands(month, year),
    queryFn: () => missionApi.getMissionBrands(month, year),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    select: (data) => (Array.isArray(data) ? data : []),
    ...options,
  });
};
