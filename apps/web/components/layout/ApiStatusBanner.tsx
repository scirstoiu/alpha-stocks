'use client';

import { useQuery } from '@tanstack/react-query';

interface ApiStatus {
  yahoo: boolean;
  twelveData: boolean;
  finnhub: boolean;
  checkedAt: number;
}

export default function ApiStatusBanner() {
  const { data: status } = useQuery<ApiStatus>({
    queryKey: ['api-status'],
    queryFn: async () => {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Status check failed');
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 0,
  });

  if (!status || (status.yahoo && status.twelveData && status.finnhub)) return null;

  const downProviders: string[] = [];
  if (!status.yahoo) downProviders.push('Yahoo Finance');
  if (!status.twelveData) downProviders.push('Twelve Data');
  if (!status.finnhub) downProviders.push('Finnhub');

  const anyUp = status.yahoo || status.twelveData || status.finnhub;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
      <span className="font-medium">Data provider issue:</span>{' '}
      {downProviders.join(', ')}{' '}
      {downProviders.length === 1 ? 'is' : 'are'} currently unavailable.
      {anyUp
        ? ' Some data may be missing or delayed.'
        : ' All market data providers are down.'}
    </div>
  );
}
