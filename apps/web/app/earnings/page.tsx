'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTitle } from '@/hooks/useTitle';
import {
  useEarningsCalendar,
  useWatchlists,
  usePortfolios,
  useAllTransactions,
  useStockQuotes,
  formatCurrency,
  formatDate,
  type EarningsEvent,
} from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

function getDateRange() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 30);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function EarningsPage() {
  useTitle('Earnings');
  const { from, to } = useMemo(getDateRange, []);
  const { data: earnings, isLoading: loadingEarnings } = useEarningsCalendar(from, to);
  const { data: watchlists } = useWatchlists();
  const { data: portfolios } = usePortfolios();
  const portfolioIds = useMemo(() => (portfolios || []).map((p) => p.id), [portfolios]);
  const txResults = useAllTransactions(portfolioIds);

  // Collect symbols from both watchlists and portfolios
  const mySymbols = useMemo(() => {
    const s = new Set<string>();
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.add(i.symbol)));
    for (const result of txResults) {
      if (result.data) for (const t of result.data) s.add(t.symbol);
    }
    return [...s];
  }, [watchlists, txResults]);

  const { data: quotes, isLoading: loadingQuotes } = useStockQuotes(mySymbols);
  const isLoading = loadingEarnings || loadingQuotes;

  // My earnings: derive from Yahoo earningsTimestamp (reliable for major US stocks),
  // enrich with Finnhub EPS/revenue when available.
  const myEarnings = useMemo(() => {
    if (!quotes) return [];
    const now = Date.now();
    const cutoffMs = now + 30 * 86400000;
    const finnhubBySymbol = new Map<string, EarningsEvent>();
    earnings?.forEach((e) => {
      if (!finnhubBySymbol.has(e.symbol)) finnhubBySymbol.set(e.symbol, e);
    });
    const seen = new Set<string>();
    return quotes
      .filter((q) => q.earningsTimestamp != null && q.earningsTimestamp > now && q.earningsTimestamp < cutoffMs)
      .map((q) => {
        const date = new Date(q.earningsTimestamp!).toISOString().split('T')[0];
        const enriched = finnhubBySymbol.get(q.symbol);
        return {
          symbol: q.symbol,
          date,
          hour: enriched?.hour ?? 'unknown',
          epsEstimate: enriched?.epsEstimate ?? null,
          epsActual: enriched?.epsActual ?? null,
          revenueEstimate: enriched?.revenueEstimate ?? null,
          name: q.name,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((e) => {
        // Deduplicate by name (e.g. GOOG and GOOGL are both "Alphabet Inc.")
        const key = e.name.toLowerCase().replace(/[^a-z]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [quotes, earnings]);

  const otherEarnings = useMemo(() => {
    if (!earnings) return [];
    const mySet = new Set(mySymbols);
    return earnings.filter((e) => !mySet.has(e.symbol)).slice(0, 50);
  }, [earnings, mySymbols]);

  const hourLabel: Record<string, string> = {
    bmo: 'Before Open',
    amc: 'After Close',
    dmh: 'During Hours',
    unknown: '—',
  };

  type EarningsRow = {
    symbol: string;
    date: string;
    hour: string;
    epsEstimate?: number | null;
    epsActual?: number | null;
    revenueEstimate?: number | null;
  };

  function renderTable(items: EarningsRow[], title: string) {
    if (items.length === 0) return null;
    return (
      <Card className="overflow-hidden p-0 mb-6">
        <h3 className="px-4 py-3 font-semibold border-b border-gray-200 bg-gray-50">{title}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-500">Date</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500">Symbol</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500">Time</th>
              <th className="text-right px-4 py-2 font-medium text-gray-500">EPS Est.</th>
              <th className="text-right px-4 py-2 font-medium text-gray-500">EPS Act.</th>
              <th className="text-right px-4 py-2 font-medium text-gray-500">Revenue Est.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e, i) => (
              <tr key={`${e.symbol}-${e.date}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">{formatDate(e.date)}</td>
                <td className="px-4 py-2">
                  <Link href={`/stocks/${e.symbol}`} target="_blank" className="font-medium text-primary hover:underline">
                    {e.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500">{hourLabel[e.hour] || e.hour}</td>
                <td className="px-4 py-2 text-right">{e.epsEstimate != null ? `$${e.epsEstimate.toFixed(2)}` : '—'}</td>
                <td className="px-4 py-2 text-right">{e.epsActual != null ? `$${e.epsActual.toFixed(2)}` : '—'}</td>
                <td className="px-4 py-2 text-right">{e.revenueEstimate != null ? formatCurrency(e.revenueEstimate) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Earnings Calendar</h1>
      <p className="text-sm text-gray-500 mb-6">Next 30 days ({from} to {to})</p>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {!isLoading && myEarnings.length === 0 && otherEarnings.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">No earnings data available. Make sure your Finnhub API key is configured.</p>
        </Card>
      )}

      {renderTable(myEarnings, 'Your Watchlist Earnings')}
      {renderTable(otherEarnings, 'Other Upcoming Earnings')}
    </div>
  );
}
