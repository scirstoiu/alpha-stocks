'use client';

import { use } from 'react';
import QuoteDisplay from '@/components/stocks/QuoteDisplay';
import StockChart from '@/components/stocks/StockChart';
import StockSearch from '@/components/stocks/StockSearch';

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  return (
    <div>
      <div className="mb-6">
        <StockSearch />
      </div>
      <div className="space-y-6">
        <QuoteDisplay symbol={upperSymbol} />
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <StockChart symbol={upperSymbol} />
        </div>
      </div>
    </div>
  );
}
