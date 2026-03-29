import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStockQuote, formatCurrency, formatPercent, formatCompactNumber } from '@alpha-stocks/core';

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const upperSymbol = (symbol || '').toUpperCase();
  const { data: quote, isLoading, error } = useStockQuote(upperSymbol);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !quote) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Failed to load quote for {upperSymbol}</Text>
      </View>
    );
  }

  const isPositive = quote.change >= 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.symbol}>{quote.symbol}</Text>
        <Text style={styles.name}>{quote.name}</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatCurrency(quote.price)}</Text>
        <Text style={[styles.change, { color: isPositive ? '#16a34a' : '#dc2626' }]}>
          {isPositive ? '+' : ''}
          {quote.change.toFixed(2)} ({formatPercent(quote.changePercent)})
        </Text>
      </View>
      <View style={styles.grid}>
        <StatItem label="Open" value={formatCurrency(quote.open)} />
        <StatItem label="High" value={formatCurrency(quote.high)} />
        <StatItem label="Low" value={formatCurrency(quote.low)} />
        <StatItem label="Volume" value={formatCompactNumber(quote.volume)} />
        <StatItem label="Prev Close" value={formatCurrency(quote.previousClose)} />
        {quote.marketCap ? (
          <StatItem label="Market Cap" value={formatCompactNumber(quote.marketCap)} />
        ) : null}
      </View>
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#dc2626', fontSize: 14 },
  header: { marginBottom: 8 },
  symbol: { fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 14, color: '#6b7280' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 24 },
  price: { fontSize: 32, fontWeight: '600' },
  change: { fontSize: 16, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '500' },
});
