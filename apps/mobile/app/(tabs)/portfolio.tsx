import { useState, useMemo } from 'react';
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
} from '@alpha-stocks/core';

function PortfolioCard({ portfolio, onDelete }: { portfolio: Portfolio; onDelete: () => void }) {
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/portfolio/${portfolio.id}` as never)}
      onLongPress={onDelete}
    >
      <Text style={styles.cardTitle}>{portfolio.name}</Text>
      {portfolio.description ? (
        <Text style={styles.cardDesc}>{portfolio.description}</Text>
      ) : null}
      {summary ? (
        <View style={styles.cardMetrics}>
          <Text style={styles.cardValue}>{formatCurrency(summary.totalValue)}</Text>
          <Text style={[styles.cardChange, { color: summary.dayChange >= 0 ? '#16a34a' : '#dc2626' }]}>
            {summary.dayChange >= 0 ? '+' : ''}{formatCurrency(summary.dayChange)} ({formatPercent(summary.dayChangePercent)}) today
          </Text>
        </View>
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
        <Text style={styles.hint}>No portfolios yet. Create one to start tracking investments.</Text>
      )}

      <FlatList
        data={portfolios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PortfolioCard
            portfolio={item}
            onDelete={() => handleDelete(item.id, item.name)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  createBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  createForm: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  submitBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardMetrics: { marginTop: 8 },
  cardValue: { fontSize: 20, fontWeight: '700' },
  cardChange: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardHint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
});
