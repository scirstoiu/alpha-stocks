'use client';

import { use, useState } from 'react';
import QuoteDisplay from '@/components/stocks/QuoteDisplay';
import StockChart from '@/components/stocks/StockChart';
import StockFinancials from '@/components/stocks/StockFinancials';
import StockNews from '@/components/stocks/StockNews';

type Tab = 'overview' | 'financials' | 'news';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'financials', label: 'Financials' },
  { key: 'news', label: 'News' },
];

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const upperSymbol = decodeURIComponent(symbol).toUpperCase();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div>
      <QuoteDisplay symbol={upperSymbol} compact />

      <div className="flex gap-0 border-b border-gray-200 mt-4 mb-4">
        {TABS.map((tab) => (
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
        <div className="space-y-4">
          <QuoteDisplay symbol={upperSymbol} detailsOnly />
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <StockChart symbol={upperSymbol} />
          </div>
        </div>
      )}

      {activeTab === 'financials' && <StockFinancials symbol={upperSymbol} />}

      {activeTab === 'news' && <StockNews symbol={upperSymbol} />}
    </div>
  );
}
