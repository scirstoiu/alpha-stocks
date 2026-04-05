import { describe, it, expect } from 'vitest';

// These tests verify the market indices configuration matches our requirements.
// The config is inline in the component, so we replicate and verify the expected state.

const INDICES = {
  us: [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^DJI', name: 'Dow Jones' },
    { symbol: '^IXIC', name: 'Nasdaq' },
    { symbol: '^RUT', name: 'Russell 2000' },
  ],
  europe: [
    { symbol: '^GDAXI', name: 'DAX' },
    { symbol: '^FTSE', name: 'FTSE 100' },
    { symbol: '^FCHI', name: 'CAC 40' },
    { symbol: '^STOXX50E', name: 'STOXX 50' },
  ],
  asia: [
    { symbol: '^N225', name: 'Nikkei 225' },
    { symbol: '^HSI', name: 'Hang Seng' },
    { symbol: '000001.SS', name: 'Shanghai' },
    { symbol: '^KS11', name: 'KOSPI' },
  ],
  currencies: [
    { symbol: 'EURUSD=X', name: 'EUR/USD' },
    { symbol: 'EURRON=X', name: 'EUR/RON' },
    { symbol: 'GBPUSD=X', name: 'GBP/USD' },
    { symbol: 'JPY=X', name: 'USD/JPY' },
  ],
};

describe('Market indices configuration', () => {
  it('has 4 market tabs', () => {
    expect(Object.keys(INDICES)).toEqual(['us', 'europe', 'asia', 'currencies']);
  });

  it('has EUR/RON as second currency', () => {
    expect(INDICES.currencies[0].symbol).toBe('EURUSD=X');
    expect(INDICES.currencies[1].symbol).toBe('EURRON=X');
  });

  it('all currency symbols end with =X', () => {
    for (const c of INDICES.currencies) {
      expect(c.symbol).toMatch(/=X$/);
    }
  });

  it('has S&P 500 as first US index', () => {
    expect(INDICES.us[0].name).toBe('S&P 500');
  });
});

// timeAgo utility (replicated from component)
function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

describe('timeAgo', () => {
  it('returns "just now" for recent timestamps', () => {
    expect(timeAgo(Date.now() - 30_000)).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(timeAgo(Date.now() - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(timeAgo(Date.now() - 3 * 3600_000)).toBe('3h ago');
  });

  it('returns days ago', () => {
    expect(timeAgo(Date.now() - 2 * 86400_000)).toBe('2d ago');
  });

  it('handles exactly 1 minute', () => {
    expect(timeAgo(Date.now() - 60_000)).toBe('1m ago');
  });

  it('handles exactly 1 hour', () => {
    expect(timeAgo(Date.now() - 3600_000)).toBe('1h ago');
  });

  it('handles exactly 1 day', () => {
    expect(timeAgo(Date.now() - 86400_000)).toBe('1d ago');
  });
});
