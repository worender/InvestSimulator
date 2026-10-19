import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { CandleData, getInstrumentQuote, getStockCandles, InstrumentQuote } from '../api/marketService';
import { Skeleton } from './Skeleton';
import { useTheme } from '../theme';

type CandleInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1wk';
type ChartRange = { label: string; days: number };

const ranges: ChartRange[] = [
  { label: '1D', days: 1 }, { label: '5D', days: 5 }, { label: '1M', days: 30 },
  { label: '3M', days: 90 }, { label: '1R', days: 365 },
];
const intervals: { label: string; value: CandleInterval }[] = [
  { label: '15 min', value: '15m' }, { label: '1 godz.', value: '1h' },
  { label: '1 dzień', value: '1d' }, { label: '1 tydz.', value: '1wk' },
];
const DEFAULT_RANGE_INDEX = 1;
const DEFAULT_INTERVAL: CandleInterval = '1h';
const intraday = (value: CandleInterval) => ['1m', '5m', '15m', '1h'].includes(value);

type StockCandleChartProps = { stock?: string; title?: string; exchange?: string };

type CurrencySymbol = 'zł' | '€' | '$';

export function StockCandleChart({ stock = 'PKO', title = 'PKO BANK POLSKI', currency = 'zł', exchange = 'GPW' }: StockCandleChartProps & { currency?: CurrencySymbol }) {
  const { colors } = useTheme();
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [rangeIndex, setRangeIndex] = useState(DEFAULT_RANGE_INDEX);
  const [interval, setInterval] = useState<CandleInterval>(DEFAULT_INTERVAL);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<InstrumentQuote | null>(null);
  const range = ranges[rangeIndex];
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
      setQuote(null);
      const requestedInterval = intradayDisabled && intraday(interval) ? '1d' : interval;
      const [data, currentQuote] = await Promise.all([
        getStockCandles(stock, requestedInterval, range.days, exchange),
        getInstrumentQuote(stock, exchange),
      ]);
      if (active) {
        setCandles(data ?? []);
        setQuote(currentQuote);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [stock, range.days, interval, intradayDisabled, exchange]);

  const axis = candles.length > 2 ? [candles[0], candles[Math.floor(candles.length / 2)], latest] : candles;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleCopy}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{title}</Text>
          <Text style={[styles.price, { color: colors.text }]}>{formatPrice(latest?.close)} {currency}</Text>
          <Text style={{ color: change >= 0 ? colors.positive : colors.negative }}>
            {change >= 0 ? '+' : ''}{formatPrice(change)} {currency} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.dot, { backgroundColor: quote?.isOpen ? colors.positive : colors.negative }]} />
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>{quote?.exchange ?? 'Ładowanie...'}</Text>
          {quote && <Text style={[styles.marketState, { color: quote.isOpen ? colors.positive : colors.negative }]}>{quote.isOpen ? 'open' : 'closed'}</Text>}
        </View>
      </View>
      <Text style={[styles.controlLabel, { color: colors.textMuted }]}>ZAKRES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controls}>
        {ranges.map((item, index) => (
          <ChartButton key={item.label} label={item.label} active={index === rangeIndex} onPress={() => {
            setRangeIndex(index);
            if (item.days > 60 && intraday(interval)) setInterval('1d');
          }} colors={colors} />
        ))}
      </ScrollView>
      <Text style={[styles.controlLabel, { color: colors.textMuted }]}>INTERWAŁ</Text>
      {intradayDisabled && <Text style={[styles.hint, { color: colors.textMuted }]}>Dla zakresu powyżej 60 dni dostępne są dane dzienne lub tygodniowe.</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controls}>
        {intervals.map((item) => (
          <ChartButton key={item.value} label={item.label} active={item.value === interval}
            disabled={intradayDisabled && intraday(item.value)} onPress={() => setInterval(item.value)} colors={colors} />
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
              <CandlestickChart height={280}><CandlestickChart.Candles useAnimations={false} /><CandlestickChart.Crosshair><CandlestickChart.Tooltip /></CandlestickChart.Crosshair></CandlestickChart>
              <View style={styles.crosshair}><CandlestickChart.DatetimeText locale="pl-PL" style={{ color: colors.textMuted, fontSize: 11 }} /></View>
            </CandlestickChart.Provider>}
      </View>
      {candles.length > 0 && <View style={[styles.axis, { borderTopColor: colors.border }]}>
        {axis.map((item, index) => <Text key={`${item.timestamp}-${index}`} style={[styles.axisText, { color: colors.textMuted }]}>{formatTime(item.timestamp, interval)}</Text>)}
      </View>}
    </View>
  );
}

function ChartButton({ label, active, disabled = false, onPress, colors }: { label: string; active: boolean; disabled?: boolean; onPress: () => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" style={[styles.button, { backgroundColor: active ? colors.accent : colors.surfaceMuted, opacity: disabled ? 0.4 : 1 }]}>
    <Text style={{ color: active ? colors.background : colors.textMuted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
  </Pressable>;
}

function formatTime(timestamp: number, interval: CandleInterval) {
  const options: Intl.DateTimeFormatOptions = intraday(interval)
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(timestamp).toLocaleString('pl-PL', options);
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleCopy: { flex: 1 }, label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  price: { fontSize: 30, fontWeight: '700', marginTop: 6 }, badge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 }, badgeText: { fontSize: 10, fontWeight: '700' }, marketState: { fontSize: 9, fontWeight: '700' },
  description: { fontSize: 12, lineHeight: 18, marginTop: 10 }, controlLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  controls: { flexDirection: 'row', gap: 8, paddingRight: 8 }, button: { minHeight: 34, paddingHorizontal: 12, borderRadius: 7, justifyContent: 'center' },
  hint: { fontSize: 11, lineHeight: 16, marginBottom: 8 }, chart: { minHeight: 280, marginTop: 16, overflow: 'hidden' },
  placeholder: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 9 }, muted: { fontSize: 13, textAlign: 'center' },
  skeletonChart: { minHeight: 280, justifyContent: 'center', gap: 22, paddingVertical: 20 },
  skeletonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skeletonLine: { marginTop: 4 }, skeletonTrend: { marginTop: 18 },
  crosshair: { alignItems: 'center', marginTop: 4 }, axis: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8 },
  axisText: { flex: 1, fontSize: 10, textAlign: 'center' },
});
