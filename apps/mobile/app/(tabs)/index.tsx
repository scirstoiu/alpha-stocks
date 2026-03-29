import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import StockSearch from '../../components/stocks/StockSearch';
import StockLogo from '../../components/stocks/StockLogo';
import {
  useWatchlists,
  useStockQuotes,
  useNews,
  formatCurrency,
  formatPercent,
} from '@alpha-stocks/core';

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
  const { data: watchlists } = useWatchlists();
  const { data: news } = useNews();

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

  return (
    <ScrollView style={styles.container}>
      <StockSearch />

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

      {/* Latest news */}
      {news && news.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Latest News</Text>
          {news.slice(0, 4).map((n) => (
            <View key={n.id} style={styles.newsRow}>
              <Text style={styles.newsHeadline} numberOfLines={2}>{n.headline}</Text>
              <Text style={styles.newsMeta}>{n.source} · {timeAgo(n.publishedAt)}</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  symbol: { fontWeight: '600', fontSize: 14 },
  name: { fontSize: 11, color: '#6b7280', marginTop: 2, maxWidth: 180 },
  price: { fontWeight: '600', fontSize: 14 },
  change: { fontSize: 11, marginTop: 2 },
  newsRow: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  newsHeadline: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  newsMeta: { fontSize: 11, color: '#9ca3af' },
});
