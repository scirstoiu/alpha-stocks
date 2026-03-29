import { NextRequest, NextResponse } from 'next/server';
import { createMarketDataProvider } from '@alpha-stocks/core/providers';

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 500 });
  }

  const provider = createMarketDataProvider(apiKey);
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to parameters required' }, { status: 400 });
  }

  try {
    const earnings = await provider.getEarningsCalendar(from, to);
    return NextResponse.json(earnings);
  } catch (error) {
    console.error('Earnings API error:', error);
    return NextResponse.json({ error: 'Failed to fetch earnings calendar' }, { status: 500 });
  }
}
