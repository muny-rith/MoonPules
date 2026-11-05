import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../utils/queryKeys';
import { fetchBrands } from '../../../features/product/services/productService';

export const useBrands = () => {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: fetchBrands,
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
    select: (data) => (Array.isArray(data) ? data : []),
  });
};

