import { NextRequest, NextResponse } from 'next/server';
import { createStockProvider } from '@alpha-stocks/core/providers';

const provider = createStockProvider(process.env.FINNHUB_API_KEY, process.env.TWELVE_DATA_API_KEY);

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await provider.searchSymbols(query);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
