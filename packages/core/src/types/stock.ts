export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  exchange?: string;
  currency?: string;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  updatedAt: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  currency?: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  website: string;
  logo?: string;
  marketCap: number;
  employees?: number;
  exchange: string;
  country: string;
}

export type HistoricalRange = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y' | '5Y';
export type ChartInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo';
