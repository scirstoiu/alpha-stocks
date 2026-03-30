'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import StockLogo from '@/components/stocks/StockLogo';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import {
  useWatchlists,
  usePortfolios,
  useTransactions,
  useStockQuotes,
  useEarningsCalendar,
  useNews,
  formatCurrency,
  formatPercent,
  formatDate,
} from '@alpha-stocks/core';

// --- Market Indices ---

type MarketTab = 'us' | 'europe' | 'romania';

const INDICES: Record<MarketTab, { symbol: string; name: string }[]> = {
  us: [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^DJI', name: 'Dow Jones' },
    { symbol: '^IXIC', name: 'Nasdaq' },
    { symbol: '^RUT', name: 'Russell 2000' },
    { symbol: '^VIX', name: 'VIX' },
  ],
  europe: [
    { symbol: '^GDAXI', name: 'DAX' },
    { symbol: '^FTSE', name: 'FTSE 100' },
    { symbol: '^FCHI', name: 'CAC 40' },
    { symbol: '^STOXX50E', name: 'STOXX 50' },
    { symbol: '^IBEX', name: 'IBEX 35' },
  ],
  romania: [
    { symbol: 'BET.RO', name: 'BET' },
    { symbol: 'BETR.RO', name: 'BET-TR' },
    { symbol: 'SNP.RO', name: 'OMV Petrom' },
    { symbol: 'TLV.RO', name: 'Banca Transilvania' },
    { symbol: 'H2O.RO', name: 'Hidroelectrica' },
  ],
};

function MarketIndices() {
  const [tab, setTab] = useState<MarketTab>('us');
  const symbols = INDICES[tab].map((i) => i.symbol);
  const { data: quotes, isLoading } = useStockQuotes(symbols);

  const quoteMap = useMemo(() => {
    if (!quotes) return new Map();
    return new Map(quotes.map((q) => [q.symbol, q]));
  }, [quotes]);

  const tabs: { key: MarketTab; label: string }[] = [
    { key: 'us', label: 'US' },
    { key: 'europe', label: 'Europe' },
    { key: 'romania', label: 'Romania' },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Markets</span>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-medium px-2 py-0.5 rounded transition-colors ${
              tab === t.key
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-44 flex-shrink-0 rounded-lg" />
            ))
          : INDICES[tab].map((idx) => {
              const q = quoteMap.get(idx.symbol);
              const isPositive = (q?.change ?? 0) >= 0;
              return (
                <Link
                  key={idx.symbol}
                  href={`/stocks/${encodeURIComponent(idx.symbol)}`}
                  className="flex-shrink-0 w-44 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-1 py-0.5 rounded ${isPositive ? 'bg-green-50 text-gain' : 'bg-red-50 text-loss'}`}
                    >
                      {isPositive ? '↑' : '↓'}
                    </span>
                    <span className="font-semibold text-sm truncate">{idx.name}</span>
                    <span className={`text-xs ml-auto font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
                      {q ? formatPercent(q.changePercent) : '—'}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{q ? q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
                  <div className={`text-xs ${isPositive ? 'text-gain' : 'text-loss'}`}>
                    {q ? `${isPositive ? '+' : ''}${q.change.toFixed(2)}` : ''}
                  </div>
                </Link>
              );
            })}
      </div>
    </div>
  );
}

// --- Watchlist Top Movers ---

function WatchlistHighlights() {
  const { data: watchlists, isLoading } = useWatchlists();

  const allSymbols = useMemo(() => {
    const symbols: string[] = [];
    watchlists?.forEach((wl) => wl.items?.forEach((i) => symbols.push(i.symbol)));
    return [...new Set(symbols)].slice(0, 20);
  }, [watchlists]);

  const { data: quotes } = useStockQuotes(allSymbols);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!watchlists?.length || allSymbols.length === 0) {
    return (
      <Card>
        <p className="text-gray-500 text-sm">
          No stocks in watchlists. <Link href="/watchlists" className="text-primary hover:underline">Add some</Link>
        </p>
      </Card>
    );
  }

  const sorted = [...(quotes || [])].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const topMovers = sorted.slice(0, 6);

  return (
    <Card className="overflow-hidden p-0">
      <h3 className="px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50">Top Movers</h3>
      <div className="divide-y divide-gray-100">
        {topMovers.map((q) => (
          <Link key={q.symbol} href={`/stocks/${q.symbol}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <StockLogo symbol={q.symbol} size={24} />
              <span className="font-medium text-sm">{q.symbol}</span>
              <span className="text-xs text-gray-500">{q.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{formatCurrency(q.price)}</span>
              <span className={`text-xs ml-2 ${q.change >= 0 ? 'text-gain' : 'text-loss'}`}>
                {formatPercent(q.changePercent)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// --- Upcoming Earnings ---

function UpcomingEarnings() {
  const from = new Date().toISOString().split('T')[0];
  const to = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const { data: earnings, isLoading } = useEarningsCalendar(from, to);
  const { data: watchlists } = useWatchlists();

  const mySymbols = useMemo(() => {
    const s = new Set<string>();
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.add(i.symbol)));
    return s;
  }, [watchlists]);

  const myEarnings = useMemo(() => {
    if (!earnings) return [];
    return earnings.filter((e) => mySymbols.has(e.symbol)).slice(0, 5);
  }, [earnings, mySymbols]);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (myEarnings.length === 0) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Upcoming Earnings</h3>
        <p className="text-gray-400 text-sm">No earnings this week for your watchlist stocks.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <h3 className="px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50">Upcoming Earnings</h3>
      <div className="divide-y divide-gray-100">
        {myEarnings.map((e, i) => (
          <Link key={`${e.symbol}-${i}`} href={`/stocks/${e.symbol}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
            <span className="font-medium text-sm">{e.symbol}</span>
            <span className="text-xs text-gray-500">{formatDate(e.date)}</span>
          </Link>
        ))}
      </div>
      <Link href="/earnings" className="block px-4 py-2 text-xs text-primary hover:underline border-t border-gray-100">
        View full calendar &rarr;
      </Link>
    </Card>
  );
}

// --- My News (from watchlist + portfolio symbols) ---

function MyNews() {
  const { data: watchlists } = useWatchlists();
  const { data: portfolios } = usePortfolios();

  // Collect first portfolio's symbols
  const firstPortfolioId = portfolios?.[0]?.id || '';
  const { data: transactions } = useTransactions(firstPortfolioId);

  const mySymbols = useMemo(() => {
    const s = new Set<string>();
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.add(i.symbol)));
    transactions?.forEach((t) => s.add(t.symbol));
    return [...s];
  }, [watchlists, transactions]);

  // Fetch news for the first symbol that has coverage (Finnhub returns company news per symbol)
  const newsSymbol = mySymbols[0];
  const { data: news, isLoading } = useNews(newsSymbol);

  // Also get general news as fallback
  const { data: generalNews } = useNews();

  // Merge: prefer symbol-specific, pad with general, dedup by id
  const items = useMemo(() => {
    const seen = new Set<string>();
    const merged = [];
    for (const n of [...(news || []), ...(generalNews || [])]) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      merged.push(n);
    }
    return merged.slice(0, 8);
  }, [news, generalNews]);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (items.length === 0) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-gray-500 mb-2">News</h3>
        <p className="text-gray-400 text-sm">No news available.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <h3 className="px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50">
        News
        {newsSymbol && <span className="text-gray-400 ml-1">for your stocks</span>}
      </h3>
      <div className="divide-y divide-gray-100">
        {items.map((n) => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 hover:bg-gray-50">
            <p className="text-sm font-medium line-clamp-1">{n.headline}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">{n.source}</span>
              {n.relatedSymbols?.slice(0, 3).map((s) => (
                <span key={s} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-medium">{s}</span>
              ))}
              <span className="text-xs text-gray-400 ml-auto">{timeAgo(n.publishedAt)}</span>
            </div>
          </a>
        ))}
      </div>
      <Link href="/news" className="block px-4 py-2 text-xs text-primary hover:underline border-t border-gray-100">
        View all news &rarr;
      </Link>
    </Card>
  );
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// --- Dashboard ---

export default function Dashboard() {
  return (
    <div>
      <MarketIndices />

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Watchlist</h2>
          <WatchlistHighlights />
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Earnings</h2>
          <UpcomingEarnings />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">News</h2>
        <MyNews />
      </div>
    </div>
  );
}
