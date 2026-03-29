import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from './use-supabase';
import * as queries from '../supabase/queries/watchlists';

export function useWatchlists() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: () => queries.getWatchlists(supabase),
  });
}

export function useWatchlist(id: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['watchlist', id],
    queryFn: () => queries.getWatchlist(supabase, id),
    enabled: !!id,
  });
}

export function useCreateWatchlist() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => queries.createWatchlist(supabase, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

export function useDeleteWatchlist() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => queries.deleteWatchlist(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

export function useAddWatchlistItem() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, symbol, notes }: { watchlistId: string; symbol: string; notes?: string }) =>
      queries.addWatchlistItem(supabase, watchlistId, symbol, notes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', variables.watchlistId] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

export function useRemoveWatchlistItem() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, watchlistId }: { itemId: string; watchlistId: string }) =>
      queries.removeWatchlistItem(supabase, itemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', variables.watchlistId] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}
