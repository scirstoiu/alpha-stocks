import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetHistoricalPrices = vi.fn();

vi.mock('@alpha-stocks/core/providers', () => ({
  createStockProvider: () => ({
    getHistoricalPrices: mockGetHistoricalPrices,
  }),
}));

const { GET } = await import('../stocks/historical/route');

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/stocks/historical');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/stocks/historical', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when symbol is missing', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('symbol parameter required');
  });

  it('returns 400 for invalid range', async () => {
    const res = await GET(makeRequest({ symbol: 'AAPL', range: 'INVALID' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid range');
  });

  it('defaults to 1Y range', async () => {
    mockGetHistoricalPrices.mockResolvedValue([]);

    await GET(makeRequest({ symbol: 'AAPL' }));
    expect(mockGetHistoricalPrices).toHaveBeenCalledWith('AAPL', '1Y');
  });

  it('returns historical prices', async () => {
    const fakePrices = [
      { timestamp: 1700000000000, open: 150, high: 155, low: 149, close: 153, volume: 1000 },
    ];
    mockGetHistoricalPrices.mockResolvedValue(fakePrices);

    const res = await GET(makeRequest({ symbol: 'AAPL', range: '6M' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].close).toBe(153);
    expect(mockGetHistoricalPrices).toHaveBeenCalledWith('AAPL', '6M');
  });

  it('accepts ALL range', async () => {
    mockGetHistoricalPrices.mockResolvedValue([]);

    const res = await GET(makeRequest({ symbol: 'AAPL', range: 'ALL' }));
    expect(res.status).toBe(200);
  });

  it('returns 500 on provider error', async () => {
    mockGetHistoricalPrices.mockRejectedValue(new Error('API down'));

    const res = await GET(makeRequest({ symbol: 'AAPL' }));
    expect(res.status).toBe(500);
  });
});
