import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useStockLogo(symbol: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['stock-logo', symbol],
    queryFn: () => api.getStockLogo(symbol),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    enabled: !!symbol,
  });
}
