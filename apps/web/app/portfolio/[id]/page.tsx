'use client';

import { use, useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  usePortfolio,
  useTransactions,
  useAddTransaction,
  useDeleteTransaction,
  useDeletePortfolio,
  useStockQuotes,
  useHistoricalPrices,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  formatDate,
  type TransactionType,
  type HistoricalRange,
  type Transaction,
} from '@alpha-stocks/core';
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import StockLogo from '@/components/stocks/StockLogo';
import ImportTransactionsModal from '@/components/portfolio/ImportTransactionsModal';

type Tab = 'positions' | 'transactions' | 'stats';

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolio(id);
  const { data: transactions, isLoading: loadingTx } = useTransactions(id);
  const addTransaction = useAddTransaction();
  const deleteTransaction = useDeleteTransaction();
  const deletePortfolio = useDeletePortfolio();
  const [showAddTx, setShowAddTx] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const symbols = useMemo(() => {
    if (!transactions) return [];
    return [...new Set(transactions.map((t) => t.symbol))];
  }, [transactions]);

  const { data: quotes } = useStockQuotes(symbols);

  const summary = useMemo(() => {
    if (!transactions || !quotes) return null;
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
    return computePortfolioSummary(transactions, quoteMap);
  }, [transactions, quotes]);

  if (loadingPortfolio || loadingTx) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!portfolio) {
    return <p className="text-red-500">Portfolio not found.</p>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'positions', label: 'Positions' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'stats', label: 'Stats' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/portfolio" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <div>
          <h1 className="text-2xl font-bold">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-sm text-gray-500">{portfolio.description}</p>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowImportCsv(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowAddTx(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            Add Transaction
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${portfolio.name}"? This cannot be undone.`)) {
                deletePortfolio.mutate(portfolio.id);
                window.location.href = '/portfolio';
              }
            }}
            className="border border-red-300 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalValue)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Unrealized P&L</p>
            <p className={`text-xl font-bold ${summary.totalUnrealizedGain >= 0 ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(summary.totalUnrealizedGain)}
              <span className="text-sm ml-1">({formatPercent(summary.totalUnrealizedGainPercent)})</span>
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Realized P&L</p>
            <p className={`text-xl font-bold ${summary.totalRealizedGain >= 0 ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(summary.totalRealizedGain)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Day Change</p>
            <p className={`text-xl font-bold ${summary.dayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(summary.dayChange)}
              <span className="text-sm ml-1">({formatPercent(summary.dayChangePercent)})</span>
            </p>
          </Card>
        </div>
      )}

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
      {activeTab === 'positions' && summary && summary.positions.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Symbol</th>
              <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Shares</th>
              <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Avg Cost</th>
              <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Price</th>
              <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Value</th>
              <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">P&L</th>
            </tr>
          </thead>
          <tbody>
            {summary.positions.map((pos) => {
              const isPositive = (pos.unrealizedGain ?? 0) >= 0;
              return (
                <tr key={pos.symbol} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/stocks/${pos.symbol}`} className="font-medium text-primary hover:underline inline-flex items-center gap-2">
                      <StockLogo symbol={pos.symbol} size={24} />
                      {pos.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right">{pos.shares.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(pos.averageCost)}</td>
                  <td className="px-4 py-2 text-right">{pos.currentPrice ? formatCurrency(pos.currentPrice) : '—'}</td>
                  <td className="px-4 py-2 text-right font-medium">{pos.currentValue ? formatCurrency(pos.currentValue) : '—'}</td>
                  <td className={`px-4 py-2 text-right ${isPositive ? 'text-gain' : 'text-loss'}`}>
                    {pos.unrealizedGain != null
                      ? `${formatCurrency(pos.unrealizedGain)} (${formatPercent(pos.unrealizedGainPercent!)})`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {activeTab === 'positions' && (!summary || summary.positions.length === 0) && (
        <p className="text-gray-400 text-sm py-8 text-center">No positions yet. Add transactions to see positions.</p>
      )}

      {activeTab === 'transactions' && (
        <>
          {transactions && transactions.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Symbol</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Shares</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Price</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {[...transactions].reverse().map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">{formatDate(tx.date)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          tx.type === 'buy'
                            ? 'bg-green-100 text-green-800'
                            : tx.type === 'sell'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {tx.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/stocks/${tx.symbol}`} className="font-medium text-primary hover:underline inline-flex items-center gap-2">
                        <StockLogo symbol={tx.symbol} size={20} />
                        {tx.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">{tx.shares}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(tx.price_per_share)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(tx.shares * tx.price_per_share + tx.fees)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => deleteTransaction.mutate({ id: tx.id, portfolioId: id })}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No transactions yet.</p>
          )}
        </>
      )}

      {activeTab === 'stats' && transactions && (
        <PortfolioStatsTab transactions={transactions} symbols={symbols} />
      )}

      <AddTransactionModal
        open={showAddTx}
        onClose={() => setShowAddTx(false)}
        portfolioId={id}
        onAdd={addTransaction}
      />

      <ImportTransactionsModal
        open={showImportCsv}
        onClose={() => setShowImportCsv(false)}
        portfolioId={id}
      />
    </div>
  );
}

function PortfolioStatsTab({ transactions, symbols }: { transactions: Transaction[]; symbols: string[] }) {
  const [range, setRange] = useState<HistoricalRange>('1Y');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Fetch historical prices for all symbols
  const priceQueries = symbols.map((s) => ({
    symbol: s,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    query: useHistoricalPrices(s, range),
  }));

  const allLoaded = priceQueries.every((q) => !q.query.isLoading);

  // Compute portfolio value over time
  const chartData = useMemo(() => {
    if (!allLoaded || transactions.length === 0) return [];

    // Build per-symbol price maps (timestamp -> close)
    const priceMaps = new Map<string, Map<number, number>>();
    for (const pq of priceQueries) {
      if (!pq.query.data) continue;
      const map = new Map<number, number>();
      for (const p of pq.query.data) {
        // Normalize to day boundary
        const day = new Date(p.timestamp);
        day.setHours(0, 0, 0, 0);
        map.set(day.getTime(), p.close);
      }
      priceMaps.set(pq.symbol, map);
    }

    // Collect all unique timestamps and sort
    const allTimestamps = new Set<number>();
    for (const map of priceMaps.values()) {
      for (const ts of map.keys()) allTimestamps.add(ts);
    }
    const sortedDays = [...allTimestamps].sort((a, b) => a - b);
    if (sortedDays.length === 0) return [];

    // Sort transactions by date
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build positions over time
    const positions = new Map<string, number>(); // symbol -> shares
    let txIndex = 0;

    const points: { time: number; value: number }[] = [];

    for (const dayTs of sortedDays) {
      // Apply all transactions up to this day
      while (txIndex < sortedTx.length && new Date(sortedTx[txIndex].date).getTime() <= dayTs) {
        const tx = sortedTx[txIndex];
        const current = positions.get(tx.symbol) || 0;
        if (tx.type === 'buy') {
          positions.set(tx.symbol, current + tx.shares);
        } else if (tx.type === 'sell') {
          positions.set(tx.symbol, Math.max(0, current - tx.shares));
        }
        txIndex++;
      }

      // Calculate total portfolio value for this day
      let totalValue = 0;
      for (const [symbol, shares] of positions) {
        if (shares <= 0) continue;
        const priceMap = priceMaps.get(symbol);
        if (!priceMap) continue;
        // Use the closest available price <= dayTs
        let price = 0;
        for (const [ts, p] of priceMap) {
          if (ts <= dayTs) price = p;
          else break;
        }
        if (price > 0) totalValue += shares * price;
      }

      if (totalValue > 0) {
        points.push({ time: dayTs / 1000, value: totalValue });
      }
    }

    return points;
  }, [allLoaded, transactions, priceQueries]);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      width: containerRef.current.clientWidth,
      height: 400,
      timeScale: { borderColor: '#e5e7eb' },
      rightPriceScale: { borderColor: '#e5e7eb' },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#2563eb',
      topColor: 'rgba(37, 99, 235, 0.3)',
      bottomColor: 'rgba(37, 99, 235, 0.01)',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || chartData.length === 0) return;

    const data = chartData.map((p) => ({
      time: p.time as import('lightweight-charts').UTCTimestamp,
      value: p.value,
    }));

    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

  const ranges: HistoricalRange[] = ['1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y'];

  return (
    <div>
      <h3 className="font-semibold mb-3">Portfolio Value Over Time</h3>
      <div className="flex gap-1 mb-3">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              range === r
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="relative">
        {!allLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <span className="text-sm text-gray-500">Loading chart data...</span>
          </div>
        )}
        {chartData.length === 0 && allLoaded && (
          <div className="flex items-center justify-center h-[400px] text-gray-400 text-sm">
            Not enough historical data to display chart.
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}

function AddTransactionModal({
  open,
  onClose,
  portfolioId,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
  onAdd: ReturnType<typeof useAddTransaction>;
}) {
  const [form, setForm] = useState({
    symbol: '',
    type: 'buy' as TransactionType,
    shares: '',
    price: '',
    fees: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onAdd.mutateAsync({
      portfolio_id: portfolioId,
      symbol: form.symbol,
      type: form.type,
      shares: parseFloat(form.shares),
      price_per_share: parseFloat(form.price),
      fees: form.fees ? parseFloat(form.fees) : 0,
      date: form.date,
      notes: form.notes || undefined,
    });
    setForm({ symbol: '', type: 'buy', shares: '', price: '', fees: '', date: new Date().toISOString().split('T')[0], notes: '' });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Transaction">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          {(['buy', 'sell', 'dividend'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                form.type === t
                  ? t === 'buy'
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : t === 'sell'
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={form.symbol}
          onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
          placeholder="Symbol (e.g. AAPL)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            value={form.shares}
            onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
            placeholder="Shares"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            step="any"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="Price per share"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            step="any"
            value={form.fees}
            onChange={(e) => setForm((f) => ({ ...f, fees: e.target.value }))}
            placeholder="Fees"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notes (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={onAdd.isPending}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}
