import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createStockProvider } from '@alpha-stocks/core/providers';
import type { AnnualFinancial, QuarterlyEarning } from '@alpha-stocks/core';

const provider = createStockProvider(process.env.FINNHUB_API_KEY);

const CACHE_TTL_DAYS = 7;

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
    // non-critical
  }
}

// Fetch from Alpha Vantage: annual + quarterly income statements AND quarterly earnings (EPS)
async function fetchAlphaVantageData(symbol: string): Promise<{
  annuals: AnnualFinancial[];
  quarters: QuarterlyEarning[];
}> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return { annuals: [], quarters: [] };

  try {
    // Sequential calls with delay — Alpha Vantage free tier limits to 5 req/min
    const incomeRes = await fetch(`https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${apiKey}`);
    const incomeData = incomeRes.ok ? await incomeRes.json() : {};

    // Brief delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const earningsRes = await fetch(`https://www.alphavantage.co/query?function=EARNINGS&symbol=${symbol}&apikey=${apiKey}`);
    const earningsData = earningsRes.ok ? await earningsRes.json() : {};

    // Annual financials (10+ years)
    const annualReports = incomeData.annualReports || [];
    const annuals: AnnualFinancial[] = annualReports
      .map((r: Record<string, string>) => ({
        date: r.fiscalDateEnding || '',
        revenue: parseFloat(r.totalRevenue) || 0,
        grossProfit: parseFloat(r.grossProfit) || 0,
        operatingIncome: parseFloat(r.operatingIncome) || 0,
        netIncome: parseFloat(r.netIncome) || 0,
      }))
      .filter((d: AnnualFinancial) => d.date && (d.revenue > 0 || d.netIncome !== 0))
      .sort((a: AnnualFinancial, b: AnnualFinancial) => a.date.localeCompare(b.date));

    // Quarterly revenue from income statement
    const qReports = incomeData.quarterlyReports || [];
    const qRevenueMap = new Map<string, { revenue: number; netIncome: number }>();
    for (const r of qReports as Record<string, string>[]) {
      const date = r.fiscalDateEnding || '';
      if (date) qRevenueMap.set(date, { revenue: parseFloat(r.totalRevenue) || 0, netIncome: parseFloat(r.netIncome) || 0 });
    }

    // Quarterly EPS from earnings
    const qEarnings = (earningsData.quarterlyEarnings || []).slice(0, 12) as Record<string, string>[];
    const quarters: QuarterlyEarning[] = qEarnings.map((e) => {
      const date = e.fiscalDateEnding || '';
      const rev = qRevenueMap.get(date);
      // Build quarter label from date (e.g. "2025-11-30" -> "4Q2025" for fiscal year ending Nov)
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const qNum = Math.ceil(month / 3);
      const quarter = `${qNum}Q${year}`;
      return {
        date,
        quarter,
        epsEstimate: e.estimatedEPS ? parseFloat(e.estimatedEPS) : null,
        epsActual: e.reportedEPS ? parseFloat(e.reportedEPS) : null,
        revenue: rev?.revenue ?? null,
        earnings: rev?.netIncome ?? null,
      };
    }).reverse(); // oldest first

    return { annuals, quarters };
  } catch {
    return { annuals: [], quarters: [] };
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  const upper = symbol.toUpperCase();
  const cacheKey = `financials:${upper}`;

  // Use cache only if it has rich data (>4 years annual or >4 quarters)
  const cached = await getCached(cacheKey) as { annualFinancials?: unknown[]; quarterlyEarnings?: unknown[] } | null;
  const cacheIsRich = cached
    && (cached.annualFinancials?.length ?? 0) > 5
    && (cached.quarterlyEarnings?.length ?? 0) > 5;
  if (cached && cacheIsRich) return NextResponse.json(cached);

  try {
    const [yahooFinancials, alphaData] = await Promise.all([
      provider.getFinancials(upper),
      fetchAlphaVantageData(upper),
    ]);

    const result = {
      ...yahooFinancials,
      annualFinancials: alphaData.annuals.length > yahooFinancials.annualFinancials.length
        ? alphaData.annuals
        : yahooFinancials.annualFinancials,
      quarterlyEarnings: alphaData.quarters.length > yahooFinancials.quarterlyEarnings.length
        ? alphaData.quarters
        : yahooFinancials.quarterlyEarnings,
    };

    // Only cache if we got rich data; otherwise keep stale cache and serve what we have
    const resultIsRich = result.annualFinancials.length > 5 || result.quarterlyEarnings.length > 5;
    if (resultIsRich) {
      setCache(cacheKey, result);
    } else if (cached) {
      // Serve stale cache — better than rate-limited data
      return NextResponse.json(cached);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Financials API error:', error);
    return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
  }
}
