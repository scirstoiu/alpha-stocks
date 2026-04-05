import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCompanyNews = vi.fn();
const mockGetGeneralNews = vi.fn();

vi.mock('@alpha-stocks/core/providers', () => ({
  createMarketDataProvider: () => ({
    getCompanyNews: mockGetCompanyNews,
    getGeneralNews: mockGetGeneralNews,
  }),
}));

vi.stubEnv('FINNHUB_API_KEY', 'test-key');

const { GET } = await import('../news/route');

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/news');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/news', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns general news when no symbol', async () => {
    const fakeNews = [{ id: '1', headline: 'Market up', source: 'Reuters' }];
    mockGetGeneralNews.mockResolvedValue(fakeNews);

    const res = await GET(makeRequest({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(mockGetGeneralNews).toHaveBeenCalled();
    expect(mockGetCompanyNews).not.toHaveBeenCalled();
  });

  it('returns company news when symbol provided', async () => {
    const fakeNews = [{ id: '1', headline: 'AAPL earnings', source: 'CNBC' }];
    mockGetCompanyNews.mockResolvedValue(fakeNews);

    const res = await GET(makeRequest({ symbol: 'aapl' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(mockGetCompanyNews).toHaveBeenCalledWith('AAPL', expect.any(String), expect.any(String));
  });

  it('returns 500 on provider error', async () => {
    mockGetGeneralNews.mockRejectedValue(new Error('API down'));

    const res = await GET(makeRequest({}));
    expect(res.status).toBe(500);
  });
});
