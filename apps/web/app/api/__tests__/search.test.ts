import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSearchSymbols = vi.fn();

vi.mock('@alpha-stocks/core/providers', () => ({
  createStockProvider: () => ({
    searchSymbols: mockSearchSymbols,
  }),
}));

const { GET } = await import('../stocks/search/route');

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/stocks/search');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/stocks/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array for short query', async () => {
    const res = await GET(makeRequest({ q: 'A' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
    expect(mockSearchSymbols).not.toHaveBeenCalled();
  });

  it('returns empty array for missing query', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('returns search results', async () => {
    const fakeResults = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
    ];
    mockSearchSymbols.mockResolvedValue(fakeResults);

    const res = await GET(makeRequest({ q: 'Apple' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].symbol).toBe('AAPL');
  });

  it('returns 500 on provider error', async () => {
    mockSearchSymbols.mockRejectedValue(new Error('API down'));

    const res = await GET(makeRequest({ q: 'Apple' }));
    expect(res.status).toBe(500);
  });
});
