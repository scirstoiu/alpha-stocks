import { NextResponse } from 'next/server';

type ProviderStatus = 'up' | 'down' | 'not_configured';

// Cache status for 60 seconds to avoid hammering providers
let cachedStatus: { yahoo: ProviderStatus; twelveData: ProviderStatus; finnhub: ProviderStatus; checkedAt: number } | null = null;
const CACHE_TTL = 60_000;

export async function GET() {
  const now = Date.now();

  if (cachedStatus && now - cachedStatus.checkedAt < CACHE_TTL) {
    return NextResponse.json(cachedStatus);
  }

  let yahoo: ProviderStatus = 'down';
  let twelveData: ProviderStatus = process.env.TWELVE_DATA_API_KEY ? 'down' : 'not_configured';
  let finnhub: ProviderStatus = process.env.FINNHUB_API_KEY ? 'down' : 'not_configured';

  // Test Yahoo via a quick quote
  try {
    const { createYahooProvider } = await import('@alpha-stocks/core/providers');
    const yp = createYahooProvider();
    await yp.getQuote('AAPL');
    yahoo = 'up';
  } catch {
    // stays 'down'
  }

  // Test Twelve Data
  if (process.env.TWELVE_DATA_API_KEY) {
    try {
      const res = await fetch(`https://api.twelvedata.com/quote?symbol=AAPL&apikey=${process.env.TWELVE_DATA_API_KEY}`);
      if (res.ok) {
        const data = await res.json();
        twelveData = data.status !== 'error' ? 'up' : 'down';
      }
    } catch {
      // stays 'down'
    }
  }

  // Test Finnhub
  if (process.env.FINNHUB_API_KEY) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_API_KEY}`);
      finnhub = res.ok && res.status !== 429 ? 'up' : 'down';
    } catch {
      // stays 'down'
    }
  }

  cachedStatus = { yahoo, twelveData, finnhub, checkedAt: now };

  return NextResponse.json(cachedStatus);
}
