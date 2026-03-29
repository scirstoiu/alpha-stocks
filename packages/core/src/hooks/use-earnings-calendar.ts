import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useEarningsCalendar(from: string, to: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['earnings', from, to],
    queryFn: () => api.getEarningsCalendar(from, to),
    staleTime: 600_000,
    enabled: !!from && !!to,
  });
}
