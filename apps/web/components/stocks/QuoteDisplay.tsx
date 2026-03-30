'use client';

import { useStockQuote, formatCurrency, formatPercent, formatCompactNumber } from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

export default function QuoteDisplay({ symbol }: { symbol: string }) {
  const { data: quote, isLoading, error } = useStockQuote(symbol);

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    );
  }

  if (error || !quote) {
    return (
      <Card>
        <p className="text-red-500 text-sm">Failed to load quote for {symbol}</p>
      </Card>
    );
  }

  const isPositive = quote.change >= 0;
  const isForex = symbol.includes('=X') || symbol.includes('=x');
  const decimals = isForex || quote.price < 10 ? 4 : 2;
  const fmt = (v: number) => isForex ? v.toFixed(decimals) : formatCurrency(v);

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-2xl font-bold">{quote.name || quote.symbol}</h2>
        <span className="text-sm text-gray-500">{quote.symbol}</span>
      </div>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-semibold">{fmt(quote.price)}</span>
        <span className={`text-lg font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
          {isPositive ? '+' : ''}
          {quote.change.toFixed(decimals)} ({formatPercent(quote.changePercent)})
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Open</span>
          <p className="font-medium">{fmt(quote.open)}</p>
        </div>
        <div>
          <span className="text-gray-500">High</span>
          <p className="font-medium">{fmt(quote.high)}</p>
        </div>
        <div>
          <span className="text-gray-500">Low</span>
          <p className="font-medium">{fmt(quote.low)}</p>
        </div>
        <div>
          <span className="text-gray-500">Volume</span>
          <p className="font-medium">{formatCompactNumber(quote.volume)}</p>
        </div>
        <div>
          <span className="text-gray-500">Prev Close</span>
          <p className="font-medium">{fmt(quote.previousClose)}</p>
        </div>
        {quote.marketCap && (
          <div>
            <span className="text-gray-500">Market Cap</span>
            <p className="font-medium">{formatCompactNumber(quote.marketCap)}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
