export interface AnnualFinancial {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
}

export interface QuarterlyEarning {
  date: string;
  quarter: string;
  epsActual: number | null;
  epsEstimate: number | null;
}

export interface FinancialMetrics {
  revenueGrowth?: number;
  earningsGrowth?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  debtToEquity?: number;
  currentRatio?: number;
  totalCash?: number;
  totalDebt?: number;
  freeCashflow?: number;
  ebitda?: number;
  revenuePerShare?: number;
}

export interface FinancialData {
  annualFinancials: AnnualFinancial[];
  quarterlyEarnings: QuarterlyEarning[];
  metrics: FinancialMetrics;
}
