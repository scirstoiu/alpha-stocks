import { NextRequest, NextResponse } from 'next/server';
import { createMarketDataProvider, getYahooNews } from '@alpha-stocks/core/providers';
import type { NewsItem } from '@alpha-stocks/core';

// Server-side cache: key -> { data, timestamp }
const newsCache = new Map<string, { data: NewsItem[]; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key: string): NewsItem[] | null {
  const entry = newsCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: NewsItem[]) {
  newsCache.set(key, { data, ts: Date.now() });
}

export function clearNewsCache() {
  newsCache.clear();
}

// Deduplicate by headline similarity (lowercase, stripped)
function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const seen = new Map<string, NewsItem>();
  for (const item of items) {
    const key = item.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  const symbol = request.nextUrl.searchParams.get('symbol');
  const cacheKey = symbol ? `company:${symbol.toUpperCase()}` : 'general';

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    if (symbol) {
      const upper = symbol.toUpperCase();
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

      // Fetch from both sources in parallel
      const [finnhubNews, yahooNews] = await Promise.allSettled([
        apiKey
          ? createMarketDataProvider(apiKey).getCompanyNews(upper, from, to)
          : Promise.resolve([]),
        getYahooNews(upper),
      ]);

      const all = [
        ...(finnhubNews.status === 'fulfilled' ? finnhubNews.value : []),
        ...(yahooNews.status === 'fulfilled' ? yahooNews.value : []),
      ];

      const merged = deduplicateNews(all).sort((a, b) => b.publishedAt - a.publishedAt);
      setCache(cacheKey, merged);
      return NextResponse.json(merged);
    }

    // General news — Finnhub only (Yahoo search needs a query)
    if (!apiKey) {
      return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 500 });
    }

    const provider = createMarketDataProvider(apiKey);
    const news = await provider.getGeneralNews();
    setCache(cacheKey, news);
    return NextResponse.json(news);
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
