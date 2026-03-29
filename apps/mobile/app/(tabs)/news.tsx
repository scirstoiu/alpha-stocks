import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      {isLoading && <Text style={styles.hint}>Loading news...</Text>}
      {!isLoading && (!news || news.length === 0) && (
        <Text style={styles.hint}>No news available.</Text>
      )}
      <FlatList
        data={news}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => Linking.openURL(item.url)}
          >
            <Text style={styles.headline} numberOfLines={2}>{item.headline}</Text>
            <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
            <View style={styles.meta}>
              <Text style={styles.source}>{item.source}</Text>
              <Text style={styles.time}>{timeAgo(item.publishedAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  hint: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  headline: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  summary: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  meta: { flexDirection: 'row', gap: 8 },
  source: { fontSize: 11, color: '#9ca3af' },
  time: { fontSize: 11, color: '#9ca3af' },
});
