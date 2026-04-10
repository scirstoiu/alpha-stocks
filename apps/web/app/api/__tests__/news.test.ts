import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCompanyNews = vi.fn();
const mockGetGeneralNews = vi.fn();
const mockGetYahooNews = vi.fn();

vi.mock('@alpha-stocks/core/providers', () => ({
  createMarketDataProvider: () => ({
    getCompanyNews: mockGetCompanyNews,
    getGeneralNews: mockGetGeneralNews,
  }),
  getYahooNews: (...args: unknown[]) => mockGetYahooNews(...args),
}));

vi.stubEnv('FINNHUB_API_KEY', 'test-key');

const { GET, clearNewsCache } = await import('../news/route');

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/news');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/news', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearNewsCache();
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

  it('returns merged company news from both sources', async () => {
    const finnhubNews = [{ id: 'f1', headline: 'AAPL earnings beat', source: 'Finnhub', publishedAt: 1000 }];
    const yahooNews = [{ id: 'yahoo-y1', headline: 'Apple reports Q4', source: 'Yahoo', publishedAt: 2000 }];
    mockGetCompanyNews.mockResolvedValue(finnhubNews);
    mockGetYahooNews.mockResolvedValue(yahooNews);

    const res = await GET(makeRequest({ symbol: 'aapl' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(mockGetYahooNews).toHaveBeenCalledWith('AAPL');
  });

  it('deduplicates news with similar headlines', async () => {
    const finnhubNews = [{ id: 'f1', headline: 'AMD stock rises 5%', source: 'Finnhub', publishedAt: 1000 }];
    const yahooNews = [{ id: 'yahoo-y1', headline: 'AMD Stock Rises 5%', source: 'Yahoo', publishedAt: 2000 }];
    mockGetCompanyNews.mockResolvedValue(finnhubNews);
    mockGetYahooNews.mockResolvedValue(yahooNews);

    const res = await GET(makeRequest({ symbol: 'amd' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
  });

  it('handles one source failing gracefully', async () => {
    mockGetCompanyNews.mockRejectedValue(new Error('Finnhub down'));
    mockGetYahooNews.mockResolvedValue([{ id: 'y1', headline: 'News from Yahoo', source: 'Yahoo', publishedAt: 1000 }]);

    const res = await GET(makeRequest({ symbol: 'aapl' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
  });

  it('returns 500 on general news provider error', async () => {
    mockGetGeneralNews.mockRejectedValue(new Error('API down'));

    const res = await GET(makeRequest({}));
    expect(res.status).toBe(500);
  });
});
