import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatCompactNumber, formatDate } from '../helpers';

describe('formatCurrency', () => {
  it('formats positive USD values', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative values', () => {
    expect(formatCurrency(-500.1)).toBe('-$500.10');
  });

  it('formats large values with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(99.999)).toBe('$100.00');
  });

  it('accepts a different currency', () => {
    const result = formatCurrency(100, 'EUR');
    expect(result).toContain('100');
  });
});

describe('formatPercent', () => {
  it('formats positive percent with + sign', () => {
    expect(formatPercent(5.5)).toBe('+5.50%');
  });

  it('formats negative percent', () => {
    expect(formatPercent(-3.14)).toBe('-3.14%');
  });

  it('formats zero with + sign', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatPercent(1.999)).toBe('+2.00%');
  });
});

describe('formatCompactNumber', () => {
  it('formats thousands', () => {
    const result = formatCompactNumber(1500);
    expect(result).toMatch(/1\.5K/i);
  });

  it('formats millions', () => {
    const result = formatCompactNumber(2500000);
    expect(result).toMatch(/2\.5M/i);
  });

  it('formats billions', () => {
    const result = formatCompactNumber(1200000000);
    expect(result).toMatch(/1\.2B/i);
  });

  it('formats small numbers as-is', () => {
    expect(formatCompactNumber(42)).toBe('42');
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2024-03-15');
    expect(result).toBe('Mar 15, 2024');
  });

  it('formats another date', () => {
    const result = formatDate('2023-12-01');
    expect(result).toBe('Dec 1, 2023');
  });
});
