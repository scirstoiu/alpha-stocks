import { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useStockLogo } from '@alpha-stocks/core';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#c026d3'];

function getColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function StockLogo({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const { data: logoUrl } = useStockLogo(symbol);
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: getColor(symbol) }]}>
      <Text style={[styles.letter, { fontSize: size * 0.45 }]}>{symbol.charAt(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { justifyContent: 'center', alignItems: 'center' },
  letter: { color: '#fff', fontWeight: '700' },
});
