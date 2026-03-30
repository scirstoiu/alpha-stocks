'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { useHistoricalPrices, type HistoricalRange } from '@alpha-stocks/core';

const RANGES: HistoricalRange[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y'];

// Detect if symbol is a currency pair or low-price instrument needing more decimals
function getPrecision(sym: string, prices?: { close: number }[]): number {
  if (sym.includes('=X') || sym.includes('=x')) return 4;
  const avg = prices?.length ? prices.reduce((s, p) => s + p.close, 0) / prices.length : 0;
  if (avg > 0 && avg < 10) return 4;
  return 2;
}

export default function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<HistoricalRange>('1Y');
  const { data: prices, isLoading } = useHistoricalPrices(symbol, range);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

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
    </div>
  );
}
