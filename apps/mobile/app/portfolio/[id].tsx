import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  usePortfolio,
  usePortfolios,
  useTransactions,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  formatDate,
  type Transaction,
  type TransactionType,
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
  const queryClient = useQueryClient();
  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [txModalMode, setTxModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['quotes'] });
    await queryClient.invalidateQueries({ queryKey: ['transactions', id] });
    setRefreshing(false);
  }, [queryClient, id]);

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
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
        {totalCount > 1 && (
          <Text style={styles.pageIndicator}>{currentIdx + 1} / {totalCount}</Text>
        )}
        <TouchableOpacity onPress={() => totalCount > 1 && setShowPicker(true)} style={styles.titleRow}>
          <Text style={styles.title}>{portfolio?.name}</Text>
          {totalCount > 1 && <Text style={styles.titleArrow}>▼</Text>}
        </TouchableOpacity>
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
            <View style={styles.pickerSheet}>
              {portfolios?.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickerItem, p.id === id && styles.pickerItemActive]}
                  onPress={() => {
                    setShowPicker(false);
                    if (p.id !== id) router.replace(`/portfolio/${p.id}` as never);
                  }}
                >
                  <Text style={[styles.pickerItemText, p.id === id && styles.pickerItemTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

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
                  <Text style={styles.posShares}>{Math.round(pos.shares)} shares @ {formatCurrency(pos.averageCost)}</Text>
                </View>
              </View>
              <View style={styles.posRight}>
                <Text style={styles.posValue}>{pos.currentValue ? formatCurrency(pos.currentValue) : '—'}</Text>
                {pos.dayChange != null && (
                  <Text style={[styles.posDayChange, { color: pos.dayChange >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {pos.dayChange >= 0 ? '+' : ''}{formatCurrency(pos.dayChange)}
                  </Text>
                )}
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
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <TouchableOpacity onPress={() => { setEditingTx(null); setTxModalMode('add'); }} style={styles.addTxBtn}>
            <Text style={styles.addTxBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
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
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>{tx.shares} @ {formatCurrency(tx.price_per_share)}</Text>
                <View style={styles.txActions}>
                  <TouchableOpacity onPress={() => { setEditingTx(tx); setTxModalMode('edit'); }}>
                    <Text style={styles.txEdit}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    Alert.alert('Delete Transaction', `Delete this ${tx.type} for ${tx.shares} ${tx.symbol}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteTx.mutate({ id: tx.id, portfolioId: id || '' }) },
                    ]);
                  }}>
                    <Text style={styles.txDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.hint}>No transactions yet.</Text>
        )}
      </View>

      <TransactionFormModal
        visible={txModalMode !== null}
        mode={txModalMode || 'add'}
        transaction={editingTx}
        portfolioId={id || ''}
        onClose={() => { setTxModalMode(null); setEditingTx(null); }}
        onAdd={addTransaction}
        onUpdate={updateTransaction}
      />

      <View style={{ height: 32 }} />
    </ScrollView>
    </GestureDetector>
  );
}

function TransactionFormModal({
  visible,
  mode,
  transaction,
  portfolioId,
  onClose,
  onAdd,
  onUpdate,
}: {
  visible: boolean;
  mode: 'add' | 'edit';
  transaction: Transaction | null;
  portfolioId: string;
  onClose: () => void;
  onAdd: ReturnType<typeof useAddTransaction>;
  onUpdate: ReturnType<typeof useUpdateTransaction>;
}) {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<TransactionType>('buy');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Reset form when modal opens
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    if (mode === 'edit' && transaction) {
      setSymbol(transaction.symbol);
      setType(transaction.type);
      setShares(String(transaction.shares));
      setPrice(String(transaction.price_per_share));
      setFees(transaction.fees ? String(transaction.fees) : '');
      setDate(transaction.date.split('T')[0]);
      setNotes(transaction.notes || '');
    } else {
      setSymbol('');
      setType('buy');
      setShares('');
      setPrice('');
      setFees('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }
  prevVisible.current = visible;

  async function handleSubmit() {
    const params = {
      symbol,
      type,
      shares: parseFloat(shares),
      price_per_share: parseFloat(price),
      fees: fees ? parseFloat(fees) : 0,
      date,
      notes: notes || undefined,
    };
    if (mode === 'edit' && transaction) {
      await onUpdate.mutateAsync({ id: transaction.id, portfolioId, ...params });
    } else {
      await onAdd.mutateAsync({ portfolio_id: portfolioId, ...params });
    }
    onClose();
  }

  const canSubmit = symbol.trim() && shares && price && date;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={formStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={formStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={formStyles.title}>{mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}</Text>

          <View style={formStyles.typeRow}>
            {(['buy', 'sell', 'dividend'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[formStyles.typeBtn, type === t && (t === 'buy' ? formStyles.typeBuy : t === 'sell' ? formStyles.typeSell : formStyles.typeDiv)]}
              >
                <Text style={[formStyles.typeBtnText, type === t && formStyles.typeBtnTextActive]}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={formStyles.input} placeholder="Symbol (e.g. AAPL)" value={symbol} onChangeText={(v) => setSymbol(v.toUpperCase())} autoCapitalize="characters" />
          <View style={formStyles.row}>
            <TextInput style={[formStyles.input, formStyles.flex1]} placeholder="Shares" value={shares} onChangeText={setShares} keyboardType="decimal-pad" />
            <TextInput style={[formStyles.input, formStyles.flex1]} placeholder="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={formStyles.row}>
            <TextInput style={[formStyles.input, formStyles.flex1]} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
            <TextInput style={[formStyles.input, formStyles.flex1]} placeholder="Fees" value={fees} onChangeText={setFees} keyboardType="decimal-pad" />
          </View>
          <TextInput style={formStyles.input} placeholder="Notes (optional)" value={notes} onChangeText={setNotes} />

          <View style={formStyles.actions}>
            <TouchableOpacity onPress={onClose} style={formStyles.cancelBtn}>
              <Text style={formStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[formStyles.submitBtn, !canSubmit && { opacity: 0.5 }]} disabled={!canSubmit}>
              <Text style={formStyles.submitText}>{mode === 'edit' ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  typeBuy: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  typeSell: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  typeDiv: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive: { color: '#111827' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 15, color: '#6b7280' },
  submitBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  submitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  pageIndicator: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  titleArrow: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerSheet: { backgroundColor: '#fff', borderRadius: 12, padding: 8, width: '80%', maxHeight: '60%' },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8 },
  pickerItemActive: { backgroundColor: '#eff6ff' },
  pickerItemText: { fontSize: 16, fontWeight: '500', color: '#374151' },
  pickerItemTextActive: { color: '#2563eb', fontWeight: '700' },
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
  posDayChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },
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
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 13, color: '#374151' },
  txActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  txEdit: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  txDelete: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addTxBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  addTxBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 16 },
});
