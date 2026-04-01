import type { Quote, SearchResult, OHLCV, CompanyProfile, HistoricalRange } from './stock';
import type { EarningsEvent } from './earnings';
import type { NewsItem } from './news';
import type { FinancialData } from './financials';

export interface IStockProvider {
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  searchSymbols(query: string): Promise<SearchResult[]>;
  getHistoricalPrices(symbol: string, range: HistoricalRange): Promise<OHLCV[]>;
  getCompanyProfile(symbol: string): Promise<CompanyProfile>;
  getFinancials(symbol: string): Promise<FinancialData>;
}

export interface IMarketDataProvider {
  getCompanyNews(symbol: string, from: string, to: string): Promise<NewsItem[]>;
  getGeneralNews(): Promise<NewsItem[]>;
  getEarningsCalendar(from: string, to: string): Promise<EarningsEvent[]>;
}
