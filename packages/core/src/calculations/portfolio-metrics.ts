import type { Transaction, Position, PortfolioSummary } from '../types/portfolio';
import type { Quote } from '../types/stock';

export function computePositions(
  transactions: Transaction[],
  quotes: Map<string, Quote>,
): Position[] {
  const posMap = new Map<string, { shares: number; totalCost: number }>();

  for (const tx of transactions) {
    if (tx.type === 'dividend') continue;

    const current = posMap.get(tx.symbol) || { shares: 0, totalCost: 0 };

    if (tx.type === 'buy') {
      current.totalCost += tx.shares * tx.price_per_share + tx.fees;
      current.shares += tx.shares;
    } else if (tx.type === 'sell') {
      if (current.shares > 0) {
        const avgCost = current.totalCost / current.shares;
        current.totalCost -= tx.shares * avgCost;
        current.shares -= tx.shares;
      }
    }

    posMap.set(tx.symbol, current);
  }

  const positions: Position[] = [];
  for (const [symbol, pos] of posMap) {
    if (pos.shares <= 0) continue;

    const quote = quotes.get(symbol);
    const currentPrice = quote?.price;
    const currentValue = currentPrice != null ? currentPrice * pos.shares : undefined;
    const unrealizedGain = currentValue != null ? currentValue - pos.totalCost : undefined;
    const unrealizedGainPercent =
      unrealizedGain != null && pos.totalCost > 0
        ? (unrealizedGain / pos.totalCost) * 100
        : undefined;

    positions.push({
      symbol,
      shares: pos.shares,
      costBasis: pos.totalCost,
      averageCost: pos.totalCost / pos.shares,
      currentPrice,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent,
    });
  }

  return positions;
}

export function computeRealizedGains(transactions: Transaction[]): number {
  const holdings = new Map<string, { shares: number; totalCost: number }>();
  let realized = 0;

  for (const tx of transactions) {
    if (tx.type === 'dividend') continue;

    const current = holdings.get(tx.symbol) || { shares: 0, totalCost: 0 };

    if (tx.type === 'buy') {
      current.totalCost += tx.shares * tx.price_per_share + tx.fees;
      current.shares += tx.shares;
    } else if (tx.type === 'sell' && current.shares > 0) {
      const avgCost = current.totalCost / current.shares;
      const costOfSold = tx.shares * avgCost;
      const proceeds = tx.shares * tx.price_per_share - tx.fees;
      realized += proceeds - costOfSold;
      current.totalCost -= costOfSold;
      current.shares -= tx.shares;
    }

    holdings.set(tx.symbol, current);
  }

  return realized;
}

export function computeTotalDividends(transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.type === 'dividend')
    .reduce((sum, tx) => sum + tx.shares * tx.price_per_share, 0);
}

export function computePortfolioSummary(
  transactions: Transaction[],
  quotes: Map<string, Quote>,
): PortfolioSummary {
  const positions = computePositions(transactions, quotes);
  const totalValue = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalUnrealizedGain = totalValue - totalCostBasis;
  const totalUnrealizedGainPercent = totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0;
  const totalRealizedGain = computeRealizedGains(transactions);
  const totalDividends = computeTotalDividends(transactions);

  const dayChange = positions.reduce((sum, p) => {
    const quote = quotes.get(p.symbol);
    return sum + (quote ? quote.change * p.shares : 0);
  }, 0);
  const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

  return {
    totalValue,
    totalCostBasis,
    totalUnrealizedGain,
    totalUnrealizedGainPercent,
    totalRealizedGain,
    totalDividends,
    positions,
    dayChange,
    dayChangePercent,
  };
}
