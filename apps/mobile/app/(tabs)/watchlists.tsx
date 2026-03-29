import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useWatchlists, useCreateWatchlist, useDeleteWatchlist } from '@alpha-stocks/core';

export default function WatchlistsScreen() {
  const { data: watchlists, isLoading } = useWatchlists();
  const createWatchlist = useCreateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  async function handleCreate() {
    if (!newName.trim()) return;
    await createWatchlist.mutateAsync(newName.trim());
    setNewName('');
    setShowCreate(false);
  }

  function handleDelete(id: string, name: string) {
    Alert.alert('Delete Watchlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWatchlist.mutate(id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>+ New Watchlist</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Watchlist name"
            autoFocus
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
            <Text style={styles.submitBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && <Text style={styles.hint}>Loading...</Text>}

      {watchlists && watchlists.length === 0 && !isLoading && (
        <Text style={styles.hint}>No watchlists yet. Create one to start tracking stocks.</Text>
      )}

      <FlatList
        data={watchlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/watchlists/${item.id}` as never)}
            onLongPress={() => handleDelete(item.id, item.name)}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              {item.items?.length || 0} stock{(item.items?.length || 0) !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
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
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6b7280' },
});
