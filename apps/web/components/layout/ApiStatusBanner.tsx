'use client';

import { useQuery } from '@tanstack/react-query';

type ProviderStatus = 'up' | 'down' | 'not_configured';

interface ApiStatus {
  yahoo: ProviderStatus;
  twelveData: ProviderStatus;
  finnhub: ProviderStatus;
  checkedAt: number;
}

const PROVIDER_NAMES: { key: keyof Omit<ApiStatus, 'checkedAt'>; label: string }[] = [
  { key: 'yahoo', label: 'Yahoo Finance' },
  { key: 'twelveData', label: 'Twelve Data' },
  { key: 'finnhub', label: 'Finnhub' },
];

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

  if (!status) return null;

  const downProviders = PROVIDER_NAMES.filter((p) => status[p.key] === 'down');
  const configuredProviders = PROVIDER_NAMES.filter((p) => status[p.key] !== 'not_configured');
  const anyUp = configuredProviders.some((p) => status[p.key] === 'up');

  if (downProviders.length === 0) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
      <span className="font-medium">Data provider issue:</span>{' '}
      {downProviders.map((p) => p.label).join(', ')}{' '}
      {downProviders.length === 1 ? 'is' : 'are'} currently unavailable.
      {anyUp
        ? ' Some data may be missing or delayed.'
        : ' All market data providers are down.'}
    </div>
  );
}
