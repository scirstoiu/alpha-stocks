import { NextRequest, NextResponse } from 'next/server';
import { createStockProvider } from '@alpha-stocks/core/providers';
import type { AnnualFinancial } from '@alpha-stocks/core';

const provider = createStockProvider(process.env.FINNHUB_API_KEY);

// Cache: symbol -> { data, timestamp }
const financialsCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — financials rarely change

function getCached(key: string): unknown | null {
  const entry = financialsCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: unknown) {
  financialsCache.set(key, { data, ts: Date.now() });
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
  const cached = getCached(upper);
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

    setCache(upper, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Financials API error:', error);
    return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
  }
}
