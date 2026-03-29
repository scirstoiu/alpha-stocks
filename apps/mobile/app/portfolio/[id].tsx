import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  usePortfolio,
  useTransactions,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  formatDate,
} from '@alpha-stocks/core';

export default function PortfolioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: portfolio } = usePortfolio(id || '');
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

  return (
    <ScrollView style={styles.container}>
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
          </View>
        </View>
      )}

      {summary && summary.positions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Positions</Text>
          {summary.positions.map((pos) => (
            <View key={pos.symbol} style={styles.posRow}>
              <View>
                <Text style={styles.posSymbol}>{pos.symbol}</Text>
                <Text style={styles.posShares}>{pos.shares.toFixed(2)} shares @ {formatCurrency(pos.averageCost)}</Text>
              </View>
              <View style={styles.posRight}>
                <Text style={styles.posValue}>{pos.currentValue ? formatCurrency(pos.currentValue) : '—'}</Text>
                {pos.unrealizedGain != null && (
                  <Text style={[styles.posGain, { color: pos.unrealizedGain >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {formatPercent(pos.unrealizedGainPercent!)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        {transactions && transactions.length > 0 ? (
          [...transactions].reverse().map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View>
                <Text style={styles.txType}>
                  {tx.type.toUpperCase()} {tx.symbol}
                </Text>
                <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  metricCard: { width: '48%', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '700' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  posRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  posSymbol: { fontWeight: '600', fontSize: 15 },
  posShares: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  posRight: { alignItems: 'flex-end' },
  posValue: { fontWeight: '600', fontSize: 15 },
  posGain: { fontSize: 12, marginTop: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  txType: { fontWeight: '600', fontSize: 14 },
  txDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  txAmount: { fontSize: 13, color: '#374151' },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 16 },
});
