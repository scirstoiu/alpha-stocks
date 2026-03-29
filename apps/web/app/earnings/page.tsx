'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  useEarningsCalendar,
  useWatchlists,
  usePortfolios,
  useTransactions,
  formatCurrency,
  formatDate,
} from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

function getDateRange() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 14);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function EarningsPage() {
  const { from, to } = useMemo(getDateRange, []);
  const { data: earnings, isLoading } = useEarningsCalendar(from, to);
  const { data: watchlists } = useWatchlists();

  // Collect all symbols from watchlists
  const mySymbols = useMemo(() => {
    const symbols = new Set<string>();
    watchlists?.forEach((wl) => {
      wl.items?.forEach((item) => symbols.add(item.symbol));
    });
    return symbols;
  }, [watchlists]);

  // Filter earnings to show user's tickers first, then the rest
  const { myEarnings, otherEarnings } = useMemo(() => {
    if (!earnings) return { myEarnings: [], otherEarnings: [] };
    const my = earnings.filter((e) => mySymbols.has(e.symbol));
    const other = earnings.filter((e) => !mySymbols.has(e.symbol));
    return { myEarnings: my, otherEarnings: other.slice(0, 50) };
  }, [earnings, mySymbols]);

  const hourLabel: Record<string, string> = {
    bmo: 'Before Open',
    amc: 'After Close',
    dmh: 'During Hours',
    unknown: '—',
  };

  function renderTable(items: typeof myEarnings, title: string) {
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
                  <Link href={`/stocks/${e.symbol}`} className="font-medium text-primary hover:underline">
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
      <p className="text-sm text-gray-500 mb-6">Next 2 weeks ({from} to {to})</p>

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
