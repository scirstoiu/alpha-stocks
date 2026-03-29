import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubStockProvider } from '@alpha-stocks/core/providers';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ logo: null });
  }

  try {
    const provider = createFinnhubStockProvider(apiKey);
    const profile = await provider.getCompanyProfile(symbol.toUpperCase());
    const response = NextResponse.json({ logo: profile.logo || null });
    response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return response;
  } catch {
    return NextResponse.json({ logo: null });
  }
}
