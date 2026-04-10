'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWatchlists, useCreateWatchlist, useDeleteWatchlist } from '@alpha-stocks/core';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { useTitle } from '@/hooks/useTitle';

export default function WatchlistsPage() {
  useTitle('Watchlists');
  const { data: watchlists, isLoading } = useWatchlists();
  const createWatchlist = useCreateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const router = useRouter();

  // Auto-redirect to the single watchlist if there's only one
  useEffect(() => {
    if (watchlists && watchlists.length === 1) {
      router.replace(`/watchlists/${watchlists[0].id}`);
    }
  }, [watchlists, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createWatchlist.mutateAsync(newName.trim());
    setNewName('');
    setShowCreate(false);
  }

  // Don't render the list if we're about to redirect
  if (isLoading || (watchlists && watchlists.length === 1)) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Watchlists</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          New Watchlist
        </button>
      </div>

      {watchlists && watchlists.length === 0 && (
        <Card>
          <p className="text-gray-500 text-center py-8">
            No watchlists yet. Create one to start tracking stocks.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {watchlists?.map((wl) => (
          <Card key={wl.id} className="hover:shadow-md transition-shadow">
            <Link href={`/watchlists/${wl.id}`} className="block">
              <h3 className="font-semibold text-lg mb-1">{wl.name}</h3>
              <p className="text-sm text-gray-500">
                {wl.items?.length || 0} stock{(wl.items?.length || 0) !== 1 ? 's' : ''}
              </p>
            </Link>
            <button
              onClick={() => {
                if (confirm(`Delete "${wl.name}"?`)) {
                  deleteWatchlist.mutate(wl.id);
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 mt-2"
            >
              Delete
            </button>
          </Card>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Watchlist">
        <form onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Watchlist name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
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
              disabled={!newName.trim() || createWatchlist.isPending}
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
