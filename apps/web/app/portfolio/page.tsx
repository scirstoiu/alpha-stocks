'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  usePortfolios,
  useCreatePortfolio,
  useDeletePortfolio,
  useTransactions,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  type Portfolio,
} from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';

export default function PortfoliosPage() {
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createPortfolio.mutateAsync({ name: newName.trim(), description: newDesc.trim() || undefined });
    setNewName('');
    setNewDesc('');
    setShowCreate(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Portfolios</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          New Portfolio
        </button>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {portfolios && portfolios.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">
            No portfolios yet. Create one to start tracking your investments.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portfolios?.map((p) => (
          <PortfolioCard key={p.id} portfolio={p} onDelete={() => {
            if (confirm(`Delete "${p.name}"?`)) {
              deletePortfolio.mutate(p.id);
            }
          }} />
        ))}
      </div>

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

function PortfolioCard({ portfolio, onDelete }: { portfolio: Portfolio; onDelete: () => void }) {
  const { data: transactions } = useTransactions(portfolio.id);

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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Link href={`/portfolio/${portfolio.id}`} className="block">
        <h3 className="font-semibold text-lg mb-1">{portfolio.name}</h3>
        {portfolio.description && (
          <p className="text-sm text-gray-500 mb-2">{portfolio.description}</p>
        )}
        {summary ? (
          <div>
            <p className="text-xl font-bold">{formatCurrency(summary.totalValue)}</p>
            <p className={`text-sm font-medium ${summary.dayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
              {summary.dayChange >= 0 ? '+' : ''}{formatCurrency(summary.dayChange)} ({formatPercent(summary.dayChangePercent)}) today
            </p>
          </div>
        ) : transactions && transactions.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions yet</p>
        ) : null}
      </Link>
      <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 mt-2">
        Delete
      </button>
    </Card>
  );
}
