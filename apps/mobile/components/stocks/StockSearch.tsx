import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStockSearch } from '@alpha-stocks/core';

export default function StockSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data: results, isLoading } = useStockSearch(debouncedQuery);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(symbol: string) {
    setQuery('');
    router.push(`/stocks/${symbol}`);
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search stocks, ETFs..."
        placeholderTextColor="#9ca3af"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {debouncedQuery.length >= 2 && (
        <View style={styles.results}>
          {isLoading && <Text style={styles.hint}>Searching...</Text>}
          {results && results.length === 0 && !isLoading && (
            <Text style={styles.hint}>No results found</Text>
          )}
          <FlatList
            data={results}
            keyExtractor={(item) => item.symbol}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => handleSelect(item.symbol)}
              >
                <View>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <Text style={styles.type}>{item.type}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  results: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
  },
  hint: { padding: 12, fontSize: 14, color: '#6b7280' },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  symbol: { fontWeight: '600', fontSize: 15 },
  name: { fontSize: 13, color: '#6b7280', maxWidth: 240 },
  type: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' },
});
