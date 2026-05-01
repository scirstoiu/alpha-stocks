'use client';

import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  useNews,
  useWatchlists,
  usePortfolios,
  useAllTransactions,
  useStockQuotes,
  useApiClient,
  type NewsItem,
} from '@alpha-stocks/core';
import { useTitle } from '@/hooks/useTitle';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="flex">
        {item.imageUrl && (
          <div className="w-32 h-24 flex-shrink-0">
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="p-3 flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.headline}</h3>
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.summary}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{item.source}</span>
            <span>&middot;</span>
            <span>{timeAgo(item.publishedAt)}</span>
            {item.relatedSymbols && item.relatedSymbols.length > 0 && (
              <>
                <span>&middot;</span>
                <span className="text-primary">{item.relatedSymbols.join(', ')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

const TOP_N = 8;

export default function NewsPage() {
  useTitle('News');
  const [filter, setFilter] = useState('');

  const { data: watchlists } = useWatchlists();
  const { data: portfolios } = usePortfolios();
  const portfolioIds = useMemo(() => (portfolios || []).map((p) => p.id), [portfolios]);
  const txResults = useAllTransactions(portfolioIds);

  const allMySymbols = useMemo(() => {
    const s = new Set<string>();
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.add(i.symbol)));
    for (const result of txResults) {
      if (result.data) for (const t of result.data) s.add(t.symbol);
    }
    return [...s];
  }, [watchlists, txResults]);

  const { data: allQuotes } = useStockQuotes(allMySymbols);

  // Sort by aggregated portfolio value across all portfolios (highest weight first).
  // Watchlist-only symbols (zero shares) sink to the bottom but stay in the list.
  const symbolsByWeight = useMemo(() => {
    const holdings = new Map<string, number>();
    for (const result of txResults) {
      if (!result.data) continue;
      for (const tx of result.data) {
        const cur = holdings.get(tx.symbol) || 0;
        if (tx.type === 'buy') holdings.set(tx.symbol, cur + tx.shares);
        else if (tx.type === 'sell') holdings.set(tx.symbol, cur - tx.shares);
      }
    }
    const quoteMap = new Map((allQuotes || []).map((q) => [q.symbol, q]));
    return [...allMySymbols].sort((a, b) => {
      const va = (holdings.get(a) || 0) * (quoteMap.get(a)?.price || 0);
      const vb = (holdings.get(b) || 0) * (quoteMap.get(b)?.price || 0);
      return vb - va;
    });
  }, [allMySymbols, allQuotes, txResults]);

  const topSymbols = useMemo(() => symbolsByWeight.slice(0, TOP_N), [symbolsByWeight]);

  // Per-symbol news for the top holdings (used when no filter is active).
  const api = useApiClient();
  const newsResults = useQueries({
    queries: topSymbols.map((symbol) => ({
      queryKey: ['news', symbol],
      queryFn: () => api.getNews(symbol),
      staleTime: 300_000,
      enabled: !filter && !!symbol,
    })),
  });

  // When the filter is set, fall back to single-symbol fetch via the existing hook.
  const { data: filteredNews, isLoading: filteredLoading } = useNews(filter || undefined);

  const news = useMemo(() => {
    if (filter) return filteredNews || [];
    const seen = new Set<string>();
    const merged: NewsItem[] = [];
    for (const result of newsResults) {
      if (!result.data) continue;
      for (const item of result.data) {
        const key = item.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    }
    return merged.sort((a, b) => b.publishedAt - a.publishedAt);
  }, [filter, filteredNews, newsResults]);

  const isLoading = filter ? filteredLoading : newsResults.some((r) => r.isLoading);

  const heading = filter ? `News for ${filter}` : 'News for your stocks';
  const subheading = !filter && topSymbols.length > 0
    ? `Top ${topSymbols.length}: ${topSymbols.join(', ')}`
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          {subheading && <p className="text-xs text-gray-500 mt-1">{subheading}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value.toUpperCase())}
            placeholder="Filter by symbol..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {filter && (
            <button onClick={() => setFilter('')} className="text-sm text-gray-500 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isLoading && news.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">
            {filter
              ? `No news found for ${filter}.`
              : topSymbols.length === 0
                ? 'Add stocks to a watchlist or portfolio to see relevant news.'
                : 'No news available right now.'}
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
