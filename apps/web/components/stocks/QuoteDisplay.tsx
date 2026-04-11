'use client';

import { useStockQuote, formatCurrency, formatPercent, formatCompactNumber } from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

function RangeBar({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const pct = high > low ? ((current - low) / (high - low)) * 100 : 50;
  return (
    <div>
      <div className="text-[11px] text-gray-400 mb-0.5">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium w-16 tabular-nums">{low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <div className="flex-1 relative h-1 bg-gray-200 rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-500 rounded-full border border-white shadow-sm"
            style={{ left: `${Math.min(Math.max(pct, 0), 100)}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        <span className="text-xs font-medium w-16 tabular-nums">{high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

const REC_COLORS: Record<string, string> = {
  'strong_buy': 'text-green-700 bg-green-50',
  'buy': 'text-green-600 bg-green-50',
  'hold': 'text-yellow-700 bg-yellow-50',
  'underperform': 'text-orange-600 bg-orange-50',
  'sell': 'text-red-600 bg-red-50',
};

const REC_LABELS: Record<string, string> = {
  'strong_buy': 'Strong Buy',
  'buy': 'Buy',
  'hold': 'Hold',
  'underperform': 'Underperform',
  'sell': 'Sell',
};

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
        <div className="flex justify-between gap-6">
          {/* Left: Price info */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-2xl font-bold">{quote.name || quote.symbol}</h2>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-semibold">{fmt(quote.price)}</span>
              <span className={`text-lg font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
                {isPositive ? '+' : ''}
                {quote.change.toFixed(decimals)} ({formatPercent(quote.changePercent)})
              </span>
              <span className="text-sm text-gray-400">{quote.symbol}</span>
            </div>
            {(quote.postMarketPrice ?? quote.preMarketPrice) != null && (() => {
              const isPost = quote.postMarketPrice != null;
              const extPrice = (isPost ? quote.postMarketPrice : quote.preMarketPrice)!;
              const extChange = (isPost ? quote.postMarketChange : quote.preMarketChange) ?? 0;
              const extPercent = (isPost ? quote.postMarketChangePercent : quote.preMarketChangePercent) ?? 0;
              const extPositive = extChange >= 0;
              return (
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="text-gray-400">{isPost ? 'After Hours' : 'Pre-Market'}</span>
                  <span className="font-medium">{fmt(extPrice)}</span>
                  <span className={extPositive ? 'text-gain' : 'text-loss'}>
                    {extPositive ? '+' : ''}{extChange.toFixed(decimals)} ({formatPercent(extPercent)})
                  </span>
                </div>
              );
            })()}
          </div>
          {/* Right: Ranges */}
          {!isForex && (
            <div className="hidden sm:flex flex-col justify-center gap-2 min-w-[250px]">
              {quote.low > 0 && quote.high > 0 && (
                <RangeBar low={quote.low} high={quote.high} current={quote.price} label="Day's Range" />
              )}
              {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
                <RangeBar low={quote.fiftyTwoWeekLow} high={quote.fiftyTwoWeekHigh} current={quote.price} label="52 Week Range" />
              )}
            </div>
          )}
        </div>
      )}
      {!compact && (() => {
        const metrics: { label: string; value: string }[] = [
          { label: 'Open', value: fmt(quote.open) },
          { label: 'Prev Close', value: fmt(quote.previousClose) },
          ...(quote.marketCap != null ? [{ label: 'Market Cap', value: formatCompactNumber(quote.marketCap) }] : []),
          { label: 'Volume', value: formatCompactNumber(quote.volume) },
          ...(quote.averageDailyVolume3Month != null ? [{ label: 'Avg Volume', value: formatCompactNumber(quote.averageDailyVolume3Month) }] : []),
          ...(quote.epsTrailingTwelveMonths != null ? [{ label: 'EPS (TTM)', value: quote.epsTrailingTwelveMonths.toFixed(2) }] : []),
          ...(quote.trailingPE != null ? [{ label: 'P/E Ratio', value: quote.trailingPE.toFixed(2) }] : []),
          ...(quote.forwardPE != null ? [{ label: 'Forward P/E', value: quote.forwardPE.toFixed(2) }] : []),
          ...(quote.priceToBook != null ? [{ label: 'Price/Book', value: quote.priceToBook.toFixed(2) }] : []),
          ...(quote.beta != null ? [{ label: 'Beta', value: quote.beta.toFixed(2) }] : []),
          ...(quote.dividendYield != null && quote.dividendYield > 0 ? [{ label: 'Dividend Yield', value: `${(quote.dividendYield * 100).toFixed(2)}%` }] : []),
          ...(quote.earningsTimestamp != null ? [{ label: 'Next Earnings', value: new Date(quote.earningsTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }] : []),
          ...(quote.fullTimeEmployees != null ? [{ label: 'Employees', value: quote.fullTimeEmployees.toLocaleString() }] : []),
        ];

        return (
          <div className="space-y-4">
            {/* Analyst recommendation + target */}
            {quote.targetMeanPrice != null && (
              <div className="flex items-center gap-3 flex-wrap">
                {quote.recommendationKey && (
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${REC_COLORS[quote.recommendationKey] || 'text-gray-600 bg-gray-100'}`}>
                    {REC_LABELS[quote.recommendationKey] || quote.recommendationKey}
                  </span>
                )}
                <div className="text-sm">
                  <span className="text-gray-500">Target </span>
                  <span className="font-bold text-base">{formatCurrency(quote.targetMeanPrice)}</span>
                  {quote.targetLowPrice != null && quote.targetHighPrice != null && (
                    <span className="text-gray-400 text-xs ml-1.5">({formatCurrency(quote.targetLowPrice)} – {formatCurrency(quote.targetHighPrice)})</span>
                  )}
                </div>
                {quote.numberOfAnalystOpinions != null && (
                  <span className="text-xs text-gray-400">{quote.numberOfAnalystOpinions} analysts</span>
                )}
                {(() => {
                  const upside = quote.targetMeanPrice && quote.price > 0
                    ? ((quote.targetMeanPrice - quote.price) / quote.price) * 100
                    : null;
                  if (upside == null) return null;
                  return (
                    <span className={`text-xs font-semibold ${upside >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% upside
                    </span>
                  );
                })()}
              </div>
            )}

            {/* 4-column metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              {metrics.map((m) => (
                <div key={m.label}>
                  <span className="text-gray-500">{m.label}</span>
                  <p className="font-medium">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </Card>
  );
}
