import type { SupabaseClient } from '@supabase/supabase-js';
import type { Portfolio, Transaction, TransactionType } from '../../types/portfolio';

export async function getPortfolios(supabase: SupabaseClient): Promise<Portfolio[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPortfolio(supabase: SupabaseClient, id: string): Promise<Portfolio> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createPortfolio(
  supabase: SupabaseClient,
  name: string,
  description?: string,
): Promise<Portfolio> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get max sort_order
  const { data: existing } = await supabase
    .from('portfolios')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('portfolios')
    .insert({ name, description, user_id: user.id, sort_order: nextOrder })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePortfolio(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('portfolios').delete().eq('id', id);
  if (error) throw error;
}

export async function getTransactions(
  supabase: SupabaseClient,
  portfolioId: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addTransaction(
  supabase: SupabaseClient,
  params: {
    portfolio_id: string;
    symbol: string;
    type: TransactionType;
    shares: number;
    price_per_share: number;
    fees?: number;
    date: string;
    notes?: string;
  },
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...params,
      symbol: params.symbol.toUpperCase(),
      fees: params.fees ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderPortfolios(
  supabase: SupabaseClient,
  items: { id: string; sort_order: number }[],
): Promise<void> {
  const updates = items.map((item) =>
    supabase.from('portfolios').update({ sort_order: item.sort_order }).eq('id', item.id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function bulkAddTransactions(
  supabase: SupabaseClient,
  portfolioId: string,
  transactions: {
    symbol: string;
    type: TransactionType;
    shares: number;
    price_per_share: number;
    fees?: number;
    date: string;
    notes?: string;
  }[],
): Promise<Transaction[]> {
  const rows = transactions.map((t) => ({
    portfolio_id: portfolioId,
    symbol: t.symbol.toUpperCase(),
    type: t.type,
    shares: t.shares,
    price_per_share: t.price_per_share,
    fees: t.fees ?? 0,
    date: t.date,
    notes: t.notes || null,
  }));

  const { data, error } = await supabase
    .from('transactions')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}
