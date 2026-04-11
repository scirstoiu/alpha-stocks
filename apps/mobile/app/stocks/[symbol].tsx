import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useStockQuote, useHistoricalPrices, useNews, formatCurrency, formatPercent, formatCompactNumber, type HistoricalRange, type NewsItem } from '@alpha-stocks/core';
import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import StockLogo from '../../components/stocks/StockLogo';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';

const RANGES: HistoricalRange[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y'];
const SCREEN_WIDTH = Dimensions.get('window').width - 32;
const Y_LABEL_WIDTH = 55;
const CHART_WIDTH = SCREEN_WIDTH - Y_LABEL_WIDTH;
const CHART_HEIGHT = 200;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 10;
const NUM_TICKS = 5;

function formatYLabel(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  if (value >= 100) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}

function MiniChart({ symbol, range }: { symbol: string; range: HistoricalRange }) {
  const { data: prices, isLoading } = useHistoricalPrices(symbol, range);

  if (isLoading || !prices || prices.length === 0) {
    return (
      <View style={[chartStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        {isLoading && <ActivityIndicator size="small" color="#2563eb" />}
      </View>
    );
  }

  const closes = prices.filter((p) => p.close > 0).map((p) => p.close);
  if (closes.length < 2) return null;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const dataRange = max - min || 1;
  const isPositive = closes[closes.length - 1] >= closes[0];
  const color = isPositive ? '#16a34a' : '#dc2626';
  const chartInnerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const points = closes
    .map((c, i) => {
      const x = Y_LABEL_WIDTH + (i / (closes.length - 1)) * CHART_WIDTH;
      const y = PADDING_TOP + chartInnerHeight - ((c - min) / dataRange) * chartInnerHeight;
      return `${x},${y}`;
    })
    .join(' ');

  // Y-axis tick values
  const ticks = Array.from({ length: NUM_TICKS }, (_, i) => {
    const value = min + (dataRange * i) / (NUM_TICKS - 1);
    const y = PADDING_TOP + chartInnerHeight - ((value - min) / dataRange) * chartInnerHeight;
    return { value, y };
  });

  return (
    <View style={chartStyles.container}>
      <Svg width={SCREEN_WIDTH} height={CHART_HEIGHT}>
        {/* Grid lines and Y labels */}
        {ticks.map((tick, i) => (
          <Line key={i} x1={Y_LABEL_WIDTH} y1={tick.y} x2={SCREEN_WIDTH} y2={tick.y} stroke="#f3f4f6" strokeWidth={1} />
        ))}
        {ticks.map((tick, i) => (
          <SvgText key={`t${i}`} x={Y_LABEL_WIDTH - 6} y={tick.y + 4} fontSize={10} fill="#9ca3af" textAnchor="end">
            {formatYLabel(tick.value)}
          </SvgText>
        ))}
        {/* Price line */}
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { height: CHART_HEIGHT, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
});

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const upperSymbol = (symbol || '').toUpperCase();
  const { data: quote, isLoading, error } = useStockQuote(upperSymbol);
  const [range, setRange] = useState<HistoricalRange>('YTD');

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !quote) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Failed to load quote for {upperSymbol}</Text>
      </View>
    );
  }

  const isPositive = quote.change >= 0;
  const isIndex = quote.symbol.startsWith('^') || quote.symbol.includes('=');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <StockLogo symbol={quote.symbol} size={48} />
          <View>
            <Text style={styles.symbol}>{isIndex ? quote.name : quote.symbol}</Text>
            <Text style={styles.name}>{isIndex ? quote.symbol : quote.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatCurrency(quote.price)}</Text>
        <Text style={[styles.change, { color: isPositive ? '#16a34a' : '#dc2626' }]}>
          {isPositive ? '+' : ''}
          {quote.change.toFixed(2)} ({formatPercent(quote.changePercent)})
        </Text>
      </View>

      {(quote.postMarketPrice ?? quote.preMarketPrice) != null && (() => {
        const isPost = quote.postMarketPrice != null;
        const extPrice = (isPost ? quote.postMarketPrice : quote.preMarketPrice)!;
        const extChange = (isPost ? quote.postMarketChange : quote.preMarketChange) ?? 0;
        const extPercent = (isPost ? quote.postMarketChangePercent : quote.preMarketChangePercent) ?? 0;
        const extPositive = extChange >= 0;
        return (
          <View style={styles.extRow}>
            <Text style={styles.extLabel}>{isPost ? 'After Hours' : 'Pre-Market'}</Text>
            <Text style={styles.extPrice}>{formatCurrency(extPrice)}</Text>
            <Text style={[styles.extChange, { color: extPositive ? '#16a34a' : '#dc2626' }]}>
              {extPositive ? '+' : ''}{extChange.toFixed(2)} ({formatPercent(extPercent)})
            </Text>
          </View>
        );
      })()}

      {/* Chart */}
      <MiniChart symbol={upperSymbol} range={range} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRange(r)}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
          >
            <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Day/52w Ranges */}
      {!isIndex && (
        <View style={styles.rangesSection}>
          {quote.low > 0 && quote.high > 0 && (
            <RangeBarMobile low={quote.low} high={quote.high} current={quote.price} label="Day's Range" />
          )}
          {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
            <RangeBarMobile low={quote.fiftyTwoWeekLow} high={quote.fiftyTwoWeekHigh} current={quote.price} label="52 Week Range" />
          )}
        </View>
      )}

      {/* Analyst target */}
      {quote.targetMeanPrice != null && (
        <View style={styles.analystRow}>
          {quote.recommendationKey && (
            <Text style={[styles.recBadge, {
              color: quote.recommendationKey === 'buy' || quote.recommendationKey === 'strong_buy' ? '#16a34a' : quote.recommendationKey === 'hold' ? '#ca8a04' : '#dc2626',
              backgroundColor: quote.recommendationKey === 'buy' || quote.recommendationKey === 'strong_buy' ? '#f0fdf4' : quote.recommendationKey === 'hold' ? '#fefce8' : '#fef2f2',
            }]}>
              {quote.recommendationKey === 'strong_buy' ? 'Strong Buy' : quote.recommendationKey.charAt(0).toUpperCase() + quote.recommendationKey.slice(1)}
            </Text>
          )}
          <Text style={styles.targetText}>Target <Text style={styles.targetPrice}>{formatCurrency(quote.targetMeanPrice)}</Text></Text>
          {quote.numberOfAnalystOpinions != null && (
            <Text style={styles.analystCount}>{quote.numberOfAnalystOpinions} analysts</Text>
          )}
          {(() => {
            const upside = quote.targetMeanPrice && quote.price > 0
              ? ((quote.targetMeanPrice - quote.price) / quote.price) * 100
              : null;
            if (upside == null) return null;
            return (
              <Text style={[styles.upside, { color: upside >= 0 ? '#16a34a' : '#dc2626' }]}>
                {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% upside
              </Text>
            );
          })()}
        </View>
      )}

      {/* Stats */}
      <View style={styles.grid}>
        <StatItem label="Open" value={formatCurrency(quote.open)} />
        <StatItem label="Prev Close" value={formatCurrency(quote.previousClose)} />
        {quote.marketCap != null && <StatItem label="Market Cap" value={formatCompactNumber(quote.marketCap)} />}
        <StatItem label="Volume" value={formatCompactNumber(quote.volume)} />
        {quote.averageDailyVolume3Month != null && <StatItem label="Avg Volume" value={formatCompactNumber(quote.averageDailyVolume3Month)} />}
        {quote.epsTrailingTwelveMonths != null && <StatItem label="EPS (TTM)" value={quote.epsTrailingTwelveMonths.toFixed(2)} />}
        {quote.trailingPE != null && <StatItem label="P/E Ratio" value={quote.trailingPE.toFixed(2)} />}
        {quote.forwardPE != null && <StatItem label="Forward P/E" value={quote.forwardPE.toFixed(2)} />}
        {quote.priceToBook != null && <StatItem label="Price/Book" value={quote.priceToBook.toFixed(2)} />}
        {quote.beta != null && <StatItem label="Beta" value={quote.beta.toFixed(2)} />}
        {quote.dividendYield != null && quote.dividendYield > 0 && <StatItem label="Div Yield" value={`${(quote.dividendYield * 100).toFixed(2)}%`} />}
        {quote.earningsTimestamp != null && <StatItem label="Next Earnings" value={new Date(quote.earningsTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />}
        {quote.fullTimeEmployees != null && <StatItem label="Employees" value={quote.fullTimeEmployees.toLocaleString()} />}
      </View>

      {/* News */}
      <StockNews symbol={upperSymbol} />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function RangeBarMobile({ low, high, current, label }: { low: number; high: number; current: number; label: string }) {
  const pct = high > low ? ((current - low) / (high - low)) * 100 : 50;
  return (
    <View style={rangeStyles.container}>
      <Text style={rangeStyles.label}>{label}</Text>
      <View style={rangeStyles.row}>
        <Text style={rangeStyles.value}>{low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <View style={rangeStyles.track}>
          <View style={[rangeStyles.dot, { left: `${Math.min(Math.max(pct, 0), 100)}%` }]} />
        </View>
        <Text style={rangeStyles.value}>{high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      </View>
    </View>
  );
}

const rangeStyles = StyleSheet.create({
  container: { marginBottom: 6 },
  label: { fontSize: 12, color: '#6b7280', fontWeight: '500', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 13, fontWeight: '600', minWidth: 55 },
  track: { flex: 1, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, position: 'relative' },
  dot: { position: 'absolute', top: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: '#6b7280', borderWidth: 2, borderColor: '#fff', marginLeft: -5 },
});

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StockNews({ symbol }: { symbol: string }) {
  const { data: news } = useNews(symbol);

  if (!news || news.length === 0) return null;

  const sorted = [...news].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 10);

  return (
    <View style={styles.newsSection}>
      <Text style={styles.newsTitle}>News</Text>
      {sorted.map((n) => (
        <TouchableOpacity key={n.id} style={styles.newsRow} onPress={() => WebBrowser.openBrowserAsync(n.url)} activeOpacity={0.7}>
          <Text style={styles.newsHeadline} numberOfLines={2}>{n.headline}</Text>
          <View style={styles.newsMetaRow}>
            <Text style={styles.newsSource}>{n.source}</Text>
            <Text style={styles.newsMeta}> · {timeAgo(n.publishedAt)}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#dc2626', fontSize: 14 },
  header: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  symbol: { fontSize: 24, fontWeight: 'bold' },
  name: { fontSize: 14, color: '#6b7280' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 4 },
  price: { fontSize: 32, fontWeight: '600' },
  change: { fontSize: 16, fontWeight: '500' },
  extRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16 },
  extLabel: { fontSize: 12, color: '#9ca3af' },
  extPrice: { fontSize: 14, fontWeight: '500' },
  extChange: { fontSize: 12, fontWeight: '500' },
  rangeRow: { flexDirection: 'row', marginTop: 8, marginBottom: 16 },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: '#f3f4f6', marginRight: 6 },
  rangeBtnActive: { backgroundColor: '#2563eb' },
  rangeBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  rangeBtnTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: '600' },
  analystRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  rangesSection: { marginBottom: 12 },
  recBadge: { fontSize: 15, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  targetText: { fontSize: 14, color: '#6b7280' },
  targetPrice: { fontSize: 16, fontWeight: '700', color: '#111827' },
  analystCount: { fontSize: 12, color: '#9ca3af' },
  upside: { fontSize: 14, fontWeight: '700' },
  newsSection: { marginTop: 20 },
  newsTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  newsRow: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  newsHeadline: { fontSize: 15, fontWeight: '600', marginBottom: 5, lineHeight: 21 },
  newsMetaRow: { flexDirection: 'row', alignItems: 'center' },
  newsSource: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  newsMeta: { fontSize: 13, color: '#9ca3af' },
});
