import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetEarningsCalendar = vi.fn();

vi.mock('@alpha-stocks/core/providers', () => ({
  createMarketDataProvider: () => ({
    getEarningsCalendar: mockGetEarningsCalendar,
  }),
}));

// Set env before importing route
vi.stubEnv('FINNHUB_API_KEY', 'test-key');

const { GET } = await import('../earnings/route');

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/earnings');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/earnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when from is missing', async () => {
    const res = await GET(makeRequest({ to: '2024-12-31' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('from and to parameters required');
  });

  it('returns 400 when to is missing', async () => {
    const res = await GET(makeRequest({ from: '2024-01-01' }));
    expect(res.status).toBe(400);
  });

  it('returns earnings calendar', async () => {
    const fakeEarnings = [
      { symbol: 'AAPL', date: '2024-01-25', estimate: 2.1 },
    ];
    mockGetEarningsCalendar.mockResolvedValue(fakeEarnings);

    const res = await GET(makeRequest({ from: '2024-01-20', to: '2024-01-30' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].symbol).toBe('AAPL');
  });

  it('returns 500 on provider error', async () => {
    mockGetEarningsCalendar.mockRejectedValue(new Error('API down'));

    const res = await GET(makeRequest({ from: '2024-01-01', to: '2024-01-31' }));
    expect(res.status).toBe(500);
  });
});
