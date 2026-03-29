import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  usePortfolio,
  usePortfolios,
  useTransactions,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  formatDate,
} from '@alpha-stocks/core';
import StockLogo from '../../components/stocks/StockLogo';

export default function PortfolioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: portfolio } = usePortfolio(id || '');
  const { data: portfolios } = usePortfolios();

  // Swipe left/right to navigate between portfolios
  const swipeHandled = useRef(false);
  const flingLeft = Gesture.Fling()
    .direction(1) // right = go to previous
    .onEnd(() => {
      if (swipeHandled.current || !portfolios || !id) return;
      const idx = portfolios.findIndex((p) => p.id === id);
      if (idx > 0) {
        swipeHandled.current = true;
        router.replace(`/portfolio/${portfolios[idx - 1].id}` as never);
        setTimeout(() => { swipeHandled.current = false; }, 500);
      }
    })
    .runOnJS(true);

  const flingRight = Gesture.Fling()
    .direction(2) // left = go to next
    .onEnd(() => {
      if (swipeHandled.current || !portfolios || !id) return;
      const idx = portfolios.findIndex((p) => p.id === id);
      if (idx < portfolios.length - 1) {
        swipeHandled.current = true;
        router.replace(`/portfolio/${portfolios[idx + 1].id}` as never);
        setTimeout(() => { swipeHandled.current = false; }, 500);
      }
    })
    .runOnJS(true);

  const gesture = Gesture.Race(flingLeft, flingRight);
  const { data: transactions } = useTransactions(id || '');

  const symbols = useMemo(() => {
    if (!transactions) return [];
    return [...new Set(transactions.map((t) => t.symbol))];
  }, [transactions]);

  const { data: quotes } = useStockQuotes(symbols);

  const summary = useMemo(() => {
    if (!transactions || !quotes) return null;
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
    return computePortfolioSummary(transactions, quoteMap);
  }, [transactions, quotes]);

  // Portfolio index indicator
  const currentIdx = portfolios ? portfolios.findIndex((p) => p.id === id) : -1;
  const totalCount = portfolios?.length || 0;

  return (
    <GestureDetector gesture={gesture}>
      <ScrollView style={styles.container}>
        {totalCount > 1 && (
          <Text style={styles.pageIndicator}>{currentIdx + 1} / {totalCount}</Text>
        )}
        <Text style={styles.title}>{portfolio?.name}</Text>

      {summary && (
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Value</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.totalValue)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Unrealized P&L</Text>
            <Text style={[styles.metricValue, { color: summary.totalUnrealizedGain >= 0 ? '#16a34a' : '#dc2626' }]}>
              {formatCurrency(summary.totalUnrealizedGain)}
            </Text>
            <Text style={[styles.metricSub, { color: summary.totalUnrealizedGain >= 0 ? '#16a34a' : '#dc2626' }]}>
              {formatPercent(summary.totalUnrealizedGainPercent)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Realized P&L</Text>
            <Text style={[styles.metricValue, { color: summary.totalRealizedGain >= 0 ? '#16a34a' : '#dc2626' }]}>
              {formatCurrency(summary.totalRealizedGain)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Day Change</Text>
            <Text style={[styles.metricValue, { color: summary.dayChange >= 0 ? '#16a34a' : '#dc2626' }]}>
              {formatCurrency(summary.dayChange)}
            </Text>
            <Text style={[styles.metricSub, { color: summary.dayChange >= 0 ? '#16a34a' : '#dc2626' }]}>
              {formatPercent(summary.dayChangePercent)}
            </Text>
          </View>
        </View>
      )}

      {summary && summary.positions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Positions</Text>
          {summary.positions.map((pos) => (
            <TouchableOpacity
              key={pos.symbol}
              style={styles.posRow}
              onPress={() => router.push(`/stocks/${pos.symbol}`)}
            >
              <View style={styles.posLeft}>
                <StockLogo symbol={pos.symbol} size={36} />
                <View>
                  <Text style={styles.posSymbol}>{pos.symbol}</Text>
                  <Text style={styles.posShares}>{pos.shares.toFixed(2)} shares @ {formatCurrency(pos.averageCost)}</Text>
                </View>
              </View>
              <View style={styles.posRight}>
                <Text style={styles.posValue}>{pos.currentValue ? formatCurrency(pos.currentValue) : '—'}</Text>
                {pos.unrealizedGain != null && (
                  <Text style={[styles.posGain, { color: pos.unrealizedGain >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {formatPercent(pos.unrealizedGainPercent!)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        {transactions && transactions.length > 0 ? (
          [...transactions].reverse().map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <StockLogo symbol={tx.symbol} size={28} />
                <View>
                  <View style={styles.txHeader}>
                    <Text style={styles.txType(tx.type)}>{tx.type.toUpperCase()}</Text>
                    <Text style={styles.txSymbol}>{tx.symbol}</Text>
                  </View>
                  <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                </View>
              </View>
              <View style={styles.posRight}>
                <Text style={styles.txAmount}>{tx.shares} @ {formatCurrency(tx.price_per_share)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.hint}>No transactions yet.</Text>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  pageIndicator: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  metricCard: { width: '48%', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  metricLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 18, fontWeight: '700' },
  metricSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280' },
  posRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  posLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  posSymbol: { fontWeight: '600', fontSize: 15 },
  posShares: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  posRight: { alignItems: 'flex-end' },
  posValue: { fontWeight: '600', fontSize: 15 },
  posGain: { fontSize: 12, marginTop: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txType: ((type: string) => ({
    fontSize: 10,
    fontWeight: '700' as const,
    color: type === 'buy' ? '#16a34a' : type === 'sell' ? '#dc2626' : '#2563eb',
    backgroundColor: type === 'buy' ? '#f0fdf4' : type === 'sell' ? '#fef2f2' : '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden' as const,
  })) as unknown as any,
  txSymbol: { fontWeight: '600', fontSize: 14 },
  txDate: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  txAmount: { fontSize: 13, color: '#374151' },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 16 },
});
