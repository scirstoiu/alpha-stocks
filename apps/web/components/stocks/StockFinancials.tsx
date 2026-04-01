'use client';

import { useFinancials, formatCompactNumber } from '@alpha-stocks/core';
import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

function RevenueNetIncomeChart({ data }: {
  data: { date: string; revenue: number; netIncome: number }[];
}) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.netIncome)));

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
      <div className="flex items-end gap-6 h-52">
        {data.map((d, i) => {
          const revPct = maxVal > 0 ? (d.revenue / maxVal) * 100 : 0;
          const niPct = maxVal > 0 ? (Math.abs(d.netIncome) / maxVal) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1.5 flex-1 w-full justify-center">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[11px] font-medium text-gray-600">
                    {formatCompactNumber(d.revenue)}
                  </span>
                  <div
                    className="w-full max-w-[36px] bg-blue-600 rounded-t"
                    style={{ height: `${revPct}%`, minHeight: 4 }}
                  />
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[11px] font-medium text-gray-600">
                    {formatCompactNumber(d.netIncome)}
                  </span>
                  <div
                    className="w-full max-w-[36px] bg-amber-500 rounded-t"
                    style={{ height: `${niPct}%`, minHeight: 4 }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 mt-1">{d.date.slice(0, 4)}</span>
            </div>
          );
        })}
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

  const { annualFinancials } = data;

  return (
    <div className="space-y-6">
      {annualFinancials.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Revenue & Net Income (Annual)</h3>
          <RevenueNetIncomeChart data={annualFinancials} />
        </Card>
      )}
    </div>
  );
}
