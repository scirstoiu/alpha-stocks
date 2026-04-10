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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          {/* Col 1: Ranges + Open/Prev Close */}
          <div className="space-y-3">
            {quote.low > 0 && quote.high > 0 && (
              <RangeBar low={quote.low} high={quote.high} current={quote.price} label="Day's Range" />
            )}
            {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
              <RangeBar low={quote.fiftyTwoWeekLow} high={quote.fiftyTwoWeekHigh} current={quote.price} label="52 Week Range" />
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-gray-500">Open</span>
                <p className="font-medium">{fmt(quote.open)}</p>
              </div>
              <div>
                <span className="text-gray-500">Prev Close</span>
                <p className="font-medium">{fmt(quote.previousClose)}</p>
              </div>
            </div>
          </div>

          {/* Col 2: Analyst + Target + Valuation */}
          <div className="space-y-3">
            {quote.targetMeanPrice != null && (
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {quote.recommendationKey && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${REC_COLORS[quote.recommendationKey] || 'text-gray-600 bg-gray-100'}`}>
                      {REC_LABELS[quote.recommendationKey] || quote.recommendationKey}
                    </span>
                  )}
                  {(() => {
                    const upside = quote.targetMeanPrice && quote.price > 0
                      ? ((quote.targetMeanPrice - quote.price) / quote.price) * 100
                      : null;
                    if (upside == null) return null;
                    return (
                      <span className={`text-xs font-semibold ${upside >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
                      </span>
                    );
                  })()}
                  {quote.numberOfAnalystOpinions != null && (
                    <span className="text-xs text-gray-400">{quote.numberOfAnalystOpinions} analysts</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Target </span>
                  <span className="font-bold">{formatCurrency(quote.targetMeanPrice)}</span>
                </div>
                {quote.targetLowPrice != null && quote.targetHighPrice != null && (
                  <div className="text-xs text-gray-400">{formatCurrency(quote.targetLowPrice)} – {formatCurrency(quote.targetHighPrice)}</div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {quote.trailingPE != null && (
                <div>
                  <span className="text-gray-500">P/E Ratio</span>
                  <p className="font-medium">{quote.trailingPE.toFixed(2)}</p>
                </div>
              )}
              {quote.forwardPE != null && (
                <div>
                  <span className="text-gray-500">Forward P/E</span>
                  <p className="font-medium">{quote.forwardPE.toFixed(2)}</p>
                </div>
              )}
              {quote.earningsTimestamp != null && (
                <div>
                  <span className="text-gray-500">Next Earnings</span>
                  <p className="font-medium">{new Date(quote.earningsTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              )}
              {quote.priceToBook != null && (
                <div>
                  <span className="text-gray-500">Price/Book</span>
                  <p className="font-medium">{quote.priceToBook.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Trading + Info */}
          <div className="grid grid-cols-2 gap-3 content-start">
            {quote.marketCap != null && (
              <div>
                <span className="text-gray-500">Market Cap</span>
                <p className="font-medium">{formatCompactNumber(quote.marketCap)}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Volume</span>
              <p className="font-medium">{formatCompactNumber(quote.volume)}</p>
            </div>
            {quote.averageDailyVolume3Month != null && (
              <div>
                <span className="text-gray-500">Avg Volume</span>
                <p className="font-medium">{formatCompactNumber(quote.averageDailyVolume3Month)}</p>
              </div>
            )}
            {quote.epsTrailingTwelveMonths != null && (
              <div>
                <span className="text-gray-500">EPS (TTM)</span>
                <p className="font-medium">{quote.epsTrailingTwelveMonths.toFixed(2)}</p>
              </div>
            )}
            {quote.beta != null && (
              <div>
                <span className="text-gray-500">Beta</span>
                <p className="font-medium">{quote.beta.toFixed(2)}</p>
              </div>
            )}
            {quote.dividendYield != null && quote.dividendYield > 0 && (
              <div>
                <span className="text-gray-500">Dividend Yield</span>
                <p className="font-medium">{(quote.dividendYield * 100).toFixed(2)}%</p>
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
      )}
    </Card>
  );
}
