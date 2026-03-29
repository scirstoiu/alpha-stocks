import { NextRequest, NextResponse } from 'next/server';
import { createMarketDataProvider } from '@alpha-stocks/core/providers';

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 500 });
  }

  const provider = createMarketDataProvider(apiKey);
  const symbol = request.nextUrl.searchParams.get('symbol');

  try {
    if (symbol) {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const news = await provider.getCompanyNews(symbol.toUpperCase(), from, to);
      return NextResponse.json(news);
    }

    const news = await provider.getGeneralNews();
    return NextResponse.json(news);
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
