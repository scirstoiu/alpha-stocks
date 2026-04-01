'use client';

import { useFinancials, formatCurrency, formatCompactNumber } from '@alpha-stocks/core';
import type { FinancialMetrics } from '@alpha-stocks/core';
import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

function formatMetricPercent(value: number | undefined): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function BarChart({ data, labelKey, bars }: {
  data: Record<string, unknown>[];
  labelKey: string;
  bars: { key: string; label: string; color: string }[];
}) {
  if (data.length === 0) return null;

  const maxVal = Math.max(
    ...data.flatMap((d) => bars.map((b) => Math.abs(Number(d[b.key]) || 0))),
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        {bars.map((b) => (
          <div key={b.key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
            {b.label}
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {data.map((d, i) => {
          const label = String(d[labelKey] || '').slice(0, 4);
          return (
            <div key={i}>
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="flex gap-1.5">
                {bars.map((b) => {
                  const val = Number(d[b.key]) || 0;
                  const pct = maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0;
                  return (
                    <div key={b.key} className="flex-1">
                      <div className="relative h-7 bg-gray-50 rounded overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full rounded transition-all"
                          style={{ width: `${pct}%`, backgroundColor: b.color }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                          {formatCompactNumber(val)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EpsChart({ data }: { data: { quarter: string; epsActual: number | null; epsEstimate: number | null }[] }) {
  if (data.length === 0) return null;

  const maxEps = Math.max(
    ...data.map((d) => Math.max(Math.abs(d.epsActual ?? 0), Math.abs(d.epsEstimate ?? 0))),
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-blue-600" />
          Actual
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-gray-300" />
          Estimate
        </div>
      </div>
      <div className="flex items-end gap-3 h-40">
        {data.map((d, i) => {
          const actualPct = maxEps > 0 ? (Math.abs(d.epsActual ?? 0) / maxEps) * 100 : 0;
          const estPct = maxEps > 0 ? (Math.abs(d.epsEstimate ?? 0) / maxEps) * 100 : 0;
          const beat = d.epsActual != null && d.epsEstimate != null && d.epsActual >= d.epsEstimate;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1 flex-1 w-full justify-center">
                <div className="flex flex-col items-center gap-0.5 flex-1">
                  <span className="text-[10px] font-medium text-gray-600">
                    {d.epsEstimate != null ? `$${d.epsEstimate.toFixed(2)}` : '—'}
                  </span>
                  <div
                    className="w-full max-w-[28px] bg-gray-200 rounded-t"
                    style={{ height: `${estPct}%`, minHeight: d.epsEstimate != null ? 4 : 0 }}
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5 flex-1">
                  <span className={`text-[10px] font-medium ${beat ? 'text-green-600' : 'text-red-600'}`}>
                    {d.epsActual != null ? `$${d.epsActual.toFixed(2)}` : '—'}
                  </span>
                  <div
                    className={`w-full max-w-[28px] rounded-t ${beat ? 'bg-blue-600' : 'bg-red-400'}`}
                    style={{ height: `${actualPct}%`, minHeight: d.epsActual != null ? 4 : 0 }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-gray-400 mt-1">{d.quarter}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function StockFinancials({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = useFinancials(symbol);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-gray-500 text-center py-8 text-sm">
        Financial data unavailable for {symbol}.
      </p>
    );
  }

  const { annualFinancials, quarterlyEarnings, metrics } = data;
  const m = metrics as FinancialMetrics;

  return (
    <div className="space-y-6">
      {/* Income Statement */}
      {annualFinancials.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Income Statement (Annual)</h3>
          <BarChart
            data={annualFinancials as unknown as Record<string, unknown>[]}
            labelKey="date"
            bars={[
              { key: 'revenue', label: 'Revenue', color: '#2563eb' },
              { key: 'grossProfit', label: 'Gross Profit', color: '#16a34a' },
              { key: 'netIncome', label: 'Net Income', color: '#f59e0b' },
            ]}
          />
        </Card>
      )}

      {/* Quarterly EPS */}
      {quarterlyEarnings.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Quarterly EPS</h3>
          <EpsChart data={quarterlyEarnings} />
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-2">Profitability</h3>
          <MetricRow label="Gross Margin" value={formatMetricPercent(m.grossMargins)} />
          <MetricRow label="Operating Margin" value={formatMetricPercent(m.operatingMargins)} />
          <MetricRow label="Profit Margin" value={formatMetricPercent(m.profitMargins)} />
          <MetricRow label="Return on Equity" value={formatMetricPercent(m.returnOnEquity)} />
          <MetricRow label="Return on Assets" value={formatMetricPercent(m.returnOnAssets)} />
        </Card>
        <Card>
          <h3 className="font-semibold mb-2">Financial Health</h3>
          <MetricRow label="Revenue Growth" value={formatMetricPercent(m.revenueGrowth)} />
          <MetricRow label="Earnings Growth" value={formatMetricPercent(m.earningsGrowth)} />
          <MetricRow label="Debt to Equity" value={m.debtToEquity != null ? m.debtToEquity.toFixed(2) : '—'} />
          <MetricRow label="Current Ratio" value={m.currentRatio != null ? m.currentRatio.toFixed(2) : '—'} />
          <MetricRow label="EBITDA" value={m.ebitda != null ? formatCompactNumber(m.ebitda) : '—'} />
          <MetricRow label="Free Cash Flow" value={m.freeCashflow != null ? formatCompactNumber(m.freeCashflow) : '—'} />
        </Card>
      </div>
    </div>
  );
}
