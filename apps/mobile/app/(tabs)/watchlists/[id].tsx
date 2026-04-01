import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useWatchlist,
  useAddWatchlistItem,
  useRemoveWatchlistItem,
  useStockQuotes,
  useStockSearch,
  formatCurrency,
  formatPercent,
} from '@alpha-stocks/core';
import StockLogo from '../../../components/stocks/StockLogo';

export default function WatchlistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: watchlist, isLoading } = useWatchlist(id || '');
  const addItem = useAddWatchlistItem();
  const removeItem = useRemoveWatchlistItem();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['quotes'] });
    await queryClient.invalidateQueries({ queryKey: ['watchlist', id] });
    setRefreshing(false);
  }, [queryClient, id]);

  const symbols = watchlist?.items?.map((i) => i.symbol) || [];
  const { data: quotes } = useStockQuotes(symbols);
  const quoteMap = new Map(quotes?.map((q) => [q.symbol, q]));

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data: searchResults } = useStockSearch(debouncedQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleAddSymbol(symbol: string) {
    if (!id) return;
    await addItem.mutateAsync({ watchlistId: id, symbol });
    setSearchQuery('');
    setDebouncedQuery('');
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{watchlist?.name}</Text>

      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Add a stock..."
        autoCapitalize="characters"
      />

      {debouncedQuery.length >= 2 && searchResults && (
        <View style={styles.searchResults}>
          {searchResults.map((r) => (
            <TouchableOpacity key={r.symbol} style={styles.searchRow} onPress={() => handleAddSymbol(r.symbol)}>
              <StockLogo symbol={r.symbol} size={24} />
              <Text style={styles.searchSymbol}>{r.symbol}</Text>
              <Text style={styles.searchName} numberOfLines={1}>{r.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={watchlist?.items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        renderItem={({ item }) => {
          const quote = quoteMap.get(item.symbol);
          const isPositive = (quote?.change ?? 0) >= 0;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/stocks/${item.symbol}`)}
              onLongPress={() => id && removeItem.mutate({ itemId: item.id, watchlistId: id })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <StockLogo symbol={item.symbol} size={36} />
                <View>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                  <Text style={styles.name}>{quote?.name || ''}</Text>
                </View>
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.price}>{quote ? formatCurrency(quote.price) : '—'}</Text>
                <Text style={[styles.change, { color: isPositive ? '#16a34a' : '#dc2626' }]}>
                  {quote ? formatPercent(quote.changePercent) : ''}
                </Text>
                {quote && (quote.postMarketChangePercent ?? quote.preMarketChangePercent) != null && (
                  <Text style={[styles.change, { color: (quote.postMarketChangePercent ?? quote.preMarketChangePercent ?? 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                    Ext {formatPercent((quote.postMarketChangePercent ?? quote.preMarketChangePercent)!)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.hint}>This watchlist is empty. Search above to add stocks.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  searchResults: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8 },
  searchSymbol: { fontWeight: '600' },
  searchName: { color: '#6b7280', fontSize: 13, flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  symbol: { fontWeight: '600', fontSize: 15 },
  name: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontWeight: '600', fontSize: 15 },
  change: { fontSize: 14, marginTop: 2 },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
});
