import { NextRequest, NextResponse } from 'next/server';
import { createStockProvider } from '@alpha-stocks/core/providers';

const provider = createStockProvider(process.env.FINNHUB_API_KEY);

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  try {
    const financials = await provider.getFinancials(symbol.toUpperCase());
    return NextResponse.json(financials);
  } catch (error) {
    console.error('Financials API error:', error);
    return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
  }
}
