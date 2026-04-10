'use client';

import { useMemo, useState } from 'react';
import { useTitle } from '@/hooks/useTitle';
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

type MarketTab = 'us' | 'europe' | 'asia' | 'currencies';

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
  asia: [
    { symbol: '^N225', name: 'Nikkei 225' },
    { symbol: '^HSI', name: 'Hang Seng' },
    { symbol: '000001.SS', name: 'Shanghai' },
    { symbol: '^KS11', name: 'KOSPI' },
    { symbol: '^STI', name: 'Straits Times' },
  ],
  currencies: [
    { symbol: 'EURUSD=X', name: 'EUR / USD' },
    { symbol: 'EURRON=X', name: 'EUR / RON' },
    { symbol: 'GBPUSD=X', name: 'GBP / USD' },
    { symbol: 'JPY=X', name: 'USD / JPY' },
    { symbol: 'CAD=X', name: 'USD / CAD' },
  ],
};

function MarketIndices() {
  const [tab, setTab] = useState<MarketTab>('us');
  const symbols = INDICES[tab].map((i) => i.symbol);
  const { data: quotes, isLoading, isError } = useStockQuotes(symbols);

  const quoteMap = useMemo(() => {
    if (!quotes) return new Map();
    return new Map(quotes.map((q) => [q.symbol, q]));
  }, [quotes]);

  const tabs: { key: MarketTab; label: string }[] = [
    { key: 'us', label: 'US' },
    { key: 'europe', label: 'Europe' },
    { key: 'asia', label: 'Asia' },
    { key: 'currencies', label: 'Currencies' },
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
          : isError
            ? <p className="text-sm text-gray-400 py-4">Unable to load market data.</p>
          : INDICES[tab].map((idx) => {
              const q = quoteMap.get(idx.symbol);
              const isPositive = (q?.change ?? 0) >= 0;
              return (
                <Link
                  key={idx.symbol}
                  href={`/stocks/${encodeURIComponent(idx.symbol)}`}
                  target="_blank"
                  className="flex-shrink-0 border border-gray-200 rounded-lg px-3 py-2.5 hover:shadow-md transition-shadow bg-white flex items-center gap-3"
                >
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-base flex-shrink-0 ${isPositive ? 'bg-green-50 text-gain' : 'bg-red-50 text-loss'}`}>
                    {isPositive ? '↑' : '↓'}
                  </span>
                  <div className="flex gap-4">
                    <div>
                      <div className="text-sm font-semibold">{idx.name}</div>
                      <div className="text-sm text-gray-500">
                        {q ? q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
                        {q ? formatPercent(q.changePercent) : '—'}
                      </div>
                      <div className={`text-sm ${isPositive ? 'text-gain' : 'text-loss'}`}>
                        {q ? `${isPositive ? '+' : ''}${q.change.toFixed(2)}` : ''}
                      </div>
                    </div>
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

  const gainers = [...(quotes || [])].filter((q) => q.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 6);
  const losers = [...(quotes || [])].filter((q) => q.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 6);

  const MoverRow = ({ q }: { q: typeof gainers[0] }) => (
    <Link href={`/stocks/${q.symbol}`} target="_blank" className="flex items-center justify-between py-2 hover:bg-gray-50 px-3">
      <div className="flex items-center gap-2 min-w-0">
        <StockLogo symbol={q.symbol} size={24} />
        <span className="font-semibold text-sm truncate">{q.symbol}</span>
      </div>
      <span className={`text-sm font-semibold flex-shrink-0 ${q.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
        {formatPercent(q.changePercent)}
      </span>
    </Link>
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <div>
          <h3 className="px-3 py-2 text-sm font-semibold text-gain border-b border-gray-200 bg-gray-50">Gainers</h3>
          <div className="divide-y divide-gray-50">
            {gainers.map((q) => <MoverRow key={q.symbol} q={q} />)}
            {gainers.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">No gainers today</p>}
          </div>
        </div>
        <div>
          <h3 className="px-3 py-2 text-sm font-semibold text-loss border-b border-gray-200 bg-gray-50">Losers</h3>
          <div className="divide-y divide-gray-50">
            {losers.map((q) => <MoverRow key={q.symbol} q={q} />)}
            {losers.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">No losers today</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- Upcoming Earnings ---

function UpcomingEarnings() {
  const from = new Date().toISOString().split('T')[0];
  const to = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const { data: earnings, isLoading } = useEarningsCalendar(from, to);
  const { data: watchlists } = useWatchlists();

  const mySymbols = useMemo(() => {
    const s = new Set<string>();
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.add(i.symbol)));
    return s;
  }, [watchlists]);

  const myEarnings = useMemo(() => {
    if (!earnings) return [];
    return earnings.filter((e) => mySymbols.has(e.symbol)).slice(0, 10);
  }, [earnings, mySymbols]);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (myEarnings.length === 0) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Upcoming Earnings</h3>
        <p className="text-gray-400 text-sm">No earnings this month for your watchlist stocks.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <h3 className="px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50">Upcoming Earnings</h3>
      <div className="divide-y divide-gray-100">
        {myEarnings.map((e, i) => (
          <Link key={`${e.symbol}-${i}`} href={`/stocks/${e.symbol}`} target="_blank" className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
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

// --- My News (general market + portfolio/watchlist related) ---

function MyNews() {
  const { data: watchlists } = useWatchlists();
  const { data: portfolios } = usePortfolios();

  const firstPortfolioId = portfolios?.[0]?.id || '';
  const { data: transactions } = useTransactions(firstPortfolioId);

  // Collect all symbols from watchlists + portfolio
  const allMySymbols = useMemo(() => {
    const s = new Set<string>();
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.add(i.symbol)));
    transactions?.forEach((t) => s.add(t.symbol));
    return [...s];
  }, [watchlists, transactions]);

  // Get quotes to sort by portfolio value/weight
  const { data: allQuotes } = useStockQuotes(allMySymbols);

  // Sort symbols by portfolio value (shares * price), highest first
  const symbolsByWeight = useMemo(() => {
    if (!allQuotes || !transactions) return allMySymbols.slice(0, 3);
    const holdings = new Map<string, number>();
    for (const tx of transactions) {
      const cur = holdings.get(tx.symbol) || 0;
      if (tx.type === 'buy') holdings.set(tx.symbol, cur + tx.shares);
      else if (tx.type === 'sell') holdings.set(tx.symbol, cur - tx.shares);
    }
    const quoteMap = new Map(allQuotes.map((q) => [q.symbol, q]));
    return [...allMySymbols].sort((a, b) => {
      const va = (holdings.get(a) || 0) * (quoteMap.get(a)?.price || 0);
      const vb = (holdings.get(b) || 0) * (quoteMap.get(b)?.price || 0);
      return vb - va;
    }).slice(0, 3);
  }, [allMySymbols, allQuotes, transactions]);

  // Fetch news for top 3 symbols by weight
  const { data: news1, isLoading } = useNews(symbolsByWeight[0]);
  const { data: news2 } = useNews(symbolsByWeight[1]);
  const { data: news3 } = useNews(symbolsByWeight[2]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    const merged = [];
    for (const n of [...(news1 || []), ...(news2 || []), ...(news3 || [])]) {
      const key = n.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n);
    }
    return merged.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 15);
  }, [news1, news2, news3]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (items.length === 0) {
    return (
      <Card>
        <p className="text-gray-400 text-sm py-4">No news for your stocks.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0 h-full flex flex-col">
      <h3 className="px-4 py-2.5 text-sm font-medium text-gray-500 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        News for your stocks
      </h3>
      <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
        {items.map((n) => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug line-clamp-2">{n.headline}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-medium text-primary">{n.source}</span>
                <span className="text-xs text-gray-300">&middot;</span>
                <span className="text-xs text-gray-400">{timeAgo(n.publishedAt)}</span>
                {n.relatedSymbols && n.relatedSymbols.length > 0 && (
                  <>
                    <span className="text-xs text-gray-300">&middot;</span>
                    {n.relatedSymbols.slice(0, 3).map((s) => (
                      <span key={s} className="text-xs text-gray-400">{s}</span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
      <Link href="/news" className="block px-4 py-2 text-xs text-primary hover:underline border-t border-gray-100 flex-shrink-0">
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
  useTitle('Home');
  return (
    <div>
      <MarketIndices />

      <div className="grid gap-6 md:grid-cols-2 items-start mb-6">
        <div className="md:self-stretch flex flex-col">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">News</h2>
          <MyNews />
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Watchlist</h2>
            <WatchlistHighlights />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Earnings</h2>
            <UpcomingEarnings />
          </div>
        </div>
      </div>
    </div>
  );
}
