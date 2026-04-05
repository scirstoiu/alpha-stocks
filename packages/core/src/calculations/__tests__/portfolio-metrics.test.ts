import { describe, it, expect } from 'vitest';
import {
  computePositions,
  computeRealizedGains,
  computeTotalDividends,
  computePortfolioSummary,
} from '../portfolio-metrics';
import type { Transaction } from '../../types/portfolio';
import type { Quote } from '../../types/stock';

// --- Helpers ---

function makeTx(overrides: Partial<Transaction> & Pick<Transaction, 'symbol' | 'type' | 'shares' | 'price_per_share'>): Transaction {
  return {
    id: Math.random().toString(),
    portfolio_id: 'p1',
    fees: 0,
    date: '2024-01-15',
    created_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

function makeQuote(symbol: string, price: number, change = 0): Quote {
  return {
    symbol,
    name: symbol,
    price,
    change,
    changePercent: price > 0 ? (change / (price - change)) * 100 : 0,
    open: price,
    high: price,
    low: price,
    previousClose: price - change,
    volume: 1000,
    updatedAt: Date.now(),
  };
}

// --- computePositions ---

describe('computePositions', () => {
  it('computes a single buy position', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 150 })];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 160)]]);
    const positions = computePositions(txs, quotes);

    expect(positions).toHaveLength(1);
    expect(positions[0].symbol).toBe('AAPL');
    expect(positions[0].shares).toBe(10);
    expect(positions[0].averageCost).toBe(150);
    expect(positions[0].costBasis).toBe(1500);
    expect(positions[0].currentPrice).toBe(160);
    expect(positions[0].currentValue).toBe(1600);
    expect(positions[0].unrealizedGain).toBe(100);
  });

  it('computes average cost across multiple buys', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 200 }),
    ];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 150)]]);
    const positions = computePositions(txs, quotes);

    expect(positions[0].shares).toBe(20);
    expect(positions[0].averageCost).toBe(150);
    expect(positions[0].costBasis).toBe(3000);
  });

  it('handles partial sell correctly', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 20, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 120 }),
    ];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 130)]]);
    const positions = computePositions(txs, quotes);

    expect(positions[0].shares).toBe(10);
    expect(positions[0].averageCost).toBe(100);
    expect(positions[0].costBasis).toBe(1000);
    expect(positions[0].currentValue).toBe(1300);
    expect(positions[0].unrealizedGain).toBe(300);
  });

  it('excludes fully sold positions', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 120 }),
    ];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 130)]]);
    const positions = computePositions(txs, quotes);

    expect(positions).toHaveLength(0);
  });

  it('handles multiple symbols', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 150 }),
      makeTx({ symbol: 'GOOGL', type: 'buy', shares: 5, price_per_share: 2800 }),
    ];
    const quotes = new Map([
      ['AAPL', makeQuote('AAPL', 160)],
      ['GOOGL', makeQuote('GOOGL', 2900)],
    ]);
    const positions = computePositions(txs, quotes);

    expect(positions).toHaveLength(2);
    const aapl = positions.find((p) => p.symbol === 'AAPL')!;
    const googl = positions.find((p) => p.symbol === 'GOOGL')!;
    expect(aapl.shares).toBe(10);
    expect(googl.shares).toBe(5);
  });

  it('includes fees in cost basis', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100, fees: 10 })];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 100)]]);
    const positions = computePositions(txs, quotes);

    expect(positions[0].costBasis).toBe(1010);
    expect(positions[0].averageCost).toBe(101);
  });

  it('ignores dividend transactions for position calculation', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'dividend', shares: 10, price_per_share: 0.5 }),
    ];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 110)]]);
    const positions = computePositions(txs, quotes);

    expect(positions[0].shares).toBe(10);
    expect(positions[0].costBasis).toBe(1000);
  });

  it('handles missing quote gracefully', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 })];
    const quotes = new Map<string, Quote>();
    const positions = computePositions(txs, quotes);

    expect(positions[0].shares).toBe(10);
    expect(positions[0].currentPrice).toBeUndefined();
    expect(positions[0].currentValue).toBeUndefined();
    expect(positions[0].unrealizedGain).toBeUndefined();
  });

  it('computes day change from quote', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 })];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 105, 2)]]);
    const positions = computePositions(txs, quotes);

    expect(positions[0].dayChange).toBe(20); // 2 * 10 shares
  });
});

// --- computeRealizedGains ---

describe('computeRealizedGains', () => {
  it('returns 0 with no sells', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 })];
    expect(computeRealizedGains(txs)).toBe(0);
  });

  it('computes gain on profitable sell', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 120 }),
    ];
    // Gain = (10 * 120) - (10 * 100) = 200
    expect(computeRealizedGains(txs)).toBe(200);
  });

  it('computes loss on unprofitable sell', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 80 }),
    ];
    expect(computeRealizedGains(txs)).toBe(-200);
  });

  it('computes partial sell gain', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 20, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 150 }),
    ];
    // Gain = (10 * 150) - (10 * 100) = 500
    expect(computeRealizedGains(txs)).toBe(500);
  });

  it('accounts for fees on sell', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 120, fees: 5 }),
    ];
    // Proceeds = 10*120 - 5 = 1195, cost = 1000, gain = 195
    expect(computeRealizedGains(txs)).toBe(195);
  });

  it('accounts for fees on buy affecting avg cost', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100, fees: 50 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 120 }),
    ];
    // Cost basis = 1050, proceeds = 1200, gain = 150
    expect(computeRealizedGains(txs)).toBe(150);
  });

  it('handles multiple symbols independently', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'GOOGL', type: 'buy', shares: 5, price_per_share: 200 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 110 }),
      makeTx({ symbol: 'GOOGL', type: 'sell', shares: 5, price_per_share: 180 }),
    ];
    // AAPL gain = 100, GOOGL loss = -100, total = 0
    expect(computeRealizedGains(txs)).toBe(0);
  });
});

// --- computeTotalDividends ---

describe('computeTotalDividends', () => {
  it('returns 0 with no dividends', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 })];
    expect(computeTotalDividends(txs)).toBe(0);
  });

  it('sums dividend payments', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'dividend', shares: 10, price_per_share: 0.5 }),
      makeTx({ symbol: 'AAPL', type: 'dividend', shares: 10, price_per_share: 0.6 }),
    ];
    expect(computeTotalDividends(txs)).toBeCloseTo(11);
  });

  it('ignores buy/sell transactions', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 5, price_per_share: 120 }),
      makeTx({ symbol: 'AAPL', type: 'dividend', shares: 10, price_per_share: 1 }),
    ];
    expect(computeTotalDividends(txs)).toBe(10);
  });
});

// --- computePortfolioSummary ---

describe('computePortfolioSummary', () => {
  it('computes full summary for a simple portfolio', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'GOOGL', type: 'buy', shares: 5, price_per_share: 200 }),
    ];
    const quotes = new Map([
      ['AAPL', makeQuote('AAPL', 120, 2)],
      ['GOOGL', makeQuote('GOOGL', 220, -5)],
    ]);

    const summary = computePortfolioSummary(txs, quotes);

    expect(summary.totalValue).toBe(10 * 120 + 5 * 220); // 2300
    expect(summary.totalCostBasis).toBe(10 * 100 + 5 * 200); // 2000
    expect(summary.totalUnrealizedGain).toBe(300);
    expect(summary.totalRealizedGain).toBe(0);
    expect(summary.totalDividends).toBe(0);
    expect(summary.positions).toHaveLength(2);
    expect(summary.dayChange).toBe(10 * 2 + 5 * -5); // -5
  });

  it('includes realized gains and dividends', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 20, price_per_share: 100 }),
      makeTx({ symbol: 'AAPL', type: 'sell', shares: 10, price_per_share: 130 }),
      makeTx({ symbol: 'AAPL', type: 'dividend', shares: 10, price_per_share: 2 }),
    ];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 140)]]);

    const summary = computePortfolioSummary(txs, quotes);

    expect(summary.positions).toHaveLength(1);
    expect(summary.positions[0].shares).toBe(10);
    expect(summary.totalValue).toBe(1400);
    expect(summary.totalRealizedGain).toBe(300); // sold 10 @ 130, cost 100
    expect(summary.totalDividends).toBe(20);
  });

  it('handles empty transactions', () => {
    const summary = computePortfolioSummary([], new Map());

    expect(summary.totalValue).toBe(0);
    expect(summary.totalCostBasis).toBe(0);
    expect(summary.positions).toHaveLength(0);
    expect(summary.dayChange).toBe(0);
  });

  it('computes unrealized gain percent correctly', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 })];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 150)]]);

    const summary = computePortfolioSummary(txs, quotes);

    expect(summary.totalUnrealizedGainPercent).toBe(50); // (500/1000)*100
  });

  it('computes day change percent correctly', () => {
    const txs = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 100, price_per_share: 100 })];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 102, 2)]]);

    const summary = computePortfolioSummary(txs, quotes);

    expect(summary.dayChange).toBe(200);
    // dayChangePercent = dayChange / (totalValue - dayChange) * 100
    // = 200 / (10200 - 200) * 100 = 2%
    expect(summary.dayChangePercent).toBe(2);
  });
});
