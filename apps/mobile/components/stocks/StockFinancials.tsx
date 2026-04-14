import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useState } from 'react';
import { useFinancials, formatCompactNumber } from '@alpha-stocks/core';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width - 32;
const CHART_HEIGHT = 290;
const Y_LABEL_WIDTH = 42;
const CHART_INNER_WIDTH = SCREEN_WIDTH - Y_LABEL_WIDTH;
const Y_TICKS = 6;
const TOP_PADDING = 30; // room for YoY labels

type ChartMode = 'annual' | 'quarterly';

function fmtCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function fmtCompact2(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function BarChart({
  data,
  labels,
}: {
  data: { revenue: number; netIncome: number }[];
  labels: string[];
}) {
  const [selected, setSelected] = useState<number | null>(null);

  if (data.length === 0) return null;

  const allVals = data.flatMap((d) => [d.revenue, d.netIncome]);
  const maxVal = Math.max(...allVals.map(Math.abs)) || 1;

  const barArea = CHART_HEIGHT - TOP_PADDING - 20;
  const ticks = Array.from({ length: Y_TICKS }, (_, i) => {
    const value = maxVal - (maxVal * i) / (Y_TICKS - 1);
    const y = TOP_PADDING + (i / (Y_TICKS - 1)) * barArea;
    return { value, y };
  });

  const barGroupWidth = CHART_INNER_WIDTH / data.length;
  const barWidth = Math.min(barGroupWidth * 0.38, 20);
  const gap = 2;

  return (
    <View>
      <View style={barStyles.legend}>
        <View style={barStyles.legendItem}>
          <View style={[barStyles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={barStyles.legendText}>Revenue</Text>
        </View>
        <View style={barStyles.legendItem}>
          <View style={[barStyles.legendDot, { backgroundColor: '#fbbf24' }]} />
          <Text style={barStyles.legendText}>Net Income</Text>
        </View>
      </View>
      <View>
        <Svg width={SCREEN_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines and Y labels */}
          {ticks.map((tick, i) => (
            <Line key={`g${i}`} x1={Y_LABEL_WIDTH} y1={tick.y} x2={SCREEN_WIDTH} y2={tick.y} stroke="#f3f4f6" strokeWidth={1} />
          ))}
          {ticks.map((tick, i) => (
            <SvgText key={`t${i}`} x={Y_LABEL_WIDTH - 6} y={tick.y + 4} fontSize={12} fill="#4b5563" textAnchor="end">
              {fmtCompact(tick.value)}
            </SvgText>
          ))}
          {/* Bars */}
          {data.map((d, i) => {
            const cx = Y_LABEL_WIDTH + barGroupWidth * i + barGroupWidth / 2;
            const revH = (d.revenue / maxVal) * barArea;
            const niH = (Math.abs(d.netIncome) / maxVal) * barArea;
            const revTop = TOP_PADDING + barArea - revH;
            const dimmed = selected !== null && selected !== i;
            return (
              <View key={i}>
                <Rect
                  x={cx - barWidth - gap / 2}
                  y={revTop}
                  width={barWidth}
                  height={revH}
                  rx={2}
                  fill="#3b82f6"
                  opacity={dimmed ? 0.3 : 1}
                />
                <Rect
                  x={cx + gap / 2}
                  y={TOP_PADDING + barArea - niH}
                  width={barWidth}
                  height={niH}
                  rx={2}
                  fill="#fbbf24"
                  opacity={dimmed ? 0.3 : 1}
                />
              </View>
            );
          })}
          {/* X labels */}
          {labels.map((label, i) => {
            const cx = Y_LABEL_WIDTH + barGroupWidth * i + barGroupWidth / 2;
            return (
              <SvgText key={`x${i}`} x={cx} y={CHART_HEIGHT - 4} fontSize={11} fill="#4b5563" textAnchor="middle">
                {label}
              </SvgText>
            );
          })}
        </Svg>
        {/* YoY labels as native Text (SVG text renders poorly on Android) */}
        {data.map((d, i) => {
          const prevRevenue = i > 0 ? data[i - 1].revenue : null;
          const yoyGrowth = prevRevenue && prevRevenue > 0
            ? ((d.revenue - prevRevenue) / prevRevenue) * 100
            : null;
          if (yoyGrowth === null) return null;
          const cx = Y_LABEL_WIDTH + barGroupWidth * i + barGroupWidth / 2;
          const revH = (d.revenue / maxVal) * barArea;
          const revTop = TOP_PADDING + barArea - revH;
          const dimmed = selected !== null && selected !== i;
          return (
            <Text
              key={`yoy${i}`}
              style={{
                position: 'absolute',
                top: revTop - 18,
                left: cx - barWidth * 1.5 - gap,
                width: barWidth * 2,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: '700',
                color: yoyGrowth >= 0 ? '#16a34a' : '#dc2626',
                opacity: dimmed ? 0.3 : 1,
              }}
            >
              {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(0)}%
            </Text>
          );
        })}
        {/* Touch overlays for bar tap */}
        {data.map((_, i) => (
          <TouchableOpacity
            key={`tap${i}`}
            activeOpacity={1}
            onPress={() => setSelected(selected === i ? null : i)}
            style={{
              position: 'absolute',
              left: Y_LABEL_WIDTH + barGroupWidth * i,
              top: 0,
              width: barGroupWidth,
              height: CHART_HEIGHT,
            }}
          />
        ))}
        {/* Tooltip popup */}
        {selected !== null && (() => {
          const d = data[selected];
          const label = labels[selected];
          const prevRevenue = selected > 0 ? data[selected - 1].revenue : null;
          const yoyGrowth = prevRevenue && prevRevenue > 0
            ? ((d.revenue - prevRevenue) / prevRevenue) * 100
            : null;
          const cx = Y_LABEL_WIDTH + barGroupWidth * selected + barGroupWidth / 2;
          const revH = (d.revenue / maxVal) * barArea;
          const tooltipTop = TOP_PADDING + barArea - revH - 80;
          const tooltipLeft = Math.min(Math.max(cx - 80, 0), SCREEN_WIDTH - 160);
          return (
            <View style={[barStyles.tooltip, { top: Math.max(tooltipTop, 0), left: tooltipLeft }]}>
              <Text style={barStyles.tooltipTitle}>{label}</Text>
              <View style={barStyles.tooltipRow}>
                <View style={[barStyles.tooltipDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={barStyles.tooltipLabel}>Revenue:</Text>
                <Text style={barStyles.tooltipValue}>{fmtCompact2(d.revenue)}</Text>
              </View>
              <View style={barStyles.tooltipRow}>
                <View style={[barStyles.tooltipDot, { backgroundColor: '#fbbf24' }]} />
                <Text style={barStyles.tooltipLabel}>Net Income:</Text>
                <Text style={barStyles.tooltipValue}>{fmtCompact2(d.netIncome)}</Text>
              </View>
              {yoyGrowth !== null && (
                <Text style={[barStyles.tooltipYoy, { color: yoyGrowth >= 0 ? '#16a34a' : '#dc2626' }]}>
                  YoY: {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                </Text>
              )}
            </View>
          );
        })()}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 14, color: '#4b5563' },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipTitle: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 5 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  tooltipDot: { width: 8, height: 8, borderRadius: 4 },
  tooltipLabel: { color: '#9ca3af', fontSize: 14 },
  tooltipValue: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tooltipYoy: { fontWeight: '600', fontSize: 14, marginTop: 3 },
});

export default function StockFinancials({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = useFinancials(symbol);
  const [chartMode, setChartMode] = useState<ChartMode>('annual');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading financial data...</Text>
      </View>
    );
  }

  if (error || !data) {
    return <Text style={styles.emptyText}>Financial data unavailable for {symbol}.</Text>;
  }

  const { annualFinancials, quarterlyEarnings } = data;
  const hasAnnual = annualFinancials.length > 0;
  const hasEarnings = quarterlyEarnings && quarterlyEarnings.length > 0;

  const annualChartData = annualFinancials.slice(-6).map((d) => ({
    revenue: d.revenue,
    netIncome: d.netIncome,
  }));
  const annualLabels = annualFinancials.slice(-6).map((d) => d.date.slice(0, 4));

  const quarterlyFiltered = hasEarnings
    ? quarterlyEarnings.filter((q) => q.revenue != null && q.revenue > 0).slice(-6)
    : [];
  const quarterlyChartData = quarterlyFiltered.map((q) => ({
    revenue: q.revenue ?? 0,
    netIncome: q.earnings ?? 0,
  }));
  const quarterlyLabels = quarterlyFiltered.map((q) => q.quarter);
  const hasQuarterly = quarterlyChartData.length > 0;

  const earningsDisplay = hasEarnings ? [...quarterlyEarnings.slice(-8)].reverse() : [];

  if (!hasAnnual && !hasQuarterly && !hasEarnings) {
    return <Text style={styles.emptyText}>Financial data unavailable for {symbol}.</Text>;
  }

  const showChart = chartMode === 'annual' ? hasAnnual : hasQuarterly;
  const chartData = chartMode === 'annual' ? annualChartData : quarterlyChartData;
  const chartLabels = chartMode === 'annual' ? annualLabels : quarterlyLabels;

  return (
    <View>
      {/* Revenue & Net Income Chart */}
      {(hasAnnual || hasQuarterly) && (
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Revenue & Net Income</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, chartMode === 'annual' && styles.toggleBtnActive]}
                onPress={() => setChartMode('annual')}
              >
                <Text style={[styles.toggleText, chartMode === 'annual' && styles.toggleTextActive]}>Annual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, chartMode === 'quarterly' && styles.toggleBtnActive]}
                onPress={() => setChartMode('quarterly')}
              >
                <Text style={[styles.toggleText, chartMode === 'quarterly' && styles.toggleTextActive]}>Quarterly</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showChart ? (
            <BarChart data={chartData} labels={chartLabels} />
          ) : (
            <Text style={styles.emptyText}>No {chartMode} data available.</Text>
          )}
        </View>
      )}

      {/* Quarterly Earnings Table */}
      {earningsDisplay.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quarterly Earnings</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header row */}
              <View style={tableStyles.row}>
                <Text style={[tableStyles.cell, tableStyles.headerCell, { width: 70 }]}>Quarter</Text>
                <Text style={[tableStyles.cell, tableStyles.headerCell, tableStyles.right, { width: 72 }]}>EPS Est.</Text>
                <Text style={[tableStyles.cell, tableStyles.headerCell, tableStyles.right, { width: 72 }]}>EPS Act.</Text>
                <Text style={[tableStyles.cell, tableStyles.headerCell, tableStyles.right, { width: 72 }]}>Revenue</Text>
                <Text style={[tableStyles.cell, tableStyles.headerCell, tableStyles.right, { width: 80 }]}>Net Income</Text>
                <Text style={[tableStyles.cell, tableStyles.headerCell, tableStyles.right, { width: 72 }]}>Surprise</Text>
              </View>
              {/* Data rows */}
              {earningsDisplay.map((q, i) => {
                const surprise = q.epsActual != null && q.epsEstimate != null && q.epsEstimate !== 0
                  ? ((q.epsActual - q.epsEstimate) / Math.abs(q.epsEstimate)) * 100
                  : null;
                return (
                  <View key={i} style={[tableStyles.row, i % 2 === 0 && tableStyles.rowAlt]}>
                    <Text style={[tableStyles.cell, tableStyles.boldCell, { width: 70 }]}>{q.quarter}</Text>
                    <Text style={[tableStyles.cell, tableStyles.right, { width: 72, color: '#6b7280' }]}>
                      {q.epsEstimate != null ? `$${q.epsEstimate.toFixed(2)}` : '—'}
                    </Text>
                    <Text style={[tableStyles.cell, tableStyles.boldCell, tableStyles.right, { width: 72 }]}>
                      {q.epsActual != null ? `$${q.epsActual.toFixed(2)}` : '—'}
                    </Text>
                    <Text style={[tableStyles.cell, tableStyles.right, { width: 72, color: '#6b7280' }]}>
                      {q.revenue != null ? formatCompactNumber(q.revenue) : '—'}
                    </Text>
                    <Text style={[tableStyles.cell, tableStyles.right, { width: 80, color: '#6b7280' }]}>
                      {q.earnings != null ? formatCompactNumber(q.earnings) : '—'}
                    </Text>
                    <Text style={[tableStyles.cell, tableStyles.right, tableStyles.boldCell, {
                      width: 72,
                      color: surprise != null ? (surprise >= 0 ? '#16a34a' : '#dc2626') : '#6b7280',
                    }]}>
                      {surprise != null ? `${surprise >= 0 ? '+' : ''}${surprise.toFixed(1)}%` : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 13, color: '#9ca3af', marginTop: 8 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 5 },
  toggleBtnActive: { backgroundColor: '#2563eb' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: '#fff' },
});

const tableStyles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowAlt: { backgroundColor: '#fafafa' },
  cell: { fontSize: 12, paddingVertical: 8, paddingHorizontal: 4 },
  headerCell: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  boldCell: { fontWeight: '600' },
  right: { textAlign: 'right' },
});
