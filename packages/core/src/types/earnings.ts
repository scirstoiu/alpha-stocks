export interface EarningsEvent {
  symbol: string;
  companyName?: string;
  date: string;
  hour: 'bmo' | 'amc' | 'dmh' | 'unknown';
  epsEstimate?: number;
  epsActual?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  quarter?: number;
  year?: number;
}
