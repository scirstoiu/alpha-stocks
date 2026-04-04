import { NextRequest, NextResponse } from 'next/server';
import { createStockProvider } from '@alpha-stocks/core/providers';
import type { HistoricalRange } from '@alpha-stocks/core';

const provider = createStockProvider(process.env.FINNHUB_API_KEY);

const VALID_RANGES = new Set(['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y', 'ALL']);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '1Y';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  if (!VALID_RANGES.has(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  try {
    const prices = await provider.getHistoricalPrices(
      symbol.toUpperCase(),
      range as HistoricalRange,
    );
    return NextResponse.json(prices);
  } catch (error) {
    console.error('Historical API error:', error);
    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
  }
}
