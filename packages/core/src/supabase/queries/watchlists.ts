import type { SupabaseClient } from '@supabase/supabase-js';
import type { Watchlist, WatchlistItem } from '../../types/watchlist';

export async function getWatchlists(supabase: SupabaseClient): Promise<Watchlist[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, items:watchlist_items(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((w) => ({ ...w, items: w.items || [] }));
}

export async function getWatchlist(supabase: SupabaseClient, id: string): Promise<Watchlist> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, items:watchlist_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return { ...data, items: data.items || [] };
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
  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({ watchlist_id: watchlistId, symbol: symbol.toUpperCase(), notes })
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
