/**
 * Yahoo Finance provider — server-only (yahoo-finance2 uses Node.js APIs).
 * This file is only imported in Next.js API routes, never in client bundles.
 */
import type { IStockProvider } from '../types/provider';
import type { Quote, SearchResult, OHLCV, CompanyProfile, HistoricalRange } from '../types/stock';
import type { NewsItem } from '../types/news';
import type { FinancialData } from '../types/financials';

let yfInstance: InstanceType<Awaited<ReturnType<typeof getYahooClass>>> | null = null;

async function getYahooClass() {
  const mod = await import('yahoo-finance2');
  return mod.default;
}

async function getYf() {
  if (!yfInstance) {
    const YahooFinance = await getYahooClass();
    yfInstance = new YahooFinance();
  }
  return yfInstance;
}

function rangeToParams(range: HistoricalRange): { period1: Date; interval: string } {
  const now = new Date();
  const intervals: Record<HistoricalRange, { months: number; interval: string }> = {
    '1D': { months: 0, interval: '5m' },
    '5D': { months: 0, interval: '15m' },
    '1M': { months: 1, interval: '1d' },
    '3M': { months: 3, interval: '1d' },
    '6M': { months: 6, interval: '1d' },
    YTD: { months: 0, interval: '1d' },
    '1Y': { months: 12, interval: '1d' },
    '2Y': { months: 24, interval: '1wk' },
    '5Y': { months: 60, interval: '1wk' },
    ALL: { months: 0, interval: '1mo' },
  };

  const config = intervals[range];
  let period1: Date;

  if (range === '1D') {
    period1 = new Date(now);
    period1.setDate(period1.getDate() - 1);
  } else if (range === '5D') {
    period1 = new Date(now);
    period1.setDate(period1.getDate() - 5);
  } else if (range === 'YTD') {
    period1 = new Date(now.getFullYear(), 0, 1);
  } else if (range === 'ALL') {
    period1 = new Date(1970, 0, 1);
  } else {
    period1 = new Date(now);
    period1.setMonth(period1.getMonth() - config.months);
  }

  return { period1, interval: config.interval };
}

export function createYahooProvider(): IStockProvider {
  return {
    async getQuote(symbol: string): Promise<Quote> {
      const yf = await getYf();
      const result = await yf.quote(symbol);
      return {
        symbol: result.symbol,
        name: result.shortName || result.longName || result.symbol,
        price: result.regularMarketPrice ?? 0,
        change: result.regularMarketChange ?? 0,
        changePercent: result.regularMarketChangePercent ?? 0,
        open: result.regularMarketOpen ?? 0,
        high: result.regularMarketDayHigh ?? 0,
        low: result.regularMarketDayLow ?? 0,
        previousClose: result.regularMarketPreviousClose ?? 0,
        volume: result.regularMarketVolume ?? 0,
        marketCap: result.marketCap,
        exchange: result.exchange,
        currency: result.currency,
        preMarketPrice: (result as Record<string, unknown>).preMarketPrice as number | undefined,
        preMarketChange: (result as Record<string, unknown>).preMarketChange as number | undefined,
        preMarketChangePercent: (result as Record<string, unknown>).preMarketChangePercent as number | undefined,
        postMarketPrice: (result as Record<string, unknown>).postMarketPrice as number | undefined,
        postMarketChange: (result as Record<string, unknown>).postMarketChange as number | undefined,
        postMarketChangePercent: (result as Record<string, unknown>).postMarketChangePercent as number | undefined,
        fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.fiftyTwoWeekLow,
        trailingPE: result.trailingPE,
        epsTrailingTwelveMonths: result.epsTrailingTwelveMonths,
        priceToBook: result.priceToBook,
        earningsTimestamp: result.earningsTimestamp ? new Date(result.earningsTimestamp as unknown as string | number).getTime() : undefined,
        fullTimeEmployees: (result as Record<string, unknown>).fullTimeEmployees as number | undefined,
        updatedAt: Date.now(),
      };
    },

    async getQuotes(symbols: string[]): Promise<Quote[]> {
      return Promise.all(symbols.map((s) => this.getQuote(s)));
    },

    async searchSymbols(query: string): Promise<SearchResult[]> {
      const yf = await getYf();
      const result = await yf.search(query);
      return (result.quotes || [])
        .filter((q: Record<string, unknown>) => q.symbol && q.isYahooFinance)
        .slice(0, 10)
        .map((q: Record<string, unknown>) => ({
          symbol: q.symbol as string,
          name: (q.shortname || q.longname || q.symbol) as string,
          type: (q.quoteType || 'Unknown') as string,
          exchange: (q.exchange || '') as string,
          currency: q.currency as string | undefined,
        }));
    },

    async getHistoricalPrices(symbol: string, range: HistoricalRange): Promise<OHLCV[]> {
      const yf = await getYf();
      const { period1, interval } = rangeToParams(range);
      const result = await yf.chart(symbol, {
        period1,
        interval: interval as '1d' | '1wk' | '1mo',
      });

      return (result.quotes || []).map((q) => ({
        timestamp: new Date(q.date).getTime(),
        open: q.open ?? 0,
        high: q.high ?? 0,
        low: q.low ?? 0,
        close: q.close ?? 0,
        volume: q.volume ?? 0,
      }));
    },

    async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
      const yf = await getYf();
      const result = await yf.quoteSummary(symbol, {
        modules: ['assetProfile', 'price'],
      });

      const profile = result.assetProfile;
      const price = result.price;

      return {
        symbol,
        name: price?.shortName || price?.longName || symbol,
        description: profile?.longBusinessSummary || '',
        sector: profile?.sector || '',
        industry: profile?.industry || '',
        website: profile?.website || '',
        logo: undefined,
        marketCap: price?.marketCap ?? 0,
        employees: profile?.fullTimeEmployees,
        exchange: price?.exchange || '',
        country: profile?.country || '',
      };
    },

    async getFinancials(symbol: string): Promise<FinancialData> {
      const yf = await getYf();
      const result = await yf.quoteSummary(symbol, {
        modules: ['incomeStatementHistory', 'earnings', 'financialData'],
      });

      const income = result.incomeStatementHistory?.incomeStatementHistory || [];
      const annualFinancials = income.map((stmt) => ({
        date: stmt.endDate ? new Date(stmt.endDate as unknown as string | number).toISOString().split('T')[0] : '',
        revenue: (stmt as unknown as Record<string, number>).totalRevenue ?? 0,
        grossProfit: (stmt as unknown as Record<string, number>).grossProfit ?? 0,
        operatingIncome: (stmt as unknown as Record<string, number>).operatingIncome ?? 0,
        netIncome: (stmt as unknown as Record<string, number>).netIncome ?? 0,
      })).reverse();

      const earningsData = result.earnings;
      const quarterlyEarnings = (earningsData?.earningsChart?.quarterly || []).map(
        (q) => ({
          date: (q as unknown as Record<string, string>).date || '',
          quarter: (q as unknown as Record<string, string>).date || '',
          epsActual: typeof q.actual === 'number' ? q.actual : (q.actual as unknown as Record<string, number>)?.raw ?? null,
          epsEstimate: typeof q.estimate === 'number' ? q.estimate : (q.estimate as unknown as Record<string, number>)?.raw ?? null,
        }),
      );

      const fd = result.financialData || {};
      const raw = (key: string) => {
        const val = (fd as unknown as Record<string, unknown>)[key];
        if (val == null) return undefined;
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null && 'raw' in (val as Record<string, unknown>)) {
          return (val as Record<string, unknown>).raw as number;
        }
        return undefined;
      };

      return {
        annualFinancials,
        quarterlyEarnings,
        metrics: {
          revenueGrowth: raw('revenueGrowth'),
          earningsGrowth: raw('earningsGrowth'),
          grossMargins: raw('grossMargins'),
          operatingMargins: raw('operatingMargins'),
          profitMargins: raw('profitMargins'),
          returnOnEquity: raw('returnOnEquity'),
          returnOnAssets: raw('returnOnAssets'),
          debtToEquity: raw('debtToEquity'),
          currentRatio: raw('currentRatio'),
          totalCash: raw('totalCash'),
          totalDebt: raw('totalDebt'),
          freeCashflow: raw('freeCashflow'),
          ebitda: raw('ebitda'),
          revenuePerShare: raw('revenuePerShare'),
        },
      };
    },

  };
}

export async function getYahooNews(symbol: string): Promise<NewsItem[]> {
  const yf = await getYf();
  try {
    const result = await yf.search(symbol, { newsCount: 20, quotesCount: 0 });
    return (result.news || []).map((n) => ({
      id: `yahoo-${n.uuid}`,
      headline: n.title,
      summary: '',
      source: n.publisher,
      url: n.link,
      imageUrl: n.thumbnail?.resolutions?.[0]?.url,
      publishedAt: new Date(n.providerPublishTime).getTime(),
      relatedSymbols: n.relatedTickers,
    }));
  } catch {
    return [];
  }
}
