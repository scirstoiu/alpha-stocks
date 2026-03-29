import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  usePortfolios,
  useCreatePortfolio,
  useDeletePortfolio,
  useTransactions,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  type Portfolio,
  type PortfolioSummary,
} from '@alpha-stocks/core';

function PortfolioCard({ portfolio, onDelete, onSummary }: {
  portfolio: Portfolio;
  onDelete: () => void;
  onSummary: (id: string, summary: PortfolioSummary) => void;
}) {
  const router = useRouter();
  const { data: transactions } = useTransactions(portfolio.id);

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

  useEffect(() => {
    if (summary) onSummary(portfolio.id, summary);
  }, [summary, portfolio.id, onSummary]);

  const isNeg = summary && summary.dayChange < 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/portfolio/${portfolio.id}` as never)}
      onLongPress={onDelete}
      activeOpacity={0.7}
    >
      <Text style={styles.cardTitle}>{portfolio.name}</Text>
      {summary ? (
        <>
          <Text style={styles.cardValue}>{formatCurrency(summary.totalValue)}</Text>
          <Text style={[styles.cardChange, { color: isNeg ? '#dc2626' : '#16a34a' }]}>
            {isNeg ? '' : '+'}{formatCurrency(summary.dayChange)} ({formatPercent(summary.dayChangePercent)}) today
          </Text>
        </>
      ) : transactions && transactions.length === 0 ? (
        <Text style={styles.cardHint}>No transactions yet</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function PortfolioScreen() {
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const [summaries, setSummaries] = useState<Map<string, PortfolioSummary>>(new Map());
  const reportSummary = useCallback((id: string, s: PortfolioSummary) => {
    setSummaries((prev) => {
      const next = new Map(prev);
      next.set(id, s);
      return next;
    });
  }, []);

  const totals = useMemo(() => {
    let value = 0, dayChange = 0;
    for (const s of summaries.values()) {
      value += s.totalValue;
      dayChange += s.dayChange;
    }
    return { value, dayChange, pct: value > 0 ? (dayChange / (value - dayChange)) * 100 : 0 };
  }, [summaries]);

  async function handleCreate() {
    if (!newName.trim()) return;
    await createPortfolio.mutateAsync({ name: newName.trim() });
    setNewName('');
    setShowCreate(false);
  }

  function handleDelete(id: string, name: string) {
    Alert.alert('Delete Portfolio', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePortfolio.mutate(id) },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Total holdings */}
      {summaries.size > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Holdings</Text>
          <Text style={styles.totalValue}>{formatCurrency(totals.value)}</Text>
          <Text style={[styles.totalChange, { color: totals.dayChange >= 0 ? '#4ade80' : '#f87171' }]}>
            {totals.dayChange >= 0 ? '+' : ''}{formatCurrency(totals.dayChange)} ({formatPercent(totals.pct)}) today
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>+ New Portfolio</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Portfolio name"
            autoFocus
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
            <Text style={styles.submitBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && <Text style={styles.hint}>Loading...</Text>}

      {portfolios && portfolios.length === 0 && !isLoading && (
        <Text style={styles.hint}>No portfolios yet.</Text>
      )}

      <FlatList
        data={portfolios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PortfolioCard
            portfolio={item}
            onDelete={() => handleDelete(item.id, item.name)}
            onSummary={reportSummary}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: '#f9fafb' },
  totalCard: { backgroundColor: '#111827', padding: 20, borderRadius: 12, marginBottom: 16 },
  totalLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  totalChange: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  createBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  createForm: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  submitBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#2563eb', borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  cardChange: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  cardHint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
});
