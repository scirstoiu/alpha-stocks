import type { IStockProvider, IMarketDataProvider } from '../types/provider';
import { createYahooProvider } from './yahoo-provider';
import { createFinnhubStockProvider, createFinnhubMarketDataProvider } from './finnhub-provider';

/**
 * Creates a stock provider with yahoo as primary and finnhub as fallback.
 * Server-only — call this from Next.js API routes.
 */
export function createStockProvider(finnhubApiKey?: string): IStockProvider {
  const yahoo = createYahooProvider();
  const finnhub = finnhubApiKey ? createFinnhubStockProvider(finnhubApiKey) : null;

  function withFallback<T>(primary: () => Promise<T>, fallback: (() => Promise<T>) | null): Promise<T> {
    if (!fallback) return primary();
    return primary().catch((err) => {
      console.warn('Yahoo provider failed, falling back to Finnhub:', err.message);
      return fallback();
    });
  }

  return {
    getQuote: (symbol) =>
      withFallback(() => yahoo.getQuote(symbol), finnhub ? () => finnhub.getQuote(symbol) : null),
    getQuotes: (symbols) =>
      withFallback(() => yahoo.getQuotes(symbols), finnhub ? () => finnhub.getQuotes(symbols) : null),
    searchSymbols: (query) =>
      withFallback(() => yahoo.searchSymbols(query), finnhub ? () => finnhub.searchSymbols(query) : null),
    getHistoricalPrices: (symbol, range) =>
      withFallback(() => yahoo.getHistoricalPrices(symbol, range), finnhub ? () => finnhub.getHistoricalPrices(symbol, range) : null),
    getCompanyProfile: (symbol) =>
      withFallback(() => yahoo.getCompanyProfile(symbol), finnhub ? () => finnhub.getCompanyProfile(symbol) : null),
    getFinancials: (symbol) =>
      withFallback(() => yahoo.getFinancials(symbol), finnhub ? () => finnhub.getFinancials(symbol) : null),
  };
}

/**
 * Creates a market data provider (news + earnings) using Finnhub.
 */
export function createMarketDataProvider(finnhubApiKey: string): IMarketDataProvider {
  return createFinnhubMarketDataProvider(finnhubApiKey);
}
