import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

/**
 * Fetches the EUR/USD exchange rate via the standard quote route.
 * Yahoo's `EURUSD=X` price is USD per 1 EUR (e.g. 1.08), so converting a
 * USD amount to EUR means dividing by the rate. `usdToEur` encapsulates that
 * so call sites can't get the direction wrong.
 *
 * FX moves slowly relative to equities, so this is cached for an hour.
 */
export function useEurUsdRate() {
  const api = useApiClient();
  const { data } = useQuery({
    queryKey: ['quote', 'EURUSD=X'],
    queryFn: () => api.getQuote('EURUSD=X'),
    staleTime: 60 * 60_000,
    refetchInterval: 60 * 60_000,
  });
  const rate = data?.price && data.price > 0 ? data.price : null;
  return {
    rate, // USD per 1 EUR, or null until loaded
    usdToEur: rate ? (usd: number) => usd / rate : null,
  };
}
