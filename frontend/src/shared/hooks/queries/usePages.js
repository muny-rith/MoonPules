import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../utils/queryKeys';
import { fetchPages } from '../../../features/postTracker/api/postTrackerApi';

export const usePages = () => {
  return useQuery({
    queryKey: queryKeys.pages.all,
    queryFn: fetchPages,
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
    select: (data) => (Array.isArray(data) ? data : []),
  });
};

