// Types
export type { Quote, OHLCV, SearchResult, CompanyProfile, HistoricalRange, ChartInterval } from './types/stock';
export type { Portfolio, Position, Transaction, PortfolioSummary, TransactionType } from './types/portfolio';
export type { Watchlist, WatchlistItem } from './types/watchlist';
export type { EarningsEvent } from './types/earnings';
export type { NewsItem } from './types/news';
export type { FinancialData, AnnualFinancial, QuarterlyEarning, FinancialMetrics } from './types/financials';
export type { IStockProvider, IMarketDataProvider } from './types/provider';

// API client
export { createApiClient, type ApiClient } from './api/client';
export { ApiClientContext, useApiClient } from './hooks/use-api-client';

// Supabase
export { SupabaseContext, useSupabase } from './hooks/use-supabase';

// Auth
export { AuthContext, useAuth, type AuthContext as AuthContextType } from './hooks/use-auth';

// Market data hooks
export { useStockQuote, useStockQuotes } from './hooks/use-stock-quote';
export { useStockSearch } from './hooks/use-stock-search';
export { useStockLogo } from './hooks/use-stock-logo';
export { useHistoricalPrices } from './hooks/use-historical-prices';

// Earnings, News & Financials hooks
export { useEarningsCalendar } from './hooks/use-earnings-calendar';
export { useNews } from './hooks/use-news';
export { useFinancials } from './hooks/use-financials';

// Watchlist hooks
export { useWatchlists, useWatchlist, useCreateWatchlist, useDeleteWatchlist, useAddWatchlistItem, useRemoveWatchlistItem, useReorderWatchlistItems } from './hooks/use-watchlists';

// Portfolio hooks
export { usePortfolios, usePortfolio, useTransactions, useCreatePortfolio, useDeletePortfolio, useAddTransaction, useDeleteTransaction, useReorderPortfolios, useBulkAddTransactions } from './hooks/use-portfolios';

// Calculations
export { computePositions, computePortfolioSummary, computeRealizedGains, computeTotalDividends } from './calculations/portfolio-metrics';
export { formatCurrency, formatPercent, formatCompactNumber, formatDate } from './calculations/helpers';
