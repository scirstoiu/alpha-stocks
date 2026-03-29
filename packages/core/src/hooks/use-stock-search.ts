import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useStockSearch(query: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.searchSymbols(query),
    staleTime: 60_000,
    enabled: query.length >= 2,
  });
}
