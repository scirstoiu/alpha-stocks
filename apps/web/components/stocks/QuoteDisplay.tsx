'use client';

import { useStockQuote, formatCurrency, formatPercent, formatCompactNumber } from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

function RangeBar({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const pct = high > low ? ((current - low) / (high - low)) * 100 : 50;
  const isForex = false; // caller handles formatting
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold w-20 text-right">{low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <div className="flex-1 relative h-1.5 bg-gray-200 rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-500 rounded-full border-2 border-white shadow"
            style={{ left: `${Math.min(Math.max(pct, 0), 100)}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <span className="text-sm font-semibold w-20">{high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

export default function QuoteDisplay({ symbol, compact, detailsOnly }: { symbol: string; compact?: boolean; detailsOnly?: boolean }) {
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
      {!detailsOnly && (
        <>
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-2xl font-bold">{quote.name || quote.symbol}</h2>
            <span className="text-sm text-gray-500">{quote.symbol}</span>
          </div>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-3xl font-semibold">{fmt(quote.price)}</span>
            <span className={`text-lg font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
              {isPositive ? '+' : ''}
              {quote.change.toFixed(decimals)} ({formatPercent(quote.changePercent)})
            </span>
          </div>
          {(quote.postMarketPrice ?? quote.preMarketPrice) != null && (() => {
            const isPost = quote.postMarketPrice != null;
            const extPrice = (isPost ? quote.postMarketPrice : quote.preMarketPrice)!;
            const extChange = (isPost ? quote.postMarketChange : quote.preMarketChange) ?? 0;
            const extPercent = (isPost ? quote.postMarketChangePercent : quote.preMarketChangePercent) ?? 0;
            const extPositive = extChange >= 0;
            return (
              <div className="flex items-baseline gap-2 mb-4 text-sm">
                <span className="text-gray-400">{isPost ? 'After Hours' : 'Pre-Market'}</span>
                <span className="font-medium">{fmt(extPrice)}</span>
                <span className={extPositive ? 'text-gain' : 'text-loss'}>
                  {extPositive ? '+' : ''}{extChange.toFixed(decimals)} ({formatPercent(extPercent)})
                </span>
              </div>
            );
          })()}
        </>
      )}
      {!detailsOnly && (quote.postMarketPrice ?? quote.preMarketPrice) == null && !compact && <div className="mb-3" />}
      {!compact && (
        <div className="space-y-5">
          {/* Ranges (left) + Key Metrics (right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left: Ranges + basic stats */}
            <div className="space-y-4">
              {quote.low > 0 && quote.high > 0 && (
                <RangeBar low={quote.low} high={quote.high} current={quote.price} label="Day's Range" />
              )}
              {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
                <RangeBar low={quote.fiftyTwoWeekLow} high={quote.fiftyTwoWeekHigh} current={quote.price} label="52 Week Range" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div>
                  <span className="text-gray-500">Open</span>
                  <p className="font-medium">{fmt(quote.open)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Prev Close</span>
                  <p className="font-medium">{fmt(quote.previousClose)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Volume</span>
                  <p className="font-medium">{formatCompactNumber(quote.volume)}</p>
                </div>
                {quote.marketCap != null && (
                  <div>
                    <span className="text-gray-500">Market Cap</span>
                    <p className="font-medium">{formatCompactNumber(quote.marketCap)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Valuation + info metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm content-start">
              {quote.epsTrailingTwelveMonths != null && (
                <div>
                  <span className="text-gray-500">EPS (TTM)</span>
                  <p className="font-medium">{quote.epsTrailingTwelveMonths.toFixed(2)}</p>
                </div>
              )}
              {quote.trailingPE != null && (
                <div>
                  <span className="text-gray-500">P/E Ratio</span>
                  <p className="font-medium">{quote.trailingPE.toFixed(2)}</p>
                </div>
              )}
              {quote.priceToBook != null && (
                <div>
                  <span className="text-gray-500">Price/Book</span>
                  <p className="font-medium">{quote.priceToBook.toFixed(2)}</p>
                </div>
              )}
              {quote.earningsTimestamp != null && (
                <div>
                  <span className="text-gray-500">Next Earnings</span>
                  <p className="font-medium">{new Date(quote.earningsTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              )}
              {quote.fullTimeEmployees != null && (
                <div>
                  <span className="text-gray-500">Employees</span>
                  <p className="font-medium">{quote.fullTimeEmployees.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
