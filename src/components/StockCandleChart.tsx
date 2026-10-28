import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { CandleData, getStockCandles } from '../api/marketService';
import { currencySymbol } from '../currency';
import { useTheme } from '../theme';
import {
  CHART_INTERVALS,
  CHART_RANGES,
  ChartFullscreenModal,
  ChartInterval,
  DEFAULT_CHART_INTERVAL,
  DEFAULT_CHART_RANGE_INDEX,
  formatCandleTime,
  isIntradayInterval,
} from './ChartFullscreenModal';
import { Skeleton } from './Skeleton';

type StockCandleChartProps = {
  stock?: string;
  title?: string;
  exchange?: string;
  currency?: string;
  variant?: 'card' | 'embedded';
};

// Komponent wyświetlający wykres świecowy dla danego aktywa giełdowego
export function StockCandleChart({
  stock = 'PKO',
  title = 'PKO BANK POLSKI',
  currency = 'zł',
  exchange = 'GPW',
  variant = 'card',
}: StockCandleChartProps) {
  const { colors } = useTheme();
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [rangeIndex, setRangeIndex] = useState(DEFAULT_CHART_RANGE_INDEX);
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_CHART_INTERVAL);
  const [loading, setLoading] = useState(true);
  // Pełnoekranowy widok wykresu (wspólny komponent dla każdego wykresu świecowego).
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const range = CHART_RANGES[rangeIndex];
  const intradayDisabled = range.days > 60;
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const change = latest && previous ? latest.close - previous.close : 0;
  const changePercent = previous ? (change / previous.close) * 100 : 0;
  const formatPrice = (value?: number) => value === undefined ? '--' : value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const requestedInterval = intradayDisabled && isIntradayInterval(interval) ? '1d' : interval;
      const data = await getStockCandles(stock, requestedInterval, range.days, exchange);
      if (active) {
        setCandles(data ?? []);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [stock, range.days, interval, intradayDisabled, exchange]);

  const axis = candles.length > 2 ? [candles[0], candles[Math.floor(candles.length / 2)], latest] : candles;

  const isEmbedded = variant === 'embedded';
  const unit = currencySymbol(currency);

  return (
    <View
      style={
        isEmbedded
          ? styles.embedded
          : styles.card
      }
    >
      <View style={styles.header}>
        <View style={styles.titleCopy}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{title}</Text>
          <Text style={[styles.price, { color: colors.text }]}>{formatPrice(latest?.close)} {unit}</Text>
          <Text style={{ color: change >= 0 ? colors.positive : colors.negative, fontWeight: '600' }}>
            {change >= 0 ? '+' : ''}{formatPrice(change)} {unit} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={[styles.badge, { backgroundColor: colors.surfaceMutedGlass, borderColor: colors.borderGlass }]}>
            <Ionicons name="business-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>{exchange}</Text>
          </View>
          <Pressable
            onPress={() => setFullscreenVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Powiększ wykres na pełny ekran"
            hitSlop={8}
            style={({ pressed }) => [
              styles.expandBtn,
              {
                backgroundColor: colors.surfaceMutedGlass,
                borderColor: colors.borderGlass,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons name="expand-outline" size={15} color={colors.accent} />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.controlLabel, { color: colors.textMuted }]}>ZAKRES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controls}>
        {CHART_RANGES.map((item, index) => (
          <ChartButton key={item.label} label={item.label} active={index === rangeIndex} onPress={() => {
            setRangeIndex(index);
            if (item.days > 60 && isIntradayInterval(interval)) setInterval('1d');
          }} colors={colors} />
        ))}
      </ScrollView>
      <Text style={[styles.controlLabel, { color: colors.textMuted }]}>INTERWAŁ</Text>
      {intradayDisabled && <Text style={[styles.hint, { color: colors.textMuted }]}>Dla zakresu powyżej 60 dni dostępne są dane dzienne lub tygodniowe.</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controls}>
        {CHART_INTERVALS.map((item) => (
          <ChartButton key={item.value} label={item.label} active={item.value === interval}
            disabled={intradayDisabled && isIntradayInterval(item.value)} onPress={() => setInterval(item.value)} colors={colors} />
        ))}
      </ScrollView>
      <View style={styles.chart}>
        {loading ? <View style={styles.skeletonChart}>
          <View style={styles.skeletonHeader}><Skeleton width="42%" height={16} /><Skeleton width={72} height={16} /></View>
          <Skeleton width="100%" height={1} radius={0} style={styles.skeletonLine} />
          <Skeleton width="100%" height={1} radius={0} style={styles.skeletonLine} />
          <Skeleton width="100%" height={1} radius={0} style={styles.skeletonLine} />
          <Skeleton width="72%" height={5} radius={3} style={styles.skeletonTrend} />
          <Text style={[styles.muted, { color: colors.textMuted }]}>Pobieranie danych...</Text>
        </View>
          : candles.length === 0 ? <View style={styles.placeholder}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={[styles.muted, { color: colors.textMuted }]}>Brak notowań dla tego zakresu.</Text></View>
            : <CandlestickChart.Provider data={candles}>
              <CandlestickChart height={280}><CandlestickChart.Candles useAnimations={false} /><CandlestickChart.Crosshair minDurationMs={320}><CandlestickChart.Tooltip /></CandlestickChart.Crosshair></CandlestickChart>
              <View style={styles.crosshair}><CandlestickChart.DatetimeText locale="pl-PL" style={{ color: colors.textMuted, fontSize: 11 }} /></View>
            </CandlestickChart.Provider>}
            
      </View>
      {candles.length > 0 && <View style={[styles.axis, { borderTopColor: colors.borderGlass }]}>
        {axis.map((item, index) => <Text key={`${item.timestamp}-${index}`} style={[styles.axisText, { color: colors.textMuted }]}>{formatCandleTime(item.timestamp, interval)}</Text>)}
      </View>}

      {/* Pełnoekranowy widok tego samego wykresu z siatką, OHLC i legendą */}
      <ChartFullscreenModal
        visible={fullscreenVisible}
        onClose={() => setFullscreenVisible(false)}
        stock={stock}
        title={title}
        exchange={exchange}
        currency={currency}
        initialRangeIndex={rangeIndex}
        initialInterval={interval}
      />
    </View>
  );
}

// Komponent przycisku wyboru zakresu lub interwału wykresu
function ChartButton({ label, active, disabled = false, onPress, colors }: { label: string; active: boolean; disabled?: boolean; onPress: () => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.button,
        {
          backgroundColor: active ? colors.accent : colors.surfaceMutedGlass,
          borderColor: active ? colors.accent : colors.borderGlass,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? '#ffffff' : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

// Stylesheet dla komponentu StockCandleChart (wykres świecowy)
const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  embedded: { backgroundColor: 'transparent', paddingVertical: 8, paddingHorizontal: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleCopy: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  price: { fontSize: 28, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expandBtn: { width: 30, height: 30, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  description: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  controlLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  controls: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  button: { minHeight: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  chart: { minHeight: 280, marginTop: 16, overflow: 'hidden' },
  placeholder: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 9 },
  muted: { fontSize: 13, textAlign: 'center' },
  skeletonChart: { minHeight: 280, justifyContent: 'center', gap: 22, paddingVertical: 20 },
  skeletonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skeletonLine: { marginVertical: 4 },
  skeletonTrend: { alignSelf: 'center', marginTop: 8 },
  crosshair: { alignItems: 'center', marginTop: 4 },
  interactionHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 },
  interactionHintText: { fontSize: 10, fontWeight: '600' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  axisText: { fontSize: 10, fontWeight: '500' },
});
