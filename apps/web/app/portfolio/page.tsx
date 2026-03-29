'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  usePortfolios,
  useCreatePortfolio,
  useReorderPortfolios,
  useTransactions,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  type Portfolio,
  type PortfolioSummary,
} from '@alpha-stocks/core';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';

export default function PortfoliosPage() {
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const reorderPortfolios = useReorderPortfolios();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [ordered, setOrdered] = useState<Portfolio[]>([]);
  useEffect(() => {
    if (portfolios) setOrdered(portfolios);
  }, [portfolios]);

  // Collect summaries from child cards for total
  const [summaries, setSummaries] = useState<Map<string, PortfolioSummary>>(new Map());
  const reportSummary = useCallback((id: string, summary: PortfolioSummary) => {
    setSummaries((prev) => {
      const next = new Map(prev);
      next.set(id, summary);
      return next;
    });
  }, []);

  const totalValue = useMemo(() => {
    let total = 0;
    let dayChange = 0;
    for (const s of summaries.values()) {
      total += s.totalValue;
      dayChange += s.dayChange;
    }
    return { total, dayChange, dayChangePercent: total > 0 ? (dayChange / (total - dayChange)) * 100 : 0 };
  }, [summaries]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = ordered.findIndex((p) => p.id === active.id);
      const newIndex = ordered.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(ordered, oldIndex, newIndex);
      setOrdered(newOrder);

      const updates = newOrder.map((p, i) => ({ id: p.id, sort_order: i }));
      reorderPortfolios.mutate(updates);
    },
    [ordered, reorderPortfolios],
  );

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
          + New Portfolio
        </button>
      </div>

      {/* Total holdings */}
      {summaries.size > 0 && (
        <div className="mb-6 bg-gradient-to-r from-gray-50 to-white rounded-xl px-6 py-4 border border-gray-100 flex items-baseline gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Holdings</span>
          <span className="text-3xl font-bold">{formatCurrency(totalValue.total)}</span>
          <span className={`text-sm font-medium ${totalValue.dayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
            {totalValue.dayChange >= 0 ? '+' : ''}{formatCurrency(totalValue.dayChange)} ({formatPercent(totalValue.dayChangePercent)}) today
          </span>
        </div>
      )}

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {portfolios && portfolios.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">
            No portfolios yet. Create one to start tracking your investments.
          </p>
        </Card>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((p) => (
              <SortablePortfolioCard key={p.id} portfolio={p} onSummary={reportSummary} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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

function SortablePortfolioCard({
  portfolio,
  onSummary,
}: {
  portfolio: Portfolio;
  onSummary: (id: string, summary: PortfolioSummary) => void;
}) {
  const router = useRouter();
  const didDrag = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: portfolio.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Track whether a drag happened so we don't navigate on drop
  useEffect(() => {
    if (isDragging) didDrag.current = true;
  }, [isDragging]);

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

  useEffect(() => {
    if (summary) onSummary(portfolio.id, summary);
  }, [summary, portfolio.id, onSummary]);

  function handleClick() {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    router.push(`/portfolio/${portfolio.id}`);
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="hover:shadow-md transition-shadow p-4 cursor-grab active:cursor-grabbing bg-blue-50/60 border-blue-100"
        onClick={handleClick}
      >
        <h3 className="font-semibold text-sm mb-0.5">{portfolio.name}</h3>
        {portfolio.description && (
          <p className="text-xs text-gray-400 mb-1">{portfolio.description}</p>
        )}
        {summary ? (
          <>
            <p className="text-lg font-bold">{formatCurrency(summary.totalValue)}</p>
            <p className={`text-xs font-medium ${summary.dayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
              {summary.dayChange >= 0 ? '+' : ''}{formatCurrency(summary.dayChange)} ({formatPercent(summary.dayChangePercent)}) today
            </p>
          </>
        ) : transactions && transactions.length === 0 ? (
          <p className="text-xs text-gray-400 mt-1">No transactions yet</p>
        ) : null}
      </Card>
    </div>
  );
}
