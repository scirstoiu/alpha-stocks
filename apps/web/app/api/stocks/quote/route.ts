import { NextRequest, NextResponse } from 'next/server';
import { createStockProvider } from '@alpha-stocks/core/providers';

const provider = createStockProvider(process.env.FINNHUB_API_KEY);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get('symbol');
  const symbols = searchParams.get('symbols');

  try {
    if (symbols) {
      const list = symbols.split(',').map((s) => s.trim().toUpperCase());
      try {
        const quotes = await provider.getQuotes(list);
        return NextResponse.json(quotes);
      } catch {
        // Batch failed entirely — try individually with partial failure resilience
        const results = await Promise.allSettled(list.map((s) => provider.getQuote(s)));
        const quotes = results
          .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof provider.getQuote>>> => r.status === 'fulfilled')
          .map((r) => r.value);
        return NextResponse.json(quotes);
      }
    }

    if (!symbol) {
      return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
    }

    const quote = await provider.getQuote(symbol.toUpperCase());
    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
