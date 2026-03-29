/**
 * Finnhub provider — used server-side for news + earnings calendar,
 * and as a fallback for stock quotes.
 */
import type { IStockProvider, IMarketDataProvider } from '../types/provider';
import type { Quote, SearchResult, OHLCV, CompanyProfile, HistoricalRange } from '../types/stock';
import type { NewsItem } from '../types/news';
import type { EarningsEvent } from '../types/earnings';

const BASE = 'https://finnhub.io/api/v1';

function rangeToUnix(range: HistoricalRange): { from: number; to: number; resolution: string } {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;
  const resolutions: Record<HistoricalRange, { days: number; resolution: string }> = {
    '1D': { days: 1, resolution: '5' },
    '5D': { days: 5, resolution: '15' },
    '1M': { days: 30, resolution: 'D' },
    '3M': { days: 90, resolution: 'D' },
    '6M': { days: 180, resolution: 'D' },
    YTD: { days: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 1000 / day), resolution: 'D' },
    '1Y': { days: 365, resolution: 'D' },
    '2Y': { days: 730, resolution: 'W' },
    '5Y': { days: 1825, resolution: 'W' },
  };
  const config = resolutions[range];
  return { from: now - config.days * day, to: now, resolution: config.resolution };
}

export function createFinnhubStockProvider(apiKey: string): IStockProvider {
  async function fetchFinnhub<T>(path: string): Promise<T> {
    const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    async getQuote(symbol: string): Promise<Quote> {
      const [q, profile] = await Promise.all([
        fetchFinnhub<{ c: number; d: number; dp: number; o: number; h: number; l: number; pc: number; t: number }>(
          `/quote?symbol=${symbol}`,
        ),
        fetchFinnhub<{ name?: string; exchange?: string; currency?: string; marketCapitalization?: number }>(
          `/stock/profile2?symbol=${symbol}`,
        ),
      ]);
      return {
        symbol,
        name: profile.name || symbol,
        price: q.c,
        change: q.d,
        changePercent: q.dp,
        open: q.o,
        high: q.h,
        low: q.l,
        previousClose: q.pc,
        volume: 0,
        marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1_000_000 : undefined,
        exchange: profile.exchange,
        currency: profile.currency,
        updatedAt: q.t * 1000 || Date.now(),
      };
    },

    async getQuotes(symbols: string[]): Promise<Quote[]> {
      return Promise.all(symbols.map((s) => this.getQuote(s)));
    },

    async searchSymbols(query: string): Promise<SearchResult[]> {
      const data = await fetchFinnhub<{ result: { symbol: string; description: string; type: string; displaySymbol: string }[] }>(
        `/search?q=${encodeURIComponent(query)}`,
      );
      return (data.result || []).slice(0, 10).map((r) => ({
        symbol: r.symbol,
        name: r.description,
        type: r.type,
        exchange: '',
      }));
    },

    async getHistoricalPrices(symbol: string, range: HistoricalRange): Promise<OHLCV[]> {
      const { from, to, resolution } = rangeToUnix(range);
      const data = await fetchFinnhub<{ t?: number[]; o?: number[]; h?: number[]; l?: number[]; c?: number[]; v?: number[]; s: string }>(
        `/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`,
      );
      if (data.s !== 'ok' || !data.t) return [];
      return data.t.map((t, i) => ({
        timestamp: t * 1000,
        open: data.o![i],
        high: data.h![i],
        low: data.l![i],
        close: data.c![i],
        volume: data.v![i],
      }));
    },

    async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
      const p = await fetchFinnhub<{
        name?: string; ticker?: string; weburl?: string; logo?: string;
        finnhubIndustry?: string; marketCapitalization?: number; exchange?: string; country?: string;
      }>(`/stock/profile2?symbol=${symbol}`);
      return {
        symbol,
        name: p.name || symbol,
        description: '',
        sector: '',
        industry: p.finnhubIndustry || '',
        website: p.weburl || '',
        logo: p.logo,
        marketCap: p.marketCapitalization ? p.marketCapitalization * 1_000_000 : 0,
        exchange: p.exchange || '',
        country: p.country || '',
      };
    },
  };
}

export function createFinnhubMarketDataProvider(apiKey: string): IMarketDataProvider {
  async function fetchFinnhub<T>(path: string): Promise<T> {
    const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    async getCompanyNews(symbol: string, from: string, to: string): Promise<NewsItem[]> {
      const data = await fetchFinnhub<{ id: number; headline: string; summary: string; source: string; url: string; image: string; datetime: number; related: string; category: string }[]>(
        `/company-news?symbol=${symbol}&from=${from}&to=${to}`,
      );
      return (data || []).map((n) => ({
        id: String(n.id),
        headline: n.headline,
        summary: n.summary,
        source: n.source,
        url: n.url,
        imageUrl: n.image || undefined,
        publishedAt: n.datetime * 1000,
        relatedSymbols: n.related ? n.related.split(',') : undefined,
        category: n.category,
      }));
    },

    async getGeneralNews(): Promise<NewsItem[]> {
      const data = await fetchFinnhub<{ id: number; headline: string; summary: string; source: string; url: string; image: string; datetime: number; category: string }[]>(
        `/news?category=general`,
      );
      return (data || []).map((n) => ({
        id: String(n.id),
        headline: n.headline,
        summary: n.summary,
        source: n.source,
        url: n.url,
        imageUrl: n.image || undefined,
        publishedAt: n.datetime * 1000,
        category: n.category,
      }));
    },

    async getEarningsCalendar(from: string, to: string): Promise<EarningsEvent[]> {
      const data = await fetchFinnhub<{ earningsCalendar: { symbol: string; date: string; hour: string; epsEstimate: number; epsActual: number; revenueEstimate: number; revenueActual: number; quarter: number; year: number }[] }>(
        `/calendar/earnings?from=${from}&to=${to}`,
      );
      return (data.earningsCalendar || []).map((e) => ({
        symbol: e.symbol,
        date: e.date,
        hour: (['bmo', 'amc', 'dmh'].includes(e.hour) ? e.hour : 'unknown') as EarningsEvent['hour'],
        epsEstimate: e.epsEstimate,
        epsActual: e.epsActual,
        revenueEstimate: e.revenueEstimate,
        revenueActual: e.revenueActual,
        quarter: e.quarter,
        year: e.year,
      }));
    },
  };
}
