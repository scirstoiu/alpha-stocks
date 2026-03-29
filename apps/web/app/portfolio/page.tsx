'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePortfolios, useCreatePortfolio, useDeletePortfolio } from '@alpha-stocks/core';
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
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <Link href={`/portfolio/${p.id}`} className="block">
              <h3 className="font-semibold text-lg mb-1">{p.name}</h3>
              {p.description && (
                <p className="text-sm text-gray-500">{p.description}</p>
              )}
            </Link>
            <button
              onClick={() => {
                if (confirm(`Delete "${p.name}"?`)) {
                  deletePortfolio.mutate(p.id);
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 mt-2"
            >
              Delete
            </button>
          </Card>
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
