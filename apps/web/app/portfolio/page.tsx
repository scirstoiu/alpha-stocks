'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  usePortfolios,
  useCreatePortfolio,
  useReorderPortfolios,
  useAllTransactions,
  useStockQuotes,
  useAllHistoricalPrices,
  computePortfolioSummary,
  computePositions,
  formatCurrency,
  formatPercent,
  formatDate,
  type Portfolio,
  type TransactionType,
  type PortfolioSummary,
  type Transaction,
  type Position,
  type HistoricalRange,
} from '@alpha-stocks/core';
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import StockLogo from '@/components/stocks/StockLogo';
import { useTitle } from '@/hooks/useTitle';

type PageTab = 'overview' | 'stats' | 'reports';

export default function PortfoliosPage() {
  useTitle('Portfolios');
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const reorderPortfolios = useReorderPortfolios();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [activeTab, setActiveTab] = useState<PageTab>('overview');

  const [ordered, setOrdered] = useState<Portfolio[]>([]);
  useEffect(() => {
    if (portfolios) setOrdered(portfolios);
  }, [portfolios]);

  // Fetch all transactions in parallel via useQueries (stable hook count)
  const portfolioIds = useMemo(() => (portfolios || []).map((p) => p.id), [portfolios]);
  const txResults = useAllTransactions(portfolioIds);

  // Collect all unique symbols across all portfolios
  const allSymbols = useMemo(() => {
    const symbols = new Set<string>();
    for (const result of txResults) {
      if (result.data) {
        for (const t of result.data) symbols.add(t.symbol);
      }
    }
    return [...symbols];
  }, [txResults]);

  // Single batch quote fetch for all symbols
  const { data: allQuotes, isLoading: loadingQuotes } = useStockQuotes(allSymbols);

  // Compute summaries for each portfolio (works with partial/empty quotes)
  const summaries = useMemo(() => {
    const map = new Map<string, PortfolioSummary>();
    // Wait for at least one transaction result before computing
    if (txResults.every((r) => !r.data)) return map;
    const quoteMap = new Map((allQuotes || []).map((q) => [q.symbol, q]));
    for (let i = 0; i < portfolioIds.length; i++) {
      const transactions = txResults[i]?.data;
      if (!transactions) continue;
      if (transactions.length === 0) {
        map.set(portfolioIds[i], {
          totalValue: 0, totalCostBasis: 0, totalUnrealizedGain: 0,
          totalUnrealizedGainPercent: 0, totalRealizedGain: 0, totalDividends: 0,
          positions: [], dayChange: 0, dayChangePercent: 0,
        });
      } else {
        map.set(portfolioIds[i], computePortfolioSummary(transactions, quoteMap));
      }
    }
    return map;
  }, [allQuotes, txResults, portfolioIds]);

  const totalValue = useMemo(() => {
    let total = 0;
    let dayChange = 0;
    for (const s of summaries.values()) {
      total += s.totalValue;
      dayChange += s.dayChange;
    }
    return { total, dayChange, dayChangePercent: total > 0 ? (dayChange / (total - dayChange)) * 100 : 0 };
  }, [summaries]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = ordered.findIndex((p) => p.id === active.id);
      const newIndex = ordered.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(ordered, oldIndex, newIndex);
      setOrdered(newOrder);

      const updates = newOrder.map((p, i) => ({ id: p.id, sort_order: i }));
      reorderPortfolios.mutate(updates);
    },
    [ordered, reorderPortfolios],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createPortfolio.mutateAsync({ name: newName.trim(), description: newDesc.trim() || undefined });
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  }

  // Build flat list of all transactions with portfolio name for Reports tab
  const allTransactions = useMemo(() => {
    const result: (Transaction & { portfolioName: string })[] = [];
    for (let i = 0; i < portfolioIds.length; i++) {
      const txs = txResults[i]?.data;
      const pName = (portfolios || []).find((p) => p.id === portfolioIds[i])?.name || '—';
      if (txs) {
        for (const tx of txs) result.push({ ...tx, portfolioName: pName });
      }
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [txResults, portfolioIds, portfolios]);

  const tabs: { key: PageTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'stats', label: 'Stats' },
    { key: 'reports', label: 'Reports' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Portfolios</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          + New Portfolio
        </button>
      </div>

      {/* Total holdings */}
      {ordered.length > 0 && summaries.size >= ordered.length && (
        <div className="mb-4 bg-gradient-to-r from-gray-50 to-white rounded-xl px-6 py-4 border border-gray-100 flex items-baseline gap-4">
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">Total Holdings</span>
          <span className="text-xl font-bold">{formatCurrency(totalValue.total)}</span>
          <span className={`text-sm font-medium ${totalValue.dayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
            {totalValue.dayChange >= 0 ? '+' : ''}{formatCurrency(totalValue.dayChange)} ({formatPercent(totalValue.dayChangePercent)}) today
          </span>
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

      {activeTab === 'overview' && (
        <>
          {isLoading && <p className="text-gray-500">Loading...</p>}

          {portfolios && portfolios.length === 0 && (
            <Card>
              <p className="text-gray-500 text-center py-8">
                No portfolios yet. Create one to start tracking your investments.
              </p>
            </Card>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ordered.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ordered.map((p) => (
                  <SortablePortfolioCard key={p.id} portfolio={p} summary={summaries.get(p.id) ?? null} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {activeTab === 'stats' && <PortfolioStats summaries={summaries} portfolios={portfolios || []} />}

      {activeTab === 'reports' && (
        <TransactionReport transactions={allTransactions} portfolios={portfolios || []} />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Portfolio">
        <form onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Portfolio name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || createPortfolio.isPending}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- Stats Tab ---

const PIE_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#eab308',
];

function PortfolioStats({ summaries, portfolios }: {
  summaries: Map<string, PortfolioSummary>;
  portfolios: Portfolio[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((symbol: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }, []);

  // Aggregate all positions across all portfolios
  const { allPositions, perPortfolio } = useMemo(() => {
    const merged = new Map<string, { symbol: string; value: number; shares: number; costBasis: number; pnl: number }>();
    const breakdown = new Map<string, { portfolioId: string; portfolioName: string; value: number; shares: number; pnl: number }[]>();

    const portfolioNameMap = new Map(portfolios.map((p) => [p.id, p.name]));

    for (const [portfolioId, summary] of summaries.entries()) {
      const portfolioName = portfolioNameMap.get(portfolioId) || portfolioId;
      for (const pos of summary.positions) {
        const existing = merged.get(pos.symbol) || { symbol: pos.symbol, value: 0, shares: 0, costBasis: 0, pnl: 0 };
        existing.value += pos.currentValue || 0;
        existing.shares += pos.shares;
        existing.costBasis += pos.costBasis;
        existing.pnl += pos.unrealizedGain ?? 0;
        merged.set(pos.symbol, existing);

        const entries = breakdown.get(pos.symbol) || [];
        entries.push({
          portfolioId,
          portfolioName,
          value: pos.currentValue || 0,
          shares: pos.shares,
          pnl: pos.unrealizedGain ?? 0,
        });
        breakdown.set(pos.symbol, entries);
      }
    }
    return {
      allPositions: [...merged.values()].sort((a, b) => b.value - a.value),
      perPortfolio: breakdown,
    };
  }, [summaries, portfolios]);

  const totalValue = allPositions.reduce((s, p) => s + p.value, 0);

  // Portfolio allocation (by portfolio)
  const portfolioAllocation = useMemo(() => {
    return portfolios
      .map((p) => {
        const s = summaries.get(p.id);
        return { name: p.name, value: s?.totalValue || 0 };
      })
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [portfolios, summaries]);

  if (allPositions.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">Add transactions to see portfolio stats.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Stock Distribution */}
      <div>
        <h3 className="font-semibold mb-4">Stock Distribution</h3>
        <div className="flex gap-8 flex-wrap">
          {/* Pie chart (SVG) */}
          <PieChart
            data={allPositions.map((p, i) => ({
              label: p.symbol,
              value: p.value,
              color: PIE_COLORS[i % PIE_COLORS.length],
            }))}
            size={220}
          />
          {/* Legend + table */}
          <div className="flex-1 min-w-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-400 text-xs">Symbol</th>
                  <th className="text-right py-1.5 font-medium text-gray-400 text-xs">Value</th>
                  <th className="text-right py-1.5 font-medium text-gray-400 text-xs">Weight</th>
                  <th className="text-right py-1.5 font-medium text-gray-400 text-xs">P&L</th>
                  <th className="text-right py-1.5 font-medium text-gray-400 text-xs">Shares</th>
                </tr>
              </thead>
              <tbody>
                {allPositions.map((pos, i) => {
                  const isExpanded = expanded.has(pos.symbol);
                  const breakdown = (perPortfolio.get(pos.symbol) || []).slice().sort((a, b) => b.value - a.value);
                  return (
                    <>
                      <tr
                        key={pos.symbol}
                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleExpand(pos.symbol)}
                      >
                        <td className="py-1.5 flex items-center gap-2">
                          <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="font-medium">{pos.symbol}</span>
                        </td>
                        <td className="py-1.5 text-right">{formatCurrency(pos.value)}</td>
                        <td className="py-1.5 text-right">{totalValue > 0 ? ((pos.value / totalValue) * 100).toFixed(1) : 0}%</td>
                        <td className={`py-1.5 text-right ${pos.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>{formatCurrency(pos.pnl)}</td>
                        <td className="py-1.5 text-right text-gray-500">{Math.round(pos.shares)}</td>
                      </tr>
                      {isExpanded && breakdown.map((b) => (
                        <tr key={`${pos.symbol}-${b.portfolioId}`} className="border-b border-gray-50 bg-gray-50/50">
                          <td className="py-1 pl-10 text-[13px] text-gray-500">{b.portfolioName}</td>
                          <td className="py-1 text-right text-xs text-gray-500">{formatCurrency(b.value)}</td>
                          <td className="py-1 text-right text-xs text-gray-400">{pos.value > 0 ? ((b.value / pos.value) * 100).toFixed(1) : 0}%</td>
                          <td className={`py-1 text-right text-xs ${b.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>{formatCurrency(b.pnl)}</td>
                          <td className="py-1 text-right text-xs text-gray-400">{Math.round(b.shares)}</td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Portfolio Allocation */}
      {portfolioAllocation.length > 1 && (
        <div>
          <h3 className="font-semibold mb-4">Portfolio Allocation</h3>
          <div className="flex gap-8 flex-wrap">
            <PieChart
              data={portfolioAllocation.map((p, i) => ({
                label: p.name,
                value: p.value,
                color: PIE_COLORS[i % PIE_COLORS.length],
              }))}
              size={180}
            />
            <div className="flex-1 min-w-[200px]">
              {portfolioAllocation.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(p.value)}</span>
                    <span className="text-gray-400 ml-2 text-xs">{totalValue > 0 ? ((p.value / totalValue) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Consolidated Value Over Time */}
      <ConsolidatedChart summaries={summaries} portfolios={portfolios} />
    </div>
  );
}

// --- SVG Pie Chart ---

function PieChart({ data, size }: {
  data: { label: string; value: number; color: string }[];
  size: number;
}) {
  const [tooltip, setTooltip] = useState<{ label: string; value: number; pct: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  let startAngle = -Math.PI / 2;

  const paths = data.map((d) => {
    const pct = d.value / total;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;

    return (
      <path
        key={d.label}
        d={path}
        fill={d.color}
        stroke="white"
        strokeWidth={2}
        className="hover:opacity-80 transition-opacity"
        onMouseMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltip({ label: d.label, value: d.value, pct: pct * 100, x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
        onMouseLeave={() => setTooltip(null)}
      />
    );
  });

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
      </svg>
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap z-50"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <span className="font-semibold">{tooltip.label}</span>
          <span className="text-gray-300 ml-1.5">{formatCurrency(tooltip.value)}</span>
          <span className="text-gray-400 ml-1.5">{tooltip.pct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// --- Consolidated Value Chart ---

function ConsolidatedChart({ summaries, portfolios }: {
  summaries: Map<string, PortfolioSummary>;
  portfolios: Portfolio[];
}) {
  // Get all unique symbols across all portfolios
  const allSymbols = useMemo(() => {
    const s = new Set<string>();
    for (const summary of summaries.values()) {
      for (const pos of summary.positions) s.add(pos.symbol);
    }
    return [...s];
  }, [summaries]);

  const [range, setRange] = useState<HistoricalRange>('1Y');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Fetch all transactions for all portfolios
  const portfolioIds = useMemo(() => portfolios.map((p) => p.id), [portfolios]);
  const txResults = useAllTransactions(portfolioIds);

  const allTransactions = useMemo(() => {
    const txs: Transaction[] = [];
    for (const result of txResults) {
      if (result.data) txs.push(...result.data);
    }
    return txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [txResults]);

  // Fetch historical prices for each symbol
  const priceResults = useAllHistoricalPrices(allSymbols, range);

  const allLoaded = priceResults.every((q) => !q.isLoading) && txResults.every((q) => !q.isLoading);

  const chartData = useMemo(() => {
    if (!allLoaded || allTransactions.length === 0) return [];

    const priceMaps = new Map<string, Map<number, number>>();
    for (let i = 0; i < allSymbols.length; i++) {
      const data = priceResults[i]?.data;
      if (!data) continue;
      const map = new Map<number, number>();
      for (const p of data) {
        const day = new Date(p.timestamp);
        day.setHours(0, 0, 0, 0);
        map.set(day.getTime(), p.close);
      }
      priceMaps.set(allSymbols[i], map);
    }

    const allTimestamps = new Set<number>();
    for (const map of priceMaps.values()) {
      for (const ts of map.keys()) allTimestamps.add(ts);
    }
    const sortedDays = [...allTimestamps].sort((a, b) => a - b);
    if (sortedDays.length === 0) return [];

    const positions = new Map<string, number>();
    let txIndex = 0;
    const points: { time: number; value: number }[] = [];

    for (const dayTs of sortedDays) {
      while (txIndex < allTransactions.length && new Date(allTransactions[txIndex].date).getTime() <= dayTs) {
        const tx = allTransactions[txIndex];
        const current = positions.get(tx.symbol) || 0;
        if (tx.type === 'buy') positions.set(tx.symbol, current + tx.shares);
        else if (tx.type === 'sell') positions.set(tx.symbol, Math.max(0, current - tx.shares));
        txIndex++;
      }

      let totalValue = 0;
      for (const [symbol, shares] of positions) {
        if (shares <= 0) continue;
        const priceMap = priceMaps.get(symbol);
        if (!priceMap) continue;
        let price = 0;
        for (const [ts, p] of priceMap) {
          if (ts <= dayTs) price = p;
          else break;
        }
        if (price > 0) totalValue += shares * price;
      }

      if (totalValue > 0) points.push({ time: dayTs / 1000, value: totalValue });
    }

    return points;
  }, [allLoaded, allTransactions, priceResults, allSymbols]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'white' }, textColor: '#6b7280' },
      grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
      width: containerRef.current.clientWidth,
      height: 350,
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
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(containerRef.current);

    return () => { observer.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || chartData.length === 0) return;
    seriesRef.current.setData(
      chartData.map((p) => ({ time: p.time as import('lightweight-charts').UTCTimestamp, value: p.value })),
    );
    chartRef.current?.timeScale().fitContent();
  }, [chartData]);

  const ranges: HistoricalRange[] = ['1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y'];

  return (
    <div>
      <h3 className="font-semibold mb-3">Consolidated Value Over Time</h3>
      <div className="flex gap-1 mb-3">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              range === r ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
          <div className="flex items-center justify-center h-[350px] text-gray-400 text-sm">
            Not enough historical data to display chart.
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}

// --- Sortable Portfolio Card ---

function SortablePortfolioCard({
  portfolio,
  summary,
}: {
  portfolio: Portfolio;
  summary: PortfolioSummary | null;
}) {
  const router = useRouter();
  const didDrag = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: portfolio.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isDragging) didDrag.current = true;
  }, [isDragging]);

  function handleClick() {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    router.push(`/portfolio/${portfolio.id}`);
  }

  const isDayPositive = summary ? summary.dayChange >= 0 : true;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing flex items-center gap-3"
        onClick={handleClick}
      >
        {summary ? (
          <>
            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-base flex-shrink-0 ${isDayPositive ? 'bg-green-50 text-gain' : 'bg-red-50 text-loss'}`}>
              {isDayPositive ? '↑' : '↓'}
            </span>
            <div className="flex gap-4 flex-1 min-w-0">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{portfolio.name}</div>
                <div className="text-sm font-medium text-gray-700">{formatCurrency(summary.totalValue)}</div>
              </div>
              <div className="text-right ml-auto flex-shrink-0">
                <div className={`text-sm font-medium ${isDayPositive ? 'text-gain' : 'text-loss'}`}>
                  {formatPercent(summary.dayChangePercent)}
                </div>
                <div className={`text-xs font-semibold mt-0.5 ${isDayPositive ? 'text-gain' : 'text-loss'}`}>
                  {isDayPositive ? '+' : ''}{formatCurrency(summary.dayChange)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <div className="text-sm font-semibold">{portfolio.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">Loading...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Reports Tab ---

const TYPE_OPTIONS: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'sell', label: 'Sell' },
  { value: 'buy', label: 'Buy' },
  { value: 'dividend', label: 'Dividend' },
];

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: 'Last 12 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '1m', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

function TransactionReport({
  transactions,
  portfolios,
}: {
  transactions: (Transaction & { portfolioName: string })[];
  portfolios: Portfolio[];
}) {
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [selectedPortfolios, setSelectedPortfolios] = useState<Set<string>>(new Set());
  const [pfDropdownOpen, setPfDropdownOpen] = useState(false);
  const pfDropdownRef = useRef<HTMLDivElement>(null);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [period, setPeriod] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pfDropdownRef.current && !pfDropdownRef.current.contains(e.target as Node)) {
        setPfDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    let result = transactions;

    if (typeFilter !== 'all') {
      result = result.filter((tx) => tx.type === typeFilter);
    }

    if (selectedPortfolios.size > 0) {
      result = result.filter((tx) => selectedPortfolios.has(tx.portfolio_id));
    }

    if (symbolFilter.trim()) {
      const sym = symbolFilter.trim().toUpperCase();
      result = result.filter((tx) => tx.symbol.includes(sym));
    }

    // Period filter
    const now = new Date();
    let fromDate: Date | null = null;
    if (period === 'ytd') fromDate = new Date(now.getFullYear(), 0, 1);
    else if (period === '1y') { fromDate = new Date(now); fromDate.setFullYear(fromDate.getFullYear() - 1); }
    else if (period === '6m') { fromDate = new Date(now); fromDate.setMonth(fromDate.getMonth() - 6); }
    else if (period === '3m') { fromDate = new Date(now); fromDate.setMonth(fromDate.getMonth() - 3); }
    else if (period === '1m') { fromDate = new Date(now); fromDate.setMonth(fromDate.getMonth() - 1); }
    else if (period === 'custom') {
      if (dateFrom) fromDate = new Date(dateFrom);
    }

    if (fromDate) {
      const fromStr = fromDate.toISOString().split('T')[0];
      result = result.filter((tx) => tx.date >= fromStr);
    }
    if (period === 'custom' && dateTo) {
      result = result.filter((tx) => tx.date <= dateTo);
    }

    return result;
  }, [transactions, typeFilter, selectedPortfolios, symbolFilter, period, dateFrom, dateTo]);

  const totalAmount = useMemo(() => {
    return filtered.reduce((sum, tx) => sum + tx.shares * tx.price_per_share, 0);
  }, [filtered]);

  const totalFees = useMemo(() => {
    return filtered.reduce((sum, tx) => sum + tx.fees, 0);
  }, [filtered]);

  return (
    <div>
      {/* Filters + Summary */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Symbol</label>
              <input
                type="text"
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24"
              />
            </div>
            <div className="relative" ref={pfDropdownRef}>
              <label className="block text-xs font-medium text-gray-400 mb-1">Portfolio</label>
              <button
                type="button"
                onClick={() => setPfDropdownOpen((v) => !v)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-left min-w-[140px] flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {selectedPortfolios.size === 0
                    ? 'All Portfolios'
                    : selectedPortfolios.size === 1
                      ? portfolios.find((p) => selectedPortfolios.has(p.id))?.name || '1 selected'
                      : `${selectedPortfolios.size} selected`}
                </span>
                <span className="text-gray-400 text-xs">▼</span>
              </button>
              {pfDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">
                  {portfolios.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPortfolios.has(p.id)}
                        onChange={() => {
                          setSelectedPortfolios((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                            return next;
                          });
                        }}
                        className="rounded border-gray-300"
                      />
                      {p.name}
                    </label>
                  ))}
                  {selectedPortfolios.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPortfolios(new Set())}
                      className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-gray-50 border-t border-gray-100 mt-1"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-5 text-sm text-gray-500 items-baseline">
            <span><strong className="text-gray-800">{filtered.length}</strong> transactions</span>
            <span>Total: <strong className="text-gray-800">{formatCurrency(totalAmount)}</strong></span>
            {totalFees > 0 && <span>Fees: <strong className="text-gray-800">{formatCurrency(totalFees)}</strong></span>}
          </div>
        </div>
      </Card>

      {/* Table */}
      {filtered.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-3 py-1.5 font-medium text-gray-400 text-xs">Date</th>
              <th className="text-left px-3 py-1.5 font-medium text-gray-400 text-xs">Type</th>
              <th className="text-left px-3 py-1.5 font-medium text-gray-400 text-xs">Symbol</th>
              <th className="text-left px-3 py-1.5 font-medium text-gray-400 text-xs">Portfolio</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400 text-xs">Shares</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400 text-xs">Price</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400 text-xs">Fees</th>
              <th className="text-right px-3 py-1.5 font-medium text-gray-400 text-xs">Total</th>
              {filtered[0]?.notes && <th className="text-left px-3 py-1.5 font-medium text-gray-400 text-xs">Notes</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx) => (
              <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5">{formatDate(tx.date)}</td>
                <td className="px-3 py-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    tx.type === 'buy' ? 'bg-green-100 text-green-800'
                      : tx.type === 'sell' ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {tx.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <Link href={`/stocks/${tx.symbol}`} target="_blank" className="inline-flex items-center gap-2 group">
                    <StockLogo symbol={tx.symbol} size={22} />
                    <span className="font-bold text-xs bg-gray-100 group-hover:bg-blue-100 group-hover:text-blue-700 px-1.5 py-0.5 rounded transition-colors tracking-wide">{tx.symbol}</span>
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-gray-500">{tx.portfolioName}</td>
                <td className="px-3 py-1.5 text-right">{tx.shares}</td>
                <td className="px-3 py-1.5 text-right">{formatCurrency(tx.price_per_share)}</td>
                <td className="px-3 py-1.5 text-right text-gray-400">{tx.fees > 0 ? formatCurrency(tx.fees) : '—'}</td>
                <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(tx.shares * tx.price_per_share + tx.fees)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">No transactions match the current filters.</p>
      )}
    </div>
  );
}
