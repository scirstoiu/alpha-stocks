import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetQuote = vi.fn();

vi.mock('@alpha-stocks/core/providers', () => ({
  createStockProvider: () => ({
    getQuote: mockGetQuote,
  }),
}));

const { GET } = await import('../stocks/quote/route');

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/stocks/quote');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/stocks/quote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when no symbol or symbols provided', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('symbol parameter required');
  });

  it('returns a single quote', async () => {
    const fakeQuote = { symbol: 'AAPL', price: 150, change: 2 };
    mockGetQuote.mockResolvedValue(fakeQuote);

    const res = await GET(makeRequest({ symbol: 'aapl' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.symbol).toBe('AAPL');
    expect(mockGetQuote).toHaveBeenCalledWith('AAPL');
  });

  it('returns batch quotes', async () => {
    mockGetQuote
      .mockResolvedValueOnce({ symbol: 'AAPL', price: 150 })
      .mockResolvedValueOnce({ symbol: 'GOOGL', price: 2800 });

    const res = await GET(makeRequest({ symbols: 'AAPL,GOOGL' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
  });

  it('handles partial failures in batch gracefully', async () => {
    mockGetQuote
      .mockResolvedValueOnce({ symbol: 'AAPL', price: 150 })
      .mockRejectedValueOnce(new Error('Not found'));

    const res = await GET(makeRequest({ symbols: 'AAPL,INVALID' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].symbol).toBe('AAPL');
  });

  it('returns 500 on provider error for single quote', async () => {
    mockGetQuote.mockRejectedValue(new Error('API down'));

    const res = await GET(makeRequest({ symbol: 'AAPL' }));
    expect(res.status).toBe(500);
  });
});
