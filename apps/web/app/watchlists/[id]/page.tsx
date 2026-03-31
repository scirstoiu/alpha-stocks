'use client';

import { use, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useWatchlist,
  useAddWatchlistItem,
  useRemoveWatchlistItem,
  useReorderWatchlistItems,
  useCreateWatchlist,
  useStockQuotes,
  useStockSearch,
  useEarningsCalendar,
  useNews,
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  formatDate,
  type WatchlistItem,
} from '@alpha-stocks/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import StockLogo from '@/components/stocks/StockLogo';

type Tab = 'overview' | 'earnings' | 'news';

function SortableRow({
  item,
  quote,
  onRemove,
}: {
  item: WatchlistItem;
  quote?: { name: string; price: number; change: number; changePercent: number; volume: number; preMarketChangePercent?: number; postMarketChangePercent?: number };
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isPositive = (quote?.change ?? 0) >= 0;

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="pl-2 pr-0 py-2 w-6">
        <button
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
          {...attributes}
          {...listeners}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/stocks/${item.symbol}`}
          className="inline-flex items-center gap-3 group"
        >
          <StockLogo symbol={item.symbol} size={32} />
          <span className="font-bold text-xs bg-gray-100 group-hover:bg-blue-100 group-hover:text-blue-700 px-2 py-1 rounded transition-colors tracking-wide">{item.symbol}</span>
          <span className="text-sm text-gray-600">{quote?.name || ''}</span>
        </Link>
      </td>
      <td className="px-3 py-2 text-right text-sm">
        {quote ? (() => {
          const extPercent = quote.postMarketChangePercent ?? quote.preMarketChangePercent;
          if (extPercent == null) return <span className="text-gray-300">—</span>;
          const extPositive = extPercent >= 0;
          return <span className={extPositive ? 'text-gain' : 'text-loss'}>{formatPercent(extPercent)}</span>;
        })() : '—'}
      </td>
      <td className="px-3 py-2 text-right text-sm">
        {quote ? (
          <span>{quote.price.toFixed(2)} <span className="text-[10px] text-gray-400">USD</span></span>
        ) : '—'}
      </td>
      <td className={`px-3 py-2 text-right text-sm ${isPositive ? 'text-gain' : 'text-loss'}`}>
        {quote ? formatPercent(quote.changePercent) : '—'}
      </td>
      <td className={`px-3 py-2 text-right text-sm ${isPositive ? 'text-gain' : 'text-loss'}`}>
        {quote ? (
          <span>{(isPositive ? '+' : '') + quote.change.toFixed(2)} <span className="text-[10px]">USD</span></span>
        ) : '—'}
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-500">
        {quote?.volume ? formatCompactNumber(quote.volume) : '—'}
      </td>
      <td className="px-3 py-2 text-right">
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-xs">
          &times;
        </button>
      </td>
    </tr>
  );
}

function EarningsTab({ symbols }: { symbols: string[] }) {
  const from = new Date().toISOString().split('T')[0];
  const to = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const { data: earnings, isLoading } = useEarningsCalendar(from, to);

  const symbolSet = useMemo(() => new Set(symbols), [symbols]);
  const filtered = useMemo(
    () => (earnings || []).filter((e) => symbolSet.has(e.symbol)),
    [earnings, symbolSet],
  );

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (filtered.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">No upcoming earnings for stocks in this watchlist.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left px-3 py-2 font-medium text-gray-400 text-xs">Symbol</th>
          <th className="text-left px-3 py-2 font-medium text-gray-400 text-xs">Date</th>
          <th className="text-left px-3 py-2 font-medium text-gray-400 text-xs">Time</th>
          <th className="text-right px-3 py-2 font-medium text-gray-400 text-xs">EPS Est.</th>
          <th className="text-right px-3 py-2 font-medium text-gray-400 text-xs">Revenue Est.</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((e, i) => (
          <tr key={`${e.symbol}-${i}`} className="border-b border-gray-100">
            <td className="px-3 py-2 font-medium">
              <Link href={`/stocks/${e.symbol}`} className="text-primary hover:underline inline-flex items-center gap-2">
                <StockLogo symbol={e.symbol} size={20} />
                {e.symbol}
              </Link>
            </td>
            <td className="px-3 py-2">{formatDate(e.date)}</td>
            <td className="px-3 py-2 text-gray-500">{e.hour === 'bmo' ? 'Before Open' : e.hour === 'amc' ? 'After Close' : '—'}</td>
            <td className="px-3 py-2 text-right">{e.epsEstimate ? `$${e.epsEstimate.toFixed(2)}` : '—'}</td>
            <td className="px-3 py-2 text-right">{e.revenueEstimate ? formatCurrency(e.revenueEstimate) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NewsTab({ symbols }: { symbols: string[] }) {
  // Fetch news for first few symbols
  const { data: news, isLoading } = useNews(symbols[0]);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const items = (news || []).slice(0, 15);

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">No recent news for stocks in this watchlist.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((n) => (
        <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2.5 hover:bg-gray-50">
          <p className="text-sm font-medium line-clamp-1">{n.headline}</p>
          <p className="text-xs text-gray-400 mt-0.5">{n.source} &middot; {formatDate(new Date(n.publishedAt).toISOString())}</p>
        </a>
      ))}
    </div>
  );
}

export default function WatchlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: watchlist, isLoading } = useWatchlist(id);
  const addItem = useAddWatchlistItem();
  const removeItem = useRemoveWatchlistItem();
  const reorderItems = useReorderWatchlistItems();
  const createWatchlist = useCreateWatchlist();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [orderedItems, setOrderedItems] = useState<WatchlistItem[]>([]);
  useEffect(() => {
    if (watchlist?.items) {
      setOrderedItems(watchlist.items);
    }
  }, [watchlist?.items]);

  const symbols = orderedItems.map((i) => i.symbol);
  const { data: quotes } = useStockQuotes(symbols);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data: searchResults } = useStockSearch(debouncedQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedItems.findIndex((i) => i.id === active.id);
      const newIndex = orderedItems.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(orderedItems, oldIndex, newIndex);
      setOrderedItems(newItems);

      const updates = newItems.map((item, index) => ({ id: item.id, sort_order: index }));
      reorderItems.mutate({ watchlistId: id, items: updates });
    },
    [orderedItems, id, reorderItems],
  );

  async function handleAddSymbol(symbol: string) {
    await addItem.mutateAsync({ watchlistId: id, symbol });
    setSearchQuery('');
    setDebouncedQuery('');
  }

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!watchlist) {
    return <p className="text-red-500">Watchlist not found.</p>;
  }

  const quoteMap = new Map(quotes?.map((q) => [q.symbol, q]));
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'earnings', label: 'Earnings' },
    { key: 'news', label: 'News' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <Link href="/" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <h1 className="text-2xl font-bold">{watchlist.name}</h1>
        <button
          onClick={async () => {
            const name = prompt('New watchlist name:');
            if (name?.trim()) {
              const wl = await createWatchlist.mutateAsync(name.trim());
              router.push(`/watchlists/${wl.id}`);
            }
          }}
          className="ml-auto bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          + New Watchlist
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Add a stock..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {debouncedQuery.length >= 2 && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                onClick={() => handleAddSymbol(r.symbol)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <StockLogo symbol={r.symbol} size={20} />
                <span className="flex-1">
                  <strong>{r.symbol}</strong> {r.name}
                </span>
                <span className="text-gray-400 text-xs">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <>
          {orderedItems.length > 0 ? (
            <div className="text-xs text-gray-400 mb-1 px-1">
              {orderedItems.length} symbol{orderedItems.length !== 1 ? 's' : ''}
            </div>
          ) : null}
          {orderedItems.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-6 pl-2 py-2"></th>
                    <th className="text-left px-3 py-2 font-medium text-gray-400 text-xs">Ticker</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-400 text-xs">Ext Hours (%)</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-400 text-xs">Last</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-400 text-xs">Chg%</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-400 text-xs">Chg</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-400 text-xs">Volume</th>
                    <th className="w-8 px-3 py-2"></th>
                  </tr>
                </thead>
                <SortableContext items={orderedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {orderedItems.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        quote={quoteMap.get(item.symbol)}
                        onRemove={() => removeItem.mutate({ itemId: item.id, watchlistId: id })}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">
              This watchlist is empty. Use the search above to add stocks.
            </p>
          )}
        </>
      )}

      {activeTab === 'earnings' && <EarningsTab symbols={symbols} />}
      {activeTab === 'news' && symbols.length > 0 && <NewsTab symbols={symbols} />}
      {activeTab === 'news' && symbols.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">Add stocks to see news.</p>
      )}
    </div>
  );
}
