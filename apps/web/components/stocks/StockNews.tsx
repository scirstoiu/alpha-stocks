'use client';

import { useNews, type NewsItem } from '@alpha-stocks/core';
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
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">{item.source}</span>
        <span className="text-xs text-gray-400">{timeAgo(item.publishedAt)}</span>
      </div>
      <h3 className="font-semibold text-base leading-snug mb-1.5">{item.headline}</h3>
      {item.summary && (
        <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{item.summary}</p>
      )}
      {item.relatedSymbols && item.relatedSymbols.length > 0 && (
        <div className="flex gap-1.5 mt-2">
          {item.relatedSymbols.slice(0, 5).map((s) => (
            <span key={s} className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s}</span>
          ))}
        </div>
      )}
    </a>
  );
}

export default function StockNews({ symbol }: { symbol: string }) {
  const { data: news, isLoading } = useNews(symbol);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8 text-sm">
        No news found for {symbol}.
      </p>
    );
  }

  const sorted = [...news].sort((a, b) => b.publishedAt - a.publishedAt);

  return (
    <div className="space-y-3">
      {sorted.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
