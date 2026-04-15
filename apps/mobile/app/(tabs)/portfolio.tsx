import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import {
  usePortfolios,
  useCreatePortfolio,
  useDeletePortfolio,
  useAllTransactions,
  useStockQuotes,
  computePortfolioSummary,
  formatCurrency,
  formatPercent,
  formatDate,
  type Portfolio,
  type PortfolioSummary,
  type Transaction,
  type TransactionType,
} from '@alpha-stocks/core';
import StockLogo from '../../components/stocks/StockLogo';

type PageTab = 'overview' | 'stats' | 'reports';

const PIE_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#eab308',
];

function PortfolioCard({ portfolio, summary, onDelete }: {
  portfolio: Portfolio;
  summary: PortfolioSummary | null;
  onDelete: () => void;
}) {
  const router = useRouter();

  const isNeg = summary && summary.dayChange < 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/portfolio/${portfolio.id}` as never)}
      onLongPress={onDelete}
      activeOpacity={0.7}
    >
      {summary ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.cardTitle}>{portfolio.name}</Text>
            <Text style={styles.cardValue}>{formatCurrency(summary.totalValue)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.cardChange, { color: isNeg ? '#dc2626' : '#16a34a' }]}>
              {isNeg ? '' : '+'}{formatCurrency(summary.dayChange)} ({formatPercent(summary.dayChangePercent)}) today
            </Text>
            <Text style={[styles.cardTotalGain, { color: isNeg ? '#dc2626' : '#16a34a' }]}>
              {isNeg ? '' : '+'}{formatCurrency(summary.dayChange)}
            </Text>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.cardTitle}>{portfolio.name}</Text>
          <Text style={styles.cardHint}>Loading...</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// --- SVG Pie Chart ---

function PieChart({ data, size }: {
  data: { label: string; value: number; color: string }[];
  size: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  let startAngle = -Math.PI / 2;

  const paths = data.map((d) => {
    const pct = d.value / total;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;

    return <Path key={d.label} d={pathD} fill={d.color} stroke="white" strokeWidth={2} />;
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </Svg>
  );
}

// --- Stats Tab ---

function PortfolioStats({ summaries, portfolios }: {
  summaries: Map<string, PortfolioSummary>;
  portfolios: Portfolio[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((symbol: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }, []);

  const { allPositions, perPortfolio } = useMemo(() => {
    const merged = new Map<string, { symbol: string; value: number; shares: number; costBasis: number; pnl: number }>();
    const breakdown = new Map<string, { portfolioId: string; portfolioName: string; value: number; shares: number; pnl: number }[]>();
    const portfolioNameMap = new Map(portfolios.map((p) => [p.id, p.name]));

    for (const [portfolioId, summary] of summaries.entries()) {
      const portfolioName = portfolioNameMap.get(portfolioId) || portfolioId;
      for (const pos of summary.positions) {
        const existing = merged.get(pos.symbol) || { symbol: pos.symbol, value: 0, shares: 0, costBasis: 0, pnl: 0 };
        existing.value += pos.currentValue || 0;
        existing.shares += pos.shares;
        existing.costBasis += pos.costBasis;
        existing.pnl += pos.unrealizedGain ?? 0;
        merged.set(pos.symbol, existing);

        const entries = breakdown.get(pos.symbol) || [];
        entries.push({ portfolioId, portfolioName, value: pos.currentValue || 0, shares: pos.shares, pnl: pos.unrealizedGain ?? 0 });
        breakdown.set(pos.symbol, entries);
      }
    }
    return {
      allPositions: [...merged.values()].sort((a, b) => b.value - a.value),
      perPortfolio: breakdown,
    };
  }, [summaries, portfolios]);

  const totalValue = allPositions.reduce((s, p) => s + p.value, 0);

  const portfolioAllocation = useMemo(() => {
    return portfolios
      .map((p) => {
        const s = summaries.get(p.id);
        return { name: p.name, value: s?.totalValue || 0 };
      })
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [portfolios, summaries]);

  if (allPositions.length === 0) {
    return <Text style={styles.hint}>Add transactions to see portfolio stats.</Text>;
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Stock Distribution */}
      <Text style={styles.statsTitle}>Stock Distribution</Text>
      <View style={styles.pieRow}>
        <PieChart
          data={allPositions.map((p, i) => ({
            label: p.symbol,
            value: p.value,
            color: PIE_COLORS[i % PIE_COLORS.length],
          }))}
          size={160}
        />
      </View>
      <View style={styles.statsHeaderRow}>
        <Text style={[styles.statsHeaderText, { flex: 1, textAlign: 'left' }]}>Symbol</Text>
        <Text style={[styles.statsHeaderText, { flex: 1, textAlign: 'right' }]}>Value</Text>
        <Text style={[styles.statsHeaderText, { flex: 0.8, textAlign: 'right' }]}>Weight</Text>
        <Text style={[styles.statsHeaderText, { flex: 1, textAlign: 'right' }]}>P&L</Text>
      </View>
      {allPositions.map((pos, i) => {
        const isExp = expanded.has(pos.symbol);
        const breakdown = (perPortfolio.get(pos.symbol) || []).slice().sort((a, b) => b.value - a.value);
        return (
          <View key={pos.symbol}>
            <TouchableOpacity onPress={() => toggleExpand(pos.symbol)} style={styles.statsRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 10, color: '#9ca3af', transform: [{ rotate: isExp ? '90deg' : '0deg' }] }}>&#9654;</Text>
                <View style={[styles.colorDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                <Text style={styles.statsSymbol}>{pos.symbol}</Text>
              </View>
              <Text style={[styles.statsValue, { flex: 1, textAlign: 'right' }]}>{formatCurrency(pos.value)}</Text>
              <Text style={[styles.statsWeight, { flex: 0.8, textAlign: 'right' }]}>{totalValue > 0 ? ((pos.value / totalValue) * 100).toFixed(1) : 0}%</Text>
              <Text style={[styles.statsValue, { flex: 1, textAlign: 'right', color: pos.pnl >= 0 ? '#16a34a' : '#dc2626' }]}>{formatCurrency(pos.pnl)}</Text>
            </TouchableOpacity>
            {isExp && breakdown.map((b) => (
              <View key={`${pos.symbol}-${b.portfolioId}`} style={styles.statsSubRow}>
                <Text style={[styles.statsSubName, { flex: 1 }]}>{b.portfolioName}</Text>
                <Text style={[styles.statsSubValue, { flex: 1, textAlign: 'right' }]}>{formatCurrency(b.value)}</Text>
                <Text style={[styles.statsSubWeight, { flex: 0.8, textAlign: 'right' }]}>{pos.value > 0 ? ((b.value / pos.value) * 100).toFixed(1) : 0}%</Text>
                <Text style={[styles.statsSubValue, { flex: 1, textAlign: 'right', color: b.pnl >= 0 ? '#16a34a' : '#dc2626' }]}>{formatCurrency(b.pnl)}</Text>
              </View>
            ))}
          </View>
        );
      })}

      {/* Portfolio Allocation */}
      {portfolioAllocation.length > 1 && (
        <>
          <Text style={[styles.statsTitle, { marginTop: 24 }]}>Portfolio Allocation</Text>
          <View style={styles.pieRow}>
            <PieChart
              data={portfolioAllocation.map((p, i) => ({
                label: p.name,
                value: p.value,
                color: PIE_COLORS[i % PIE_COLORS.length],
              }))}
              size={140}
            />
          </View>
          {portfolioAllocation.map((p, i) => (
            <View key={p.name} style={styles.statsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.colorDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                <Text style={styles.statsSymbol}>{p.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.statsValue}>{formatCurrency(p.value)}</Text>
                <Text style={styles.statsWeight}>{totalValue > 0 ? ((p.value / totalValue) * 100).toFixed(1) : 0}%</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

export default function PortfolioScreen() {
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>('overview');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  // Fetch all transactions in parallel via useQueries (stable hook count)
  const portfolioIds = useMemo(() => (portfolios || []).map((p) => p.id), [portfolios]);
  const txResults = useAllTransactions(portfolioIds);

  // Collect all unique symbols across all portfolios
  const allSymbols = useMemo(() => {
    const symbols = new Set<string>();
    for (const result of txResults) {
      if (result.data) {
        for (const t of result.data) symbols.add(t.symbol);
      }
    }
    return [...symbols];
  }, [txResults]);

  // Single batch quote fetch for all symbols
  const { data: allQuotes } = useStockQuotes(allSymbols);

  // Compute summaries for each portfolio
  const summaries = useMemo(() => {
    const map = new Map<string, PortfolioSummary>();
    if (!allQuotes) return map;
    const quoteMap = new Map(allQuotes.map((q) => [q.symbol, q]));
    for (let i = 0; i < portfolioIds.length; i++) {
      const transactions = txResults[i]?.data;
      if (!transactions) continue;
      if (transactions.length === 0) {
        map.set(portfolioIds[i], {
          totalValue: 0, totalCostBasis: 0, totalUnrealizedGain: 0,
          totalUnrealizedGainPercent: 0, totalRealizedGain: 0, totalDividends: 0,
          positions: [], dayChange: 0, dayChangePercent: 0,
        });
      } else {
        map.set(portfolioIds[i], computePortfolioSummary(transactions, quoteMap));
      }
    }
    return map;
  }, [allQuotes, txResults, portfolioIds]);

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

  const allTransactions = useMemo(() => {
    const result: (Transaction & { portfolioName: string })[] = [];
    for (let i = 0; i < portfolioIds.length; i++) {
      const txs = txResults[i]?.data;
      const pName = (portfolios || []).find((p) => p.id === portfolioIds[i])?.name || '—';
      if (txs) {
        for (const tx of txs) result.push({ ...tx, portfolioName: pName });
      }
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [txResults, portfolioIds, portfolios]);

  const tabs: { key: PageTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'stats', label: 'Stats' },
    { key: 'reports', label: 'Reports' },
  ];

  return (
    <View style={styles.container}>
      {/* Total holdings */}
      {(portfolios?.length ?? 0) > 0 && summaries.size >= (portfolios?.length ?? 0) && (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Holdings</Text>
          <Text style={styles.totalValue}>{formatCurrency(totals.value)}</Text>
          <Text style={[styles.totalChange, { color: totals.dayChange >= 0 ? '#4ade80' : '#f87171' }]}>
            {totals.dayChange >= 0 ? '+' : ''}{formatCurrency(totals.dayChange)} ({formatPercent(totals.pct)}) today
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
            renderItem={({ item }) => (
              <PortfolioCard
                portfolio={item}
                summary={summaries.get(item.id) ?? null}
                onDelete={() => handleDelete(item.id, item.name)}
              />
            )}
          />
        </>
      )}

      {activeTab === 'stats' && (
        <PortfolioStats summaries={summaries} portfolios={portfolios || []} />
      )}

      {activeTab === 'reports' && (
        <TransactionReport transactions={allTransactions} portfolios={portfolios || []} />
      )}
    </View>
  );
}

// --- Reports Tab ---

const TYPE_FILTERS: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sell', label: 'Sell' },
  { value: 'buy', label: 'Buy' },
  { value: 'dividend', label: 'Dividend' },
];

const PERIOD_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '6m', label: '6M' },
  { value: '3m', label: '3M' },
  { value: '1m', label: '1M' },
];

function TransactionReport({
  transactions,
  portfolios,
}: {
  transactions: (Transaction & { portfolioName: string })[];
  portfolios: Portfolio[];
}) {
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [selectedPortfolios, setSelectedPortfolios] = useState<Set<string>>(new Set());

  const togglePortfolio = useCallback((id: string) => {
    setSelectedPortfolios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = transactions;

    if (typeFilter !== 'all') {
      result = result.filter((tx) => tx.type === typeFilter);
    }

    if (selectedPortfolios.size > 0) {
      result = result.filter((tx) => selectedPortfolios.has(tx.portfolio_id));
    }

    if (symbolFilter.trim()) {
      const sym = symbolFilter.trim().toUpperCase();
      result = result.filter((tx) => tx.symbol.includes(sym));
    }

    const now = new Date();
    let fromDate: Date | null = null;
    if (periodFilter === 'ytd') fromDate = new Date(now.getFullYear(), 0, 1);
    else if (periodFilter === '1y') { fromDate = new Date(now); fromDate.setFullYear(fromDate.getFullYear() - 1); }
    else if (periodFilter === '6m') { fromDate = new Date(now); fromDate.setMonth(fromDate.getMonth() - 6); }
    else if (periodFilter === '3m') { fromDate = new Date(now); fromDate.setMonth(fromDate.getMonth() - 3); }
    else if (periodFilter === '1m') { fromDate = new Date(now); fromDate.setMonth(fromDate.getMonth() - 1); }

    if (fromDate) {
      const fromStr = fromDate.toISOString().split('T')[0];
      result = result.filter((tx) => tx.date >= fromStr);
    }

    return result;
  }, [transactions, typeFilter, selectedPortfolios, symbolFilter, periodFilter]);

  const totalAmount = useMemo(() => filtered.reduce((sum, tx) => sum + tx.shares * tx.price_per_share, 0), [filtered]);
  const totalFees = useMemo(() => filtered.reduce((sum, tx) => sum + tx.fees, 0), [filtered]);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Period pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rStyles.filterRow}>
        {PERIOD_FILTERS.map((p) => (
          <TouchableOpacity
            key={p.value}
            onPress={() => setPeriodFilter(p.value)}
            style={[rStyles.pill, periodFilter === p.value && rStyles.pillActive]}
          >
            <Text style={[rStyles.pillText, periodFilter === p.value && rStyles.pillTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rStyles.filterRow}>
        {TYPE_FILTERS.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => setTypeFilter(t.value)}
            style={[rStyles.pill, typeFilter === t.value && (
              t.value === 'sell' ? rStyles.pillSell
                : t.value === 'buy' ? rStyles.pillBuy
                  : t.value === 'dividend' ? rStyles.pillDiv
                    : rStyles.pillActive
            )]}
          >
            <Text style={[rStyles.pillText, typeFilter === t.value && rStyles.pillTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Symbol search */}
      <TextInput
        style={rStyles.searchInput}
        placeholder="Filter by symbol..."
        value={symbolFilter}
        onChangeText={(v) => setSymbolFilter(v.toUpperCase())}
        autoCapitalize="characters"
      />

      {/* Portfolio chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rStyles.filterRow}>
        {portfolios.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => togglePortfolio(p.id)}
            style={[rStyles.pill, selectedPortfolios.has(p.id) && rStyles.pillActive]}
          >
            <Text style={[rStyles.pillText, selectedPortfolios.has(p.id) && rStyles.pillTextActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
        {selectedPortfolios.size > 0 && (
          <TouchableOpacity onPress={() => setSelectedPortfolios(new Set())} style={rStyles.clearBtn}>
            <Text style={rStyles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Summary */}
      <View style={rStyles.summary}>
        <Text style={rStyles.summaryText}><Text style={rStyles.summaryBold}>{filtered.length}</Text> transactions</Text>
        <Text style={rStyles.summaryText}>Total: <Text style={rStyles.summaryBold}>{formatCurrency(totalAmount)}</Text></Text>
        {totalFees > 0 && <Text style={rStyles.summaryText}>Fees: <Text style={rStyles.summaryBold}>{formatCurrency(totalFees)}</Text></Text>}
      </View>

      {/* Transaction list */}
      {filtered.length > 0 ? (
        filtered.map((tx) => (
          <View key={tx.id} style={rStyles.txRow}>
            <View style={rStyles.txLeft}>
              <StockLogo symbol={tx.symbol} size={28} />
              <View>
                <View style={rStyles.txHeader}>
                  <Text style={[rStyles.txType, {
                    color: tx.type === 'buy' ? '#16a34a' : tx.type === 'sell' ? '#dc2626' : '#2563eb',
                    backgroundColor: tx.type === 'buy' ? '#f0fdf4' : tx.type === 'sell' ? '#fef2f2' : '#eff6ff',
                  }]}>{tx.type.toUpperCase()}</Text>
                  <Text style={rStyles.txSymbol}>{tx.symbol}</Text>
                </View>
                <Text style={rStyles.txMeta}>{formatDate(tx.date)} · {tx.portfolioName}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={rStyles.txAmount}>{formatCurrency(tx.shares * tx.price_per_share + tx.fees)}</Text>
              <Text style={rStyles.txDetail}>{tx.shares} @ {formatCurrency(tx.price_per_share)}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.hint}>No transactions match the filters.</Text>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const rStyles = StyleSheet.create({
  filterRow: { flexDirection: 'row', marginBottom: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 6 },
  pillActive: { backgroundColor: '#2563eb' },
  pillBuy: { backgroundColor: '#16a34a' },
  pillSell: { backgroundColor: '#dc2626' },
  pillDiv: { backgroundColor: '#2563eb' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  pillTextActive: { color: '#fff' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
  clearBtnText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  searchInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#fff', marginBottom: 8 },
  summary: { flexDirection: 'row', gap: 16, paddingVertical: 8, marginBottom: 4 },
  summaryText: { fontSize: 13, color: '#6b7280' },
  summaryBold: { fontWeight: '700', color: '#111827' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  txHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txType: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  txSymbol: { fontWeight: '600', fontSize: 14 },
  txMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  txAmount: { fontWeight: '600', fontSize: 14 },
  txDetail: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: '#f9fafb' },
  totalCard: { backgroundColor: '#111827', padding: 20, borderRadius: 12, marginBottom: 16 },
  totalLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  totalChange: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#111827' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  tabTextActive: { color: '#111827' },
  createBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  createForm: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  submitBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#f0f7ff', padding: 14, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#2563eb', borderWidth: 1, borderColor: '#dbeafe' },
  cardTitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  cardChange: { fontSize: 15, fontWeight: '600' },
  cardTotalGain: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  cardHint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  // Stats styles
  statsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  pieRow: { alignItems: 'center', marginBottom: 16 },
  statsHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  statsHeaderText: { fontSize: 11, fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  statsSymbol: { fontSize: 14, fontWeight: '600' },
  statsValue: { fontSize: 14, fontWeight: '500' },
  statsWeight: { fontSize: 12, color: '#9ca3af', width: 42, textAlign: 'right' },
  statsSubRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingLeft: 28, borderBottomWidth: 1, borderBottomColor: '#f9fafb', backgroundColor: '#f9fafb' },
  statsSubName: { flex: 1, fontSize: 13, color: '#6b7280' },
  statsSubValue: { fontSize: 13, fontWeight: '500' },
  statsSubWeight: { fontSize: 12, color: '#9ca3af', width: 42, textAlign: 'right' },
});
