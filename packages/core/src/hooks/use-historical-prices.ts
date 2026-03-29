import { useQuery } from '@tanstack/react-query';
import type { HistoricalRange } from '../types/stock';
import { useApiClient } from './use-api-client';

export function useHistoricalPrices(symbol: string, range: HistoricalRange) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['historical', symbol, range],
    queryFn: () => api.getHistoricalPrices(symbol, range),
    staleTime: 300_000,
    enabled: !!symbol,
  });
}
