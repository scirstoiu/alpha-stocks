'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { useHistoricalPrices, formatPercent, type HistoricalRange } from '@alpha-stocks/core';

const RANGES: HistoricalRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

const RANGE_LABELS: Record<string, string> = {
  '1D': '1 day',
  '5D': '5 days',
  '1M': '1 month',
  '6M': '6 months',
  YTD: 'Year to date',
  '1Y': '1 year',
  '5Y': '5 years',
  ALL: 'All time',
};

// Detect if symbol is a currency pair or low-price instrument needing more decimals
function getPrecision(sym: string, prices?: { close: number }[]): number {
  if (sym.includes('=X') || sym.includes('=x')) return 4;
  const avg = prices?.length ? prices.reduce((s, p) => s + p.close, 0) / prices.length : 0;
  if (avg > 0 && avg < 10) return 4;
  return 2;
}

function isCurrency(symbol: string): boolean {
  return symbol.includes('=X') || symbol.includes('=x');
}

export default function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<HistoricalRange>(() => isCurrency(symbol) ? '6M' : '1Y');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Fetch data for the selected range (chart)
  const { data: prices, isLoading } = useHistoricalPrices(symbol, range);

  // Fetch data for all ranges to compute change %
  const rangeQueries = RANGES.map((r) => ({
    range: r,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    query: useHistoricalPrices(symbol, r),
  }));

  const rangeChanges = useMemo(() => {
    const changes: Record<string, number | null> = {};
    for (const rq of rangeQueries) {
      const data = rq.query.data;
      if (!data || data.length < 2) {
        changes[rq.range] = null;
        continue;
      }
      const first = data[0].close;
      const last = data[data.length - 1].close;
      changes[rq.range] = first > 0 ? ((last - first) / first) * 100 : null;
    }
    return changes;
  }, [rangeQueries]);

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
      timeScale: {
        borderColor: '#e5e7eb',
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
    });

    const precision = getPrecision(symbol, prices || undefined);
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#2563eb',
      topColor: 'rgba(37, 99, 235, 0.3)',
      bottomColor: 'rgba(37, 99, 235, 0.01)',
      lineWidth: 2,
      priceFormat: { type: 'price', precision, minMove: 1 / Math.pow(10, precision) },
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

  useEffect(() => {
    if (!seriesRef.current || !prices?.length) return;

    const data = prices
      .filter((p) => p.close > 0)
      .map((p) => ({
        time: (p.timestamp / 1000) as import('lightweight-charts').UTCTimestamp,
        value: p.close,
      }));

    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [prices]);

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {RANGES.map((r) => (
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
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <span className="text-sm text-gray-500">Loading chart...</span>
          </div>
        )}
        <div ref={containerRef} />
      </div>
      {/* Period change % row */}
      <div className="flex gap-0 mt-3 border border-gray-200 rounded-lg overflow-hidden divide-x divide-gray-200">
        {RANGES.map((r) => {
          const change = rangeChanges[r];
          const isActive = range === r;
          return (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 py-2 px-1 text-center transition-colors ${
                isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="text-xs text-gray-500 font-medium">{RANGE_LABELS[r]}</div>
              <div className={`text-xs font-semibold mt-0.5 ${
                change == null
                  ? 'text-gray-400'
                  : change >= 0
                    ? 'text-gain'
                    : 'text-loss'
              }`}>
                {change != null ? formatPercent(change) : '—'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
