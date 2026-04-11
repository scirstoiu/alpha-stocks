import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useNews, type NewsItem } from '@alpha-stocks/core';

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsScreen() {
  const { data: news, isLoading } = useNews();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['news'] });
    setRefreshing(false);
  }, [queryClient]);

  return (
    <View style={styles.container}>
      {isLoading && <Text style={styles.hint}>Loading news...</Text>}
      {!isLoading && (!news || news.length === 0) && (
        <Text style={styles.hint}>No news available.</Text>
      )}
      <FlatList
        data={news}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => WebBrowser.openBrowserAsync(item.url)}
          >
            <Text style={styles.headline} numberOfLines={2}>{item.headline}</Text>
            {item.summary ? <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text> : null}
            <View style={styles.meta}>
              <Text style={styles.source}>{item.source}</Text>
              <Text style={styles.time}> · {timeAgo(item.publishedAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: '#f9fafb' },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  headline: { fontSize: 15, fontWeight: '600', marginBottom: 5, lineHeight: 21 },
  summary: { fontSize: 13, color: '#6b7280', marginBottom: 6, lineHeight: 19 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  source: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  time: { fontSize: 13, color: '#9ca3af' },
});
