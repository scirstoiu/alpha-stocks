import type { SupabaseClient } from '@supabase/supabase-js';
import type { Portfolio, Transaction, TransactionType } from '../../types/portfolio';

export async function getPortfolios(supabase: SupabaseClient): Promise<Portfolio[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('created_at', { ascending: false });

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

  const { data, error } = await supabase
    .from('portfolios')
    .insert({ name, description, user_id: user.id })
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
