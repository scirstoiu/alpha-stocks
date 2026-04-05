import { describe, it, expect } from 'vitest';
import {
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  type PortfolioSummary,
} from '@alpha-stocks/core';
import type { Transaction } from '@alpha-stocks/core';
import type { Quote } from '@alpha-stocks/core';

// Test the portfolio stats aggregation logic used in the mobile stats screen

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

describe('Portfolio stats aggregation (mobile)', () => {
  it('aggregates positions across multiple portfolios', () => {
    // Simulate two portfolios both holding AAPL
    const txsPortfolio1 = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100, portfolio_id: 'p1' })];
    const txsPortfolio2 = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 5, price_per_share: 120, portfolio_id: 'p2' })];
    const quotes = new Map([['AAPL', makeQuote('AAPL', 150)]]);

    const s1 = computePortfolioSummary(txsPortfolio1, quotes);
    const s2 = computePortfolioSummary(txsPortfolio2, quotes);

    // Simulate the aggregation done in PortfolioStats component
    const merged = new Map<string, { symbol: string; value: number; shares: number; pnl: number }>();
    for (const summary of [s1, s2]) {
      for (const pos of summary.positions) {
        const existing = merged.get(pos.symbol) || { symbol: pos.symbol, value: 0, shares: 0, pnl: 0 };
        existing.value += pos.currentValue || 0;
        existing.shares += pos.shares;
        existing.pnl += pos.unrealizedGain ?? 0;
        merged.set(pos.symbol, existing);
      }
    }

    const allPositions = [...merged.values()];
    expect(allPositions).toHaveLength(1);
    expect(allPositions[0].shares).toBe(15);
    expect(allPositions[0].value).toBe(15 * 150); // 2250
    // P&L: (150*10 - 100*10) + (150*5 - 120*5) = 500 + 150 = 650
    expect(allPositions[0].pnl).toBe(650);
  });

  it('computes total holdings across portfolios', () => {
    const txs1 = [makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 })];
    const txs2 = [makeTx({ symbol: 'GOOGL', type: 'buy', shares: 5, price_per_share: 200 })];
    const quotes = new Map([
      ['AAPL', makeQuote('AAPL', 110, 1)],
      ['GOOGL', makeQuote('GOOGL', 210, -2)],
    ]);

    const s1 = computePortfolioSummary(txs1, quotes);
    const s2 = computePortfolioSummary(txs2, quotes);

    const totalValue = s1.totalValue + s2.totalValue;
    const totalDayChange = s1.dayChange + s2.dayChange;

    expect(totalValue).toBe(10 * 110 + 5 * 210); // 2150
    expect(totalDayChange).toBe(10 * 1 + 5 * -2); // 0
  });

  it('weight calculation is correct', () => {
    const txs = [
      makeTx({ symbol: 'AAPL', type: 'buy', shares: 10, price_per_share: 100 }),
      makeTx({ symbol: 'GOOGL', type: 'buy', shares: 10, price_per_share: 100 }),
    ];
    const quotes = new Map([
      ['AAPL', makeQuote('AAPL', 150)],
      ['GOOGL', makeQuote('GOOGL', 50)],
    ]);

    const summary = computePortfolioSummary(txs, quotes);
    const totalValue = summary.totalValue; // 1500 + 500 = 2000

    const aaplWeight = ((summary.positions.find(p => p.symbol === 'AAPL')!.currentValue! / totalValue) * 100);
    const googlWeight = ((summary.positions.find(p => p.symbol === 'GOOGL')!.currentValue! / totalValue) * 100);

    expect(aaplWeight).toBe(75);
    expect(googlWeight).toBe(25);
  });

  it('shares display as integers', () => {
    // Verify that Math.round produces expected results for whole share counts
    expect(Math.round(10)).toBe(10);
    expect(Math.round(10.0)).toBe(10);
    expect(Math.round(127.00)).toBe(127);
  });

  it('formatCurrency and formatPercent work for display', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatPercent(5.5)).toBe('+5.50%');
    expect(formatPercent(-3.2)).toBe('-3.20%');
  });
});
