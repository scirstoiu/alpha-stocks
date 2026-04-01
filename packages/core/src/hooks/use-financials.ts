import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useFinancials(symbol: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['financials', symbol],
    queryFn: () => api.getFinancials(symbol),
    staleTime: 600_000,
    enabled: !!symbol,
  });
}
