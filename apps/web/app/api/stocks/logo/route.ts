import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubStockProvider } from '@alpha-stocks/core/providers';

// In-memory cache of symbol -> logo URL to avoid repeated Finnhub calls
const logoUrlCache = new Map<string, string | null>();

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase();
  const proxy = request.nextUrl.searchParams.get('proxy');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return proxy ? new NextResponse(null, { status: 404 }) : NextResponse.json({ logo: null });
  }

  // Get logo URL (from cache or Finnhub)
  let logoUrl = logoUrlCache.get(symbol);
  if (logoUrl === undefined) {
    try {
      const provider = createFinnhubStockProvider(apiKey);
      const profile = await provider.getCompanyProfile(symbol);
      logoUrl = profile.logo || null;
      logoUrlCache.set(symbol, logoUrl);
    } catch {
      logoUrl = null;
      logoUrlCache.set(symbol, null);
    }
  }

  // If proxy mode: fetch the actual image and return it with cache headers
  if (proxy) {
    if (!logoUrl) {
      return new NextResponse(null, { status: 404 });
    }

    try {
      const imgRes = await fetch(logoUrl);
      if (!imgRes.ok) {
        return new NextResponse(null, { status: 404 });
      }

      const contentType = imgRes.headers.get('content-type') || 'image/png';
      const body = await imgRes.arrayBuffer();

      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        },
      });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }

  // JSON mode (legacy)
  const response = NextResponse.json({ logo: logoUrl });
  response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return response;
}
