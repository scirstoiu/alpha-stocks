/**
 * Twelve Data provider — used as a secondary fallback for stock quotes.
 * Free tier: 800 API credits/day, 8 credits/minute.
 * Docs: https://twelvedata.com/docs
 */
import type { IStockProvider } from '../types/provider';
import type { Quote, SearchResult, OHLCV, CompanyProfile, HistoricalRange } from '../types/stock';
import type { FinancialData } from '../types/financials';

const BASE = 'https://api.twelvedata.com';

const RANGE_TO_INTERVAL: Record<HistoricalRange, { interval: string; outputsize: number }> = {
  '1D': { interval: '5min', outputsize: 78 },
  '5D': { interval: '15min', outputsize: 130 },
  '1M': { interval: '1day', outputsize: 22 },
  '3M': { interval: '1day', outputsize: 66 },
  '6M': { interval: '1day', outputsize: 130 },
  YTD: { interval: '1day', outputsize: 252 },
  '1Y': { interval: '1day', outputsize: 252 },
  '2Y': { interval: '1week', outputsize: 104 },
  '5Y': { interval: '1week', outputsize: 260 },
  ALL: { interval: '1month', outputsize: 240 },
};

export function createTwelveDataProvider(apiKey: string): IStockProvider {
  async function fetchTD<T>(path: string): Promise<T> {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${BASE}${path}${sep}apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);
    const data = await res.json() as T & { status?: string; message?: string };
    if ((data as Record<string, unknown>).status === 'error') {
      throw new Error(`Twelve Data: ${(data as Record<string, unknown>).message || 'Unknown error'}`);
    }
    return data;
  }

  return {
    async getQuote(symbol: string): Promise<Quote> {
      const data = await fetchTD<{
        symbol: string;
        name: string;
        exchange: string;
        currency: string;
        open: string;
        high: string;
        low: string;
        close: string;
        previous_close: string;
        change: string;
        percent_change: string;
        volume: string;
        fifty_two_week?: { high: string; low: string };
      }>(`/quote?symbol=${symbol}`);

      return {
        symbol: data.symbol,
        name: data.name || symbol,
        price: parseFloat(data.close) || 0,
        change: parseFloat(data.change) || 0,
        changePercent: parseFloat(data.percent_change) || 0,
        open: parseFloat(data.open) || 0,
        high: parseFloat(data.high) || 0,
        low: parseFloat(data.low) || 0,
        previousClose: parseFloat(data.previous_close) || 0,
        volume: parseInt(data.volume) || 0,
        exchange: data.exchange,
        currency: data.currency,
        fiftyTwoWeekHigh: data.fifty_two_week ? parseFloat(data.fifty_two_week.high) : undefined,
        fiftyTwoWeekLow: data.fifty_two_week ? parseFloat(data.fifty_two_week.low) : undefined,
        updatedAt: Date.now(),
      };
    },

    async getQuotes(symbols: string[]): Promise<Quote[]> {
      // Twelve Data supports batch quotes with comma-separated symbols
      if (symbols.length === 0) return [];
      if (symbols.length === 1) return [await this.getQuote(symbols[0])];

      const data = await fetchTD<Record<string, {
        symbol: string;
        name: string;
        exchange: string;
        currency: string;
        open: string;
        high: string;
        low: string;
        close: string;
        previous_close: string;
        change: string;
        percent_change: string;
        volume: string;
        fifty_two_week?: { high: string; low: string };
      }>>(`/quote?symbol=${symbols.join(',')}`);

      return Object.values(data)
        .filter((d) => d && d.symbol && d.close)
        .map((d) => ({
          symbol: d.symbol,
          name: d.name || d.symbol,
          price: parseFloat(d.close) || 0,
          change: parseFloat(d.change) || 0,
          changePercent: parseFloat(d.percent_change) || 0,
          open: parseFloat(d.open) || 0,
          high: parseFloat(d.high) || 0,
          low: parseFloat(d.low) || 0,
          previousClose: parseFloat(d.previous_close) || 0,
          volume: parseInt(d.volume) || 0,
          exchange: d.exchange,
          currency: d.currency,
          fiftyTwoWeekHigh: d.fifty_two_week ? parseFloat(d.fifty_two_week.high) : undefined,
          fiftyTwoWeekLow: d.fifty_two_week ? parseFloat(d.fifty_two_week.low) : undefined,
          updatedAt: Date.now(),
        }));
    },

    async searchSymbols(query: string): Promise<SearchResult[]> {
      const data = await fetchTD<{
        data?: { symbol: string; instrument_name: string; instrument_type: string; exchange: string; currency: string }[];
      }>(`/symbol_search?symbol=${encodeURIComponent(query)}`);

      return (data.data || []).slice(0, 10).map((r) => ({
        symbol: r.symbol,
        name: r.instrument_name,
        type: r.instrument_type,
        exchange: r.exchange,
        currency: r.currency,
      }));
    },

    async getHistoricalPrices(symbol: string, range: HistoricalRange): Promise<OHLCV[]> {
      const config = RANGE_TO_INTERVAL[range];
      const data = await fetchTD<{
        values?: { datetime: string; open: string; high: string; low: string; close: string; volume: string }[];
      }>(`/time_series?symbol=${symbol}&interval=${config.interval}&outputsize=${config.outputsize}`);

      return (data.values || [])
        .map((v) => ({
          timestamp: new Date(v.datetime).getTime(),
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: parseInt(v.volume) || 0,
        }))
        .reverse(); // Twelve Data returns newest first
    },

    async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
      // Twelve Data doesn't have a free profile endpoint — throw to fall through
      throw new Error('Company profile not available from Twelve Data free tier');
    },

    async getFinancials(_symbol: string): Promise<FinancialData> {
      throw new Error('Financials not available from Twelve Data free tier');
    },
  };
}
