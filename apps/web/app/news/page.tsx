'use client';

import { useState } from 'react';
import { useNews, type NewsItem } from '@alpha-stocks/core';
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

export default function NewsPage() {
  useTitle('News');
  const [filter, setFilter] = useState('');
  const { data: news, isLoading } = useNews(filter || undefined);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Market News</h1>
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

      {!isLoading && (!news || news.length === 0) && (
        <Card>
          <p className="text-gray-500 text-center py-8">
            {filter ? `No news found for ${filter}.` : 'No news available. Make sure your Finnhub API key is configured.'}
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {news?.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
