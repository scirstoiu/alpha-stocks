import type { IStockProvider, IMarketDataProvider } from '../types/provider';
import { createYahooProvider } from './yahoo-provider';
import { createFinnhubStockProvider, createFinnhubMarketDataProvider } from './finnhub-provider';
import { createTwelveDataProvider } from './twelve-data-provider';

/**
 * Creates a stock provider with fallback chain: Yahoo → Twelve Data → Finnhub.
 * Server-only — call this from Next.js API routes.
 */
export function createStockProvider(finnhubApiKey?: string, twelveDataApiKey?: string): IStockProvider {
  const yahoo = createYahooProvider();
  const twelveData = twelveDataApiKey ? createTwelveDataProvider(twelveDataApiKey) : null;
  const finnhub = finnhubApiKey ? createFinnhubStockProvider(finnhubApiKey) : null;

  function withFallbackChain<T>(...fns: ((() => Promise<T>) | null)[]): Promise<T> {
    const valid = fns.filter(Boolean) as (() => Promise<T>)[];
    if (valid.length === 0) return Promise.reject(new Error('No providers available'));
    return valid.reduce((chain, fn, i) =>
      chain.catch((err) => {
        if (i > 0) console.warn(`Provider ${i} failed, trying next:`, err.message);
        return fn();
      }),
    valid[0]().catch((err) => { console.warn('Primary provider failed:', err.message); throw err; }));
  }

  return {
    getQuote: (symbol) =>
      withFallbackChain(
        () => yahoo.getQuote(symbol),
        twelveData ? () => twelveData.getQuote(symbol) : null,
        finnhub ? () => finnhub.getQuote(symbol) : null,
      ),
    getQuotes: (symbols) =>
      withFallbackChain(
        () => yahoo.getQuotes(symbols),
        twelveData ? () => twelveData.getQuotes(symbols) : null,
        finnhub ? () => finnhub.getQuotes(symbols) : null,
      ),
    searchSymbols: (query) =>
      withFallbackChain(
        () => yahoo.searchSymbols(query),
        twelveData ? () => twelveData.searchSymbols(query) : null,
        finnhub ? () => finnhub.searchSymbols(query) : null,
      ),
    getHistoricalPrices: (symbol, range) =>
      withFallbackChain(
        () => yahoo.getHistoricalPrices(symbol, range),
        twelveData ? () => twelveData.getHistoricalPrices(symbol, range) : null,
        finnhub ? () => finnhub.getHistoricalPrices(symbol, range) : null,
      ),
    getCompanyProfile: (symbol) =>
      withFallbackChain(
        () => yahoo.getCompanyProfile(symbol),
        finnhub ? () => finnhub.getCompanyProfile(symbol) : null,
      ),
    getFinancials: (symbol) =>
      withFallbackChain(
        () => yahoo.getFinancials(symbol),
      ),
  };
}

/**
 * Creates a market data provider (news + earnings) using Finnhub.
 */
export function createMarketDataProvider(finnhubApiKey: string): IMarketDataProvider {
  return createFinnhubMarketDataProvider(finnhubApiKey);
}
