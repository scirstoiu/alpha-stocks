export type TransactionType = 'buy' | 'sell' | 'dividend';

export interface Transaction {
  id: string;
  portfolio_id: string;
  symbol: string;
  type: TransactionType;
  shares: number;
  price_per_share: number;
  fees: number;
  date: string;
  notes?: string;
  created_at: string;
}

export interface Position {
  symbol: string;
  shares: number;
  costBasis: number;
  averageCost: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedGain?: number;
  unrealizedGainPercent?: number;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedGain: number;
  totalUnrealizedGainPercent: number;
  totalRealizedGain: number;
  totalDividends: number;
  positions: Position[];
  dayChange: number;
  dayChangePercent: number;
}
