import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createStockProvider } from '@alpha-stocks/core/providers';
import type { AnnualFinancial } from '@alpha-stocks/core';

const provider = createStockProvider(process.env.FINNHUB_API_KEY);

const CACHE_TTL_DAYS = 7; // Financial data changes at most quarterly

// Server-side Supabase client for caching
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getCached(key: string): Promise<unknown | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('api_cache')
      .select('data')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.data ?? null;
  } catch {
    return null;
  }
}

async function setCache(key: string, value: unknown) {
  const supabase = getSupabase();
  if (!supabase) return;
  const expires_at = new Date(Date.now() + CACHE_TTL_DAYS * 86400000).toISOString();
  try {
    await supabase
      .from('api_cache')
      .upsert({ key, data: value, expires_at }, { onConflict: 'key' });
  } catch {
    // Cache write failure is non-critical
  }
}

// Fetch annual income statements from Alpha Vantage (10+ years)
async function fetchAlphaVantageAnnuals(symbol: string): Promise<AnnualFinancial[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${apiKey}`,
    );
    if (!res.ok) return [];
    const data = await res.json();

    const reports = data.annualReports;
    if (!Array.isArray(reports)) return [];

    return reports
      .map((r: Record<string, string>) => ({
        date: r.fiscalDateEnding || '',
        revenue: parseFloat(r.totalRevenue) || 0,
        grossProfit: parseFloat(r.grossProfit) || 0,
        operatingIncome: parseFloat(r.operatingIncome) || 0,
        netIncome: parseFloat(r.netIncome) || 0,
      }))
      .filter((d: AnnualFinancial) => d.date && (d.revenue > 0 || d.netIncome !== 0))
      .sort((a: AnnualFinancial, b: AnnualFinancial) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  const upper = symbol.toUpperCase();
  const cacheKey = `financials:${upper}`;

  // Check Supabase cache first
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // Fetch Yahoo (for quarterly earnings + metrics) and Alpha Vantage (for 10yr annuals) in parallel
    const [yahooFinancials, alphaAnnuals] = await Promise.all([
      provider.getFinancials(upper),
      fetchAlphaVantageAnnuals(upper),
    ]);

    // Use Alpha Vantage annuals if available (10+ years), otherwise fall back to Yahoo (4 years)
    const result = {
      ...yahooFinancials,
      annualFinancials: alphaAnnuals.length > yahooFinancials.annualFinancials.length
        ? alphaAnnuals
        : yahooFinancials.annualFinancials,
    };

    // Cache in Supabase (non-blocking)
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Financials API error:', error);
    return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
  }
}
