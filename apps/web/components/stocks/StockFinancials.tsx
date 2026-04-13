'use client';

import { useFinancials, formatCompactNumber } from '@alpha-stocks/core';
import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

const CHART_HEIGHT = 250;
const Y_TICKS = 6;

function RevenueNetIncomeChart({ data }: {
  data: { date: string; revenue: number; netIncome: number }[];
}) {
  if (data.length === 0) return null;

  const allVals = data.flatMap((d) => [d.revenue, d.netIncome]);
  const maxVal = Math.max(...allVals.map(Math.abs));
  const minVal = Math.min(0, ...allVals);
  const range = maxVal - minVal || 1;

  // Generate Y-axis ticks
  const tickStep = maxVal / (Y_TICKS - 1);
  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => Math.round(maxVal - i * tickStep));

  const barHeight = (v: number) => Math.max((Math.abs(v) / range) * CHART_HEIGHT, 3);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-blue-600" />
          Revenue
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-amber-500" />
          Net Income
        </div>
      </div>
      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between pr-3 shrink-0" style={{ height: CHART_HEIGHT }}>
          {yTicks.map((v, i) => (
            <span key={i} className="text-[11px] text-gray-400 text-right leading-none">
              {formatCompactNumber(v)}
            </span>
          ))}
        </div>
        {/* Bars */}
        <div className="flex-1 flex items-end gap-1 relative" style={{ height: CHART_HEIGHT }}>
          {/* Grid lines */}
          {yTicks.map((v, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-gray-100"
              style={{ bottom: `${(v / range) * 100}%` }}
            />
          ))}
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative z-10">
              <div className="flex items-end gap-1 w-full justify-center">
                <div
                  className="flex-1 max-w-10 bg-blue-500 rounded-t"
                  style={{ height: barHeight(d.revenue) }}
                />
                <div
                  className="flex-1 max-w-10 bg-amber-400 rounded-t"
                  style={{ height: barHeight(d.netIncome) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* X-axis labels */}
      <div className="flex ml-10">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-xs text-gray-400">{d.date.slice(0, 4)}</span>
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

  return (
    <div className="space-y-6">
      {annualFinancials.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Revenue & Net Income (Annual)</h3>
          <RevenueNetIncomeChart data={annualFinancials} />
        </Card>
      )}

      {/* Quarterly EPS */}
      {quarterlyEarnings && quarterlyEarnings.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Quarterly Earnings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-400 text-xs">Quarter</th>
                  <th className="text-right py-2 font-medium text-gray-400 text-xs">EPS Est.</th>
                  <th className="text-right py-2 font-medium text-gray-400 text-xs">EPS Actual</th>
                  <th className="text-right py-2 font-medium text-gray-400 text-xs">Surprise</th>
                  <th className="text-right py-2 font-medium text-gray-400 text-xs">Revenue</th>
                  <th className="text-right py-2 font-medium text-gray-400 text-xs">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyEarnings.map((q, i) => {
                  const surprise = q.epsActual != null && q.epsEstimate != null
                    ? q.epsActual - q.epsEstimate
                    : null;
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 font-medium">{q.quarter}</td>
                      <td className="py-2 text-right text-gray-500">{q.epsEstimate != null ? `$${q.epsEstimate.toFixed(2)}` : '—'}</td>
                      <td className="py-2 text-right font-medium">{q.epsActual != null ? `$${q.epsActual.toFixed(2)}` : '—'}</td>
                      <td className={`py-2 text-right font-medium ${surprise != null ? (surprise >= 0 ? 'text-gain' : 'text-loss') : ''}`}>
                        {surprise != null ? `${surprise >= 0 ? '+' : ''}$${surprise.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 text-right text-gray-500">{q.revenue != null ? formatCompactNumber(q.revenue) : '—'}</td>
                      <td className="py-2 text-right text-gray-500">{q.earnings != null ? formatCompactNumber(q.earnings) : '—'}</td>
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
