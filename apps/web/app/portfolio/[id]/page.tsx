'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  usePortfolio,
  useTransactions,
  useAddTransaction,
  useDeleteTransaction,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  formatDate,
  type TransactionType,
} from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import ImportTransactionsModal from '@/components/portfolio/ImportTransactionsModal';

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: portfolio, isLoading: loadingPortfolio } = usePortfolio(id);
  const { data: transactions, isLoading: loadingTx } = useTransactions(id);
  const addTransaction = useAddTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [showAddTx, setShowAddTx] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);

  // Get unique symbols from transactions
  const symbols = useMemo(() => {
    if (!transactions) return [];
    return [...new Set(transactions.map((t) => t.symbol))];
  }, [transactions]);

  const { data: quotes } = useStockQuotes(symbols);

  // Compute portfolio summary
  const summary = useMemo(() => {
    if (!transactions || !quotes) return null;
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
    return computePortfolioSummary(transactions, quoteMap);
  }, [transactions, quotes]);

  if (loadingPortfolio || loadingTx) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!portfolio) {
    return <p className="text-red-500">Portfolio not found.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/portfolio" className="text-gray-400 hover:text-gray-600">&larr;</Link>
        <div>
          <h1 className="text-2xl font-bold">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-sm text-gray-500">{portfolio.description}</p>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowImportCsv(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowAddTx(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalValue)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Unrealized P&L</p>
            <p className={`text-xl font-bold ${summary.totalUnrealizedGain >= 0 ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(summary.totalUnrealizedGain)}
              <span className="text-sm ml-1">({formatPercent(summary.totalUnrealizedGainPercent)})</span>
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Realized P&L</p>
            <p className={`text-xl font-bold ${summary.totalRealizedGain >= 0 ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(summary.totalRealizedGain)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Day Change</p>
            <p className={`text-xl font-bold ${summary.dayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
              {formatCurrency(summary.dayChange)}
              <span className="text-sm ml-1">({formatPercent(summary.dayChangePercent)})</span>
            </p>
          </Card>
        </div>
      )}

      {/* Positions table */}
      {summary && summary.positions.length > 0 && (
        <Card className="overflow-hidden p-0 mb-6">
          <h3 className="px-4 py-3 font-semibold border-b border-gray-200 bg-gray-50">Positions</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Symbol</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Shares</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Avg Cost</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Price</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Value</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">P&L</th>
              </tr>
            </thead>
            <tbody>
              {summary.positions.map((pos) => {
                const isPositive = (pos.unrealizedGain ?? 0) >= 0;
                return (
                  <tr key={pos.symbol} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/stocks/${pos.symbol}`} className="font-medium text-primary hover:underline">
                        {pos.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">{pos.shares.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(pos.averageCost)}</td>
                    <td className="px-4 py-2 text-right">{pos.currentPrice ? formatCurrency(pos.currentPrice) : '—'}</td>
                    <td className="px-4 py-2 text-right font-medium">{pos.currentValue ? formatCurrency(pos.currentValue) : '—'}</td>
                    <td className={`px-4 py-2 text-right ${isPositive ? 'text-gain' : 'text-loss'}`}>
                      {pos.unrealizedGain != null
                        ? `${formatCurrency(pos.unrealizedGain)} (${formatPercent(pos.unrealizedGainPercent!)})`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Transaction history */}
      <Card className="overflow-hidden p-0">
        <h3 className="px-4 py-3 font-semibold border-b border-gray-200 bg-gray-50">Transactions</h3>
        {transactions && transactions.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2 font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Symbol</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Shares</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Price</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...transactions].reverse().map((tx) => (
                <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(tx.date)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        tx.type === 'buy'
                          ? 'bg-green-100 text-green-800'
                          : tx.type === 'sell'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tx.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-medium">{tx.symbol}</td>
                  <td className="px-4 py-2 text-right">{tx.shares}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(tx.price_per_share)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(tx.shares * tx.price_per_share + tx.fees)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => deleteTransaction.mutate({ id: tx.id, portfolioId: id })}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-gray-500 text-center">No transactions yet.</p>
        )}
      </Card>

      <AddTransactionModal
        open={showAddTx}
        onClose={() => setShowAddTx(false)}
        portfolioId={id}
        onAdd={addTransaction}
      />

      <ImportTransactionsModal
        open={showImportCsv}
        onClose={() => setShowImportCsv(false)}
        portfolioId={id}
      />
    </div>
  );
}

function AddTransactionModal({
  open,
  onClose,
  portfolioId,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
  onAdd: ReturnType<typeof useAddTransaction>;
}) {
  const [form, setForm] = useState({
    symbol: '',
    type: 'buy' as TransactionType,
    shares: '',
    price: '',
    fees: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onAdd.mutateAsync({
      portfolio_id: portfolioId,
      symbol: form.symbol,
      type: form.type,
      shares: parseFloat(form.shares),
      price_per_share: parseFloat(form.price),
      fees: form.fees ? parseFloat(form.fees) : 0,
      date: form.date,
      notes: form.notes || undefined,
    });
    setForm({ symbol: '', type: 'buy', shares: '', price: '', fees: '', date: new Date().toISOString().split('T')[0], notes: '' });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Transaction">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          {(['buy', 'sell', 'dividend'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                form.type === t
                  ? t === 'buy'
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : t === 'sell'
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={form.symbol}
          onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
          placeholder="Symbol (e.g. AAPL)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            value={form.shares}
            onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
            placeholder="Shares"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            step="any"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="Price per share"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            step="any"
            value={form.fees}
            onChange={(e) => setForm((f) => ({ ...f, fees: e.target.value }))}
            placeholder="Fees"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notes (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={onAdd.isPending}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}
