import type { Quote, SearchResult, OHLCV, CompanyProfile, HistoricalRange } from '../types/stock';
import type { NewsItem } from '../types/news';
import type { EarningsEvent } from '../types/earnings';
import type { FinancialData } from '../types/financials';
import * as endpoints from './endpoints';

export interface ApiClient {
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  searchSymbols(query: string): Promise<SearchResult[]>;
  getHistoricalPrices(symbol: string, range: HistoricalRange): Promise<OHLCV[]>;
  getCompanyProfile(symbol: string): Promise<CompanyProfile>;
  getFinancials(symbol: string): Promise<FinancialData>;
  getNews(symbol?: string): Promise<NewsItem[]>;
  getEarningsCalendar(from: string, to: string): Promise<EarningsEvent[]>;
  getStockLogo(symbol: string): Promise<string | null>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function createApiClient(baseUrl: string): ApiClient {
  return {
    getQuote: (symbol) => fetchJson<Quote>(endpoints.quoteUrl(baseUrl, symbol)),
    getQuotes: (symbols) => fetchJson<Quote[]>(endpoints.quotesUrl(baseUrl, symbols)),
    searchSymbols: (query) => fetchJson<SearchResult[]>(endpoints.searchUrl(baseUrl, query)),
    getHistoricalPrices: (symbol, range) =>
      fetchJson<OHLCV[]>(endpoints.historicalUrl(baseUrl, symbol, range)),
    getCompanyProfile: (symbol) =>
      fetchJson<CompanyProfile>(endpoints.profileUrl(baseUrl, symbol)),
    getFinancials: (symbol) =>
      fetchJson<FinancialData>(endpoints.financialsUrl(baseUrl, symbol)),
    getNews: (symbol) => fetchJson<NewsItem[]>(endpoints.newsUrl(baseUrl, symbol)),
    getEarningsCalendar: (from, to) =>
      fetchJson<EarningsEvent[]>(endpoints.earningsUrl(baseUrl, from, to)),
    getStockLogo: (symbol) =>
      fetchJson<{ logo: string | null }>(endpoints.logoUrl(baseUrl, symbol)).then((r) => r.logo),
  };
}
