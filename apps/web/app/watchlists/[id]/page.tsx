'use client';

import { use, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  useWatchlist,
  useAddWatchlistItem,
  useRemoveWatchlistItem,
  useStockQuotes,
  useStockSearch,
  formatCurrency,
  formatPercent,
} from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

export default function WatchlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: watchlist, isLoading } = useWatchlist(id);
  const addItem = useAddWatchlistItem();
  const removeItem = useRemoveWatchlistItem();

  const symbols = watchlist?.items?.map((i) => i.symbol) || [];
  const { data: quotes } = useStockQuotes(symbols);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data: searchResults } = useStockSearch(debouncedQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchQuery]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
  }

  async function handleAddSymbol(symbol: string) {
    await addItem.mutateAsync({ watchlistId: id, symbol });
    setSearchQuery('');
    setDebouncedQuery('');
  }

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!watchlist) {
    return <p className="text-red-500">Watchlist not found.</p>;
  }

  const quoteMap = new Map(quotes?.map((q) => [q.symbol, q]));

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/watchlists" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">{watchlist.name}</h1>
        <span className="text-sm text-gray-500">
          {watchlist.items?.length || 0} stock{(watchlist.items?.length || 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add stock search */}
      <div className="relative mb-6 max-w-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Add a stock..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {debouncedQuery.length >= 2 && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                onClick={() => handleAddSymbol(r.symbol)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex justify-between"
              >
                <span>
                  <strong>{r.symbol}</strong> {r.name}
                </span>
                <span className="text-gray-400">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist table */}
      {watchlist.items && watchlist.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Symbol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Change</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Change %</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {watchlist.items.map((item) => {
                const quote = quoteMap.get(item.symbol);
                const isPositive = (quote?.change ?? 0) >= 0;
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/stocks/${item.symbol}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{quote?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {quote ? formatCurrency(quote.price) : '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${isPositive ? 'text-gain' : 'text-loss'}`}
                    >
                      {quote ? `${isPositive ? '+' : ''}${quote.change.toFixed(2)}` : '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${isPositive ? 'text-gain' : 'text-loss'}`}
                    >
                      {quote ? formatPercent(quote.changePercent) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          removeItem.mutate({ itemId: item.id, watchlistId: id })
                        }
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card>
          <p className="text-gray-500 text-center py-8">
            This watchlist is empty. Use the search above to add stocks.
          </p>
        </Card>
      )}
    </div>
  );
}
