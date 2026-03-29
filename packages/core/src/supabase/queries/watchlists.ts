import type { SupabaseClient } from '@supabase/supabase-js';
import type { Watchlist, WatchlistItem } from '../../types/watchlist';

export async function getWatchlists(supabase: SupabaseClient): Promise<Watchlist[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, items:watchlist_items(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((w) => ({
    ...w,
    items: (w.items || []).sort((a: WatchlistItem, b: WatchlistItem) => a.sort_order - b.sort_order),
  }));
}

export async function getWatchlist(supabase: SupabaseClient, id: string): Promise<Watchlist> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, items:watchlist_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...data,
    items: (data.items || []).sort((a: WatchlistItem, b: WatchlistItem) => a.sort_order - b.sort_order),
  };
}

export async function createWatchlist(
  supabase: SupabaseClient,
  name: string,
): Promise<Watchlist> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('watchlists')
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return { ...data, items: [] };
}

export async function deleteWatchlist(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('watchlists').delete().eq('id', id);
  if (error) throw error;
}

export async function addWatchlistItem(
  supabase: SupabaseClient,
  watchlistId: string,
  symbol: string,
  notes?: string,
): Promise<WatchlistItem> {
  // Get max sort_order for this watchlist
  const { data: existing } = await supabase
    .from('watchlist_items')
    .select('sort_order')
    .eq('watchlist_id', watchlistId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({ watchlist_id: watchlistId, symbol: symbol.toUpperCase(), notes, sort_order: nextOrder })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeWatchlistItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await supabase.from('watchlist_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function reorderWatchlistItems(
  supabase: SupabaseClient,
  items: { id: string; sort_order: number }[],
): Promise<void> {
  // Update each item's sort_order individually (Supabase doesn't support batch upsert on non-PK conflicts easily)
  const updates = items.map((item) =>
    supabase
      .from('watchlist_items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
