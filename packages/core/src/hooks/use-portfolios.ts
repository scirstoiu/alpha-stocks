import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from './use-supabase';
import * as queries from '../supabase/queries/portfolios';
import type { TransactionType } from '../types/portfolio';

export function usePortfolios() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => queries.getPortfolios(supabase),
  });
}

export function usePortfolio(id: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => queries.getPortfolio(supabase, id),
    enabled: !!id,
  });
}

export function useTransactions(portfolioId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: () => queries.getTransactions(supabase, portfolioId),
    enabled: !!portfolioId,
  });
}

export function useAllTransactions(portfolioIds: string[]) {
  const supabase = useSupabase();
  return useQueries({
    queries: portfolioIds.map((id) => ({
      queryKey: ['transactions', id],
      queryFn: () => queries.getTransactions(supabase, id),
      enabled: !!id,
    })),
  });
}

export function useCreatePortfolio() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      queries.createPortfolio(supabase, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useRenamePortfolio() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      queries.renamePortfolio(supabase, id, name),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', variables.id] });
    },
  });
}

export function useDeletePortfolio() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => queries.deletePortfolio(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useAddTransaction() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      portfolio_id: string;
      symbol: string;
      type: TransactionType;
      shares: number;
      price_per_share: number;
      fees?: number;
      date: string;
      notes?: string;
    }) => queries.addTransaction(supabase, params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolio_id] });
    },
  });
}

export function useUpdateTransaction() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      portfolioId,
      ...params
    }: {
      id: string;
      portfolioId: string;
      symbol: string;
      type: TransactionType;
      shares: number;
      price_per_share: number;
      fees?: number;
      date: string;
      notes?: string;
    }) => queries.updateTransaction(supabase, id, params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolioId] });
    },
  });
}

export function useDeleteTransaction() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, portfolioId }: { id: string; portfolioId: string }) =>
      queries.deleteTransaction(supabase, id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolioId] });
    },
  });
}

export function useReorderPortfolios() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      queries.reorderPortfolios(supabase, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useBulkAddTransactions() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      portfolioId,
      transactions,
    }: {
      portfolioId: string;
      transactions: {
        symbol: string;
        type: TransactionType;
        shares: number;
        price_per_share: number;
        fees?: number;
        date: string;
        notes?: string;
      }[];
    }) => queries.bulkAddTransactions(supabase, portfolioId, transactions),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolioId] });
    },
  });
}
