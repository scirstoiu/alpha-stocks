import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useStockQuote(symbol: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => api.getQuote(symbol),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !!symbol,
  });
}

export function useStockQuotes(symbols: string[]) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['quotes', ...symbols.sort()],
    queryFn: () => api.getQuotes(symbols),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: symbols.length > 0,
  });
}
