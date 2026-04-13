'use client';

import { useState } from 'react';
import { useFinancials, formatCompactNumber } from '@alpha-stocks/core';
import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

const CHART_HEIGHT = 260;
const Y_TICKS = 6;

function fmtCompact2(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function RevenueNetIncomeChart({ data }: {
  data: { date: string; revenue: number; netIncome: number }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return null;

  const limited = data.slice(-10);

  const allVals = limited.flatMap((d) => [d.revenue, d.netIncome]);
  const maxVal = Math.max(...allVals.map(Math.abs));
  const range = maxVal || 1;

  const tickStep = maxVal / (Y_TICKS - 1);
  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => Math.round(maxVal - i * tickStep));

  const barHeight = (v: number) => Math.max((Math.abs(v) / range) * CHART_HEIGHT, 3);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          Revenue
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-amber-400" />
          Net Income
        </div>
      </div>
      <div className="flex relative">
        <div className="flex flex-col justify-between pr-2 shrink-0" style={{ height: CHART_HEIGHT }}>
          {yTicks.map((v, i) => (
            <span key={i} className="text-[11px] text-gray-400 text-right leading-none">
              {formatCompactNumber(v)}
            </span>
          ))}
        </div>
        <div className="flex-1 flex items-end gap-0.5 relative pt-5" style={{ height: CHART_HEIGHT }}>
          {yTicks.map((v, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-gray-100"
              style={{ bottom: `${(v / range) * 100}%` }}
            />
          ))}
          {limited.map((d, i) => {
            const prevRevenue = i > 0 ? limited[i - 1].revenue : null;
            const yoyGrowth = prevRevenue && prevRevenue > 0
              ? ((d.revenue - prevRevenue) / prevRevenue) * 100
              : null;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full relative z-10 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-end gap-0.5 w-full justify-center relative">
                {/* YoY growth % above the blue bar */}
                {yoyGrowth !== null && (
                  <span className={`absolute -top-4 left-0 right-0 text-center text-xs font-semibold ${yoyGrowth >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(0)}%
                  </span>
                )}
                  <div
                    className={`flex-1 max-w-7 rounded-t transition-opacity ${hovered !== null && hovered !== i ? 'opacity-40' : ''} bg-blue-500`}
                    style={{ height: barHeight(d.revenue) }}
                  />
                  <div
                    className={`flex-1 max-w-7 rounded-t transition-opacity ${hovered !== null && hovered !== i ? 'opacity-40' : ''} bg-amber-400`}
                    style={{ height: barHeight(d.netIncome) }}
                  />
                </div>
                {hovered === i && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg z-50 pointer-events-none">
                    <div className="font-bold text-sm mb-1">{d.date.slice(0, 4)}</div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-gray-300">Revenue:</span>
                      <span className="font-semibold">{fmtCompact2(d.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-gray-300">Net Income:</span>
                      <span className="font-semibold">{fmtCompact2(d.netIncome)}</span>
                    </div>
                    {yoyGrowth !== null && (
                      <div className={`mt-1 font-medium ${yoyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        YoY: {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex ml-8">
        {limited.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-xs text-gray-400 mt-1">{d.date.slice(0, 4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StockFinancials({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = useFinancials(symbol);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
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

  const { annualFinancials, quarterlyEarnings } = data;
  const hasChart = annualFinancials.length > 0;
  const hasEarnings = quarterlyEarnings && quarterlyEarnings.length > 0;

  if (!hasChart && !hasEarnings) {
    return (
      <p className="text-gray-500 text-center py-8 text-sm">
        Financial data unavailable for {symbol}.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
      {hasChart && (
        <Card>
          <h3 className="font-semibold mb-4">Revenue & Net Income (Annual)</h3>
          <RevenueNetIncomeChart data={annualFinancials} />
        </Card>
      )}

      {hasEarnings && (
        <Card className="md:w-[420px]">
          <h3 className="font-semibold mb-3 text-sm">Quarterly Earnings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-400">Quarter</th>
                  <th className="text-right py-1.5 font-medium text-gray-400">EPS Est.</th>
                  <th className="text-right py-1.5 font-medium text-gray-400">EPS Act.</th>
                  <th className="text-right py-1.5 font-medium text-gray-400">Revenue</th>
                  <th className="text-right py-1.5 font-medium text-gray-400">Net Income</th>
                  <th className="text-right py-1.5 font-medium text-gray-400">Surprise</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyEarnings.map((q, i) => {
                  const surprise = q.epsActual != null && q.epsEstimate != null
                    ? q.epsActual - q.epsEstimate
                    : null;
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 font-medium">{q.quarter}</td>
                      <td className="py-1.5 text-right text-gray-500">{q.epsEstimate != null ? `$${q.epsEstimate.toFixed(2)}` : '—'}</td>
                      <td className="py-1.5 text-right font-medium">{q.epsActual != null ? `$${q.epsActual.toFixed(2)}` : '—'}</td>
                      <td className="py-1.5 text-right text-gray-500">{q.revenue != null ? formatCompactNumber(q.revenue) : '—'}</td>
                      <td className="py-1.5 text-right text-gray-500">{q.earnings != null ? formatCompactNumber(q.earnings) : '—'}</td>
                      <td className={`py-1.5 text-right font-medium ${surprise != null ? (surprise >= 0 ? 'text-gain' : 'text-loss') : ''}`}>
                        {surprise != null ? `${surprise >= 0 ? '+' : ''}$${surprise.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
