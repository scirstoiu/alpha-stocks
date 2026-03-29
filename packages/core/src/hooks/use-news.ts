import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useNews(symbol?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['news', symbol || 'general'],
    queryFn: () => api.getNews(symbol),
    staleTime: 300_000,
  });
}
