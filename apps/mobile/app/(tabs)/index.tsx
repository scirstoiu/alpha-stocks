import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import StockLogo from '../../components/stocks/StockLogo';
import {
  useWatchlists,
  usePortfolios,
  useTransactions,
  useStockQuotes,
  useNews,
  formatCurrency,
  formatPercent,
} from '@alpha-stocks/core';

type MarketTab = 'us' | 'europe' | 'asia' | 'currencies';

const INDICES: Record<MarketTab, { symbol: string; name: string }[]> = {
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

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: watchlists } = useWatchlists();
  const { data: portfolios } = usePortfolios();
  const firstPortfolioId = portfolios?.[0]?.id || '';
  const { data: transactions } = useTransactions(firstPortfolioId);
  const [refreshing, setRefreshing] = useState(false);
  const [marketTab, setMarketTab] = useState<MarketTab>('us');

  // Collect all symbols from watchlists + portfolio
  const allMySymbols = useMemo(() => {
    const s = new Set<string>();
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.add(i.symbol)));
    transactions?.forEach((t) => s.add(t.symbol));
    return [...s];
  }, [watchlists, transactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  // Market indices
  const indexSymbols = INDICES[marketTab].map((i) => i.symbol);
  const { data: indexQuotes } = useStockQuotes(indexSymbols);
  const indexMap = useMemo(() => new Map(indexQuotes?.map((q) => [q.symbol, q])), [indexQuotes]);

  // Top movers
  const allSymbols = useMemo(() => {
    const s: string[] = [];
    watchlists?.forEach((wl) => wl.items?.forEach((i) => s.push(i.symbol)));
    return [...new Set(s)].slice(0, 15);
  }, [watchlists]);

  const { data: wlQuotes } = useStockQuotes(allSymbols);

  const topMovers = useMemo(() => {
    if (!wlQuotes) return [];
    return [...wlQuotes].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5);
  }, [wlQuotes]);

  // News: fetch for top 3 symbols by portfolio weight
  const { data: myQuotes } = useStockQuotes(allMySymbols);
  const symbolsByWeight = useMemo(() => {
    if (!myQuotes || !transactions) return allMySymbols.slice(0, 3);
    const holdings = new Map<string, number>();
    for (const tx of transactions) {
      const cur = holdings.get(tx.symbol) || 0;
      if (tx.type === 'buy') holdings.set(tx.symbol, cur + tx.shares);
      else if (tx.type === 'sell') holdings.set(tx.symbol, cur - tx.shares);
    }
    const quoteMap = new Map(myQuotes.map((q) => [q.symbol, q]));
    return [...allMySymbols].sort((a, b) => {
      const va = (holdings.get(a) || 0) * (quoteMap.get(a)?.price || 0);
      const vb = (holdings.get(b) || 0) * (quoteMap.get(b)?.price || 0);
      return vb - va;
    }).slice(0, 3);
  }, [allMySymbols, myQuotes, transactions]);

  const { data: news1 } = useNews(symbolsByWeight[0]);
  const { data: news2 } = useNews(symbolsByWeight[1]);
  const { data: news3 } = useNews(symbolsByWeight[2]);

  const newsItems = useMemo(() => {
    const seen = new Set<string>();
    const merged = [];
    for (const n of [...(news1 || []), ...(news2 || []), ...(news3 || [])]) {
      const key = n.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n);
    }
    return merged.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 15);
  }, [news1, news2, news3]);

  const tabs: { key: MarketTab; label: string }[] = [
    { key: 'us', label: 'US' },
    { key: 'europe', label: 'Europe' },
    { key: 'asia', label: 'Asia' },
    { key: 'currencies', label: 'FX' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      {/* Market indices */}
      <View style={styles.section}>
        <View style={styles.tabRow}>
          <Text style={styles.sectionLabel}>Markets</Text>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setMarketTab(t.key)}
              style={[styles.tab, marketTab === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, marketTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {INDICES[marketTab].map((idx) => {
            const q = indexMap.get(idx.symbol);
            const pos = (q?.change ?? 0) >= 0;
            return (
              <TouchableOpacity key={idx.symbol} style={styles.indexCard} onPress={() => router.push(`/stocks/${idx.symbol}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.arrowBox, { backgroundColor: pos ? '#f0fdf4' : '#fef2f2' }]}>
                    <Text style={{ fontSize: 16, color: pos ? '#16a34a' : '#dc2626' }}>{pos ? '↑' : '↓'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.indexName} numberOfLines={1}>{idx.name}</Text>
                    <Text style={styles.indexPrice}>
                      {q ? q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.indexPct, { color: pos ? '#16a34a' : '#dc2626' }]}>
                      {q ? formatPercent(q.changePercent) : '—'}
                    </Text>
                    <Text style={[styles.indexChange, { color: pos ? '#16a34a' : '#dc2626' }]}>
                      {q ? `${pos ? '+' : ''}${q.change.toFixed(2)}` : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Top movers */}
      {topMovers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Top Movers</Text>
          {topMovers.map((q) => (
            <TouchableOpacity key={q.symbol} style={styles.row} onPress={() => router.push(`/stocks/${q.symbol}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <StockLogo symbol={q.symbol} size={32} />
                <View>
                  <Text style={styles.symbol}>{q.symbol}</Text>
                  <Text style={styles.name} numberOfLines={1}>{q.name}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.price}>{formatCurrency(q.price)}</Text>
                <Text style={[styles.change, { color: q.change >= 0 ? '#16a34a' : '#dc2626' }]}>
                  {formatPercent(q.changePercent)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* News for your stocks */}
      {newsItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>News for your stocks</Text>
          {newsItems.map((n) => (
            <View key={n.id} style={styles.newsRow}>
              <Text style={styles.newsHeadline} numberOfLines={2}>{n.headline}</Text>
              <View style={styles.newsMetaRow}>
                <Text style={styles.newsSource}>{n.source}</Text>
                <Text style={styles.newsMeta}> · {timeAgo(n.publishedAt)}</Text>
                {n.relatedSymbols && n.relatedSymbols.length > 0 && (
                  <Text style={styles.newsTickers}> · {n.relatedSymbols.slice(0, 3).join(', ')}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: '#f9fafb' },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tab: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tabActive: { backgroundColor: 'rgba(37,99,235,0.1)' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#2563eb' },
  indexCard: { width: 200, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginRight: 10 },
  arrowBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const },
  indexName: { fontSize: 15, fontWeight: '600' },
  indexPrice: { fontSize: 15, color: '#6b7280', marginTop: 1 },
  indexPct: { fontSize: 15, fontWeight: '500' },
  indexChange: { fontSize: 14, marginTop: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  symbol: { fontWeight: '600', fontSize: 15 },
  name: { fontSize: 12, color: '#6b7280', marginTop: 2, maxWidth: 180 },
  price: { fontWeight: '600', fontSize: 15 },
  change: { fontSize: 13, marginTop: 2 },
  newsRow: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  newsHeadline: { fontSize: 14, fontWeight: '600', marginBottom: 5, lineHeight: 20 },
  newsMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  newsSource: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  newsMeta: { fontSize: 12, color: '#9ca3af' },
  newsTickers: { fontSize: 12, color: '#9ca3af' },
});
