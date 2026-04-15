import { NextResponse } from 'next/server';
import { createStockProvider } from '@alpha-stocks/core/providers';

const provider = createStockProvider(process.env.FINNHUB_API_KEY);

// Cache status for 60 seconds to avoid hammering providers
let cachedStatus: { yahoo: boolean; finnhub: boolean; checkedAt: number } | null = null;
const CACHE_TTL = 60_000;

export async function GET() {
  const now = Date.now();

  if (cachedStatus && now - cachedStatus.checkedAt < CACHE_TTL) {
    return NextResponse.json(cachedStatus);
  }

  let yahoo = false;
  let finnhub = false;

  // Test Yahoo via a quick quote
  try {
    const { createYahooProvider } = await import('@alpha-stocks/core/providers');
    const yp = createYahooProvider();
    await yp.getQuote('AAPL');
    yahoo = true;
  } catch {
    yahoo = false;
  }

  // Test Finnhub
  if (process.env.FINNHUB_API_KEY) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${process.env.FINNHUB_API_KEY}`);
      finnhub = res.ok && res.status !== 429;
    } catch {
      finnhub = false;
    }
  }

  cachedStatus = { yahoo, finnhub, checkedAt: now };

  return NextResponse.json(cachedStatus);
}
