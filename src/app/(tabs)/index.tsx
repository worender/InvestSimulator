import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CandlestickChart, LineChart } from 'react-native-wagmi-charts';
import { CandleData, getStockCandles } from '../../api/marketService';
import { useTheme } from '../../theme';

type CandleInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1wk';
type ChartRange = { label: string; days: number };

const ranges: ChartRange[] = [
  { label: '1D', days: 1 },
  { label: '5D', days: 5 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1R', days: 365 },
];

const intervals: { label: string; value: CandleInterval }[] = [
  { label: '15 min', value: '15m' },
  { label: '1 godz.', value: '1h' },
  { label: '1 dzień', value: '1d' },
  { label: '1 tydz.', value: '1wk' },
];

type TrendAsset = {
  symbol: string;
  name: string;
  market: string;
  icon: keyof typeof Ionicons.glyphMap;
  unit: string;
};

const trendAssets: TrendAsset[] = [
  { symbol: 'GC=F', name: 'Złoto', market: 'COMEX', icon: 'sparkles-outline', unit: 'USD / uncję' },
  { symbol: 'BTC-USD', name: 'Bitcoin', market: 'Krypto', icon: 'logo-bitcoin', unit: 'USD' },
  { symbol: 'CL=F', name: 'Ropa WTI', market: 'NYMEX', icon: 'flame-outline', unit: 'USD / baryłkę' },
];

export default function Index() {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [trendData, setTrendData] = useState<Record<string, CandleData[]>>({});
  const [trendLoading, setTrendLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(1);
  const [selectedInterval, setSelectedInterval] = useState<CandleInterval>('1h');
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const symbol = 'PKO';
  const chartWidth = Math.max(screenWidth - 80, 1);
  const trendChartWidth = Math.max(screenWidth - 76, 1);
  const range = ranges[selectedRange];
  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];
  const change = latestCandle && previousCandle ? latestCandle.close - previousCandle.close : 0;
  const changePercent = previousCandle ? (change / previousCandle.close) * 100 : 0;
  const axisCandles = candles.length > 2
    ? [candles[0], candles[Math.floor(candles.length / 2)], candles[candles.length - 1]]
    : candles;

  useEffect(() => {
    const fetchCandles = async () => {
      setLoading(true);
      const data = await getStockCandles(symbol, selectedInterval, range.days);
      setCandles(data ?? []);
      setLoading(false);
    };

    fetchCandles();
  }, [range.days, selectedInterval]);

  useEffect(() => {
    const fetchTrends = async () => {
      setTrendLoading(true);
      const responses = await Promise.all(
        trendAssets.map(async (asset) => [asset.symbol, (await getStockCandles(asset.symbol, '1d', 30)) ?? []] as const),
      );
      setTrendData(Object.fromEntries(responses));
      setTrendLoading(false);
    };

    fetchTrends();
  }, []);

  const formatPrice = (price?: number) => price === undefined ? '--' : price.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + Math.ceil(bottom / 2) }]}
    >
      <View style={styles.heading}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>EDUKACYJNY SYMULATOR</Text>
        </View>
      </View>

      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitle}>
              <Text style={[styles.label, { color: colors.textMuted }]}>PKO BANK POLSKI</Text>
              <Text style={[styles.price, { color: colors.text }]}>{formatPrice(latestCandle?.close)} zł</Text>
              <Text style={{ color: change >= 0 ? colors.positive : colors.negative }}>
                {change >= 0 ? '+' : ''}{formatPrice(change)} zł ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </Text>
            </View>
            <View style={[styles.marketBadge, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.positive }]} />
              <Text style={[styles.marketBadgeText, { color: colors.textMuted }]}>GPW</Text>
            </View>

          </View>

          <Text style={[styles.chartDescription, { color: colors.textMuted }]}>
            Świece pokazują cenę otwarcia, zamknięcia oraz minimum i maksimum w wybranym okresie.
          </Text>

          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>ZAKRES</Text>
          <View style={styles.buttonRow}>
            {ranges.map((item, index) => (
              <ChartButton
                key={item.label}
                label={item.label}
                active={selectedRange === index}
                onPress={() => setSelectedRange(index)}
                colors={colors}
              />
            ))}
          </View>

          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>INTERWAŁ ŚWIECY</Text>
          <View style={styles.buttonRow}>
            {intervals.map((item) => (
              <ChartButton
                key={item.value}
                label={item.label}
                active={selectedInterval === item.value}
                onPress={() => setSelectedInterval(item.value)}
                colors={colors}
              />
            ))}
          </View>

          <View style={styles.chartWrap}>
            {loading ? (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>Pobieranie danych PKO...</Text>
              </View>
            ) : candles.length > 0 ? (
              <CandlestickChart.Provider data={candles}>
                <CandlestickChart width={chartWidth} height={280}>
                  <CandlestickChart.Candles />
                  <CandlestickChart.Crosshair>
                    <CandlestickChart.Tooltip />
                  </CandlestickChart.Crosshair>
                </CandlestickChart>
                <View style={styles.crosshairDate}>
                  <CandlestickChart.DatetimeText locale="pl-PL" style={{ color: colors.textMuted, fontSize: 11 }} />
                </View>
              </CandlestickChart.Provider>
            ) : (
              <View style={styles.chartPlaceholder}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                  Brak notowań w wybranym dniu
                </Text>
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  Giełda jest zamknięta w weekendy i dni wolne. Wybierz większy zakres, aby zobaczyć dostępne dane.
                </Text>
              </View>
            )}
          </View>

          {candles.length > 0 && (
            <View style={[styles.timeAxis, { borderTopColor: colors.border }]}>
              {axisCandles.map((candle, index) => (
                <Text
                  key={`${candle.timestamp}-${index}`}
                  style={[styles.timeAxisText, { color: colors.textMuted }]}
                >
                  {formatCandleTime(candle.timestamp, selectedInterval)}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.positive }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>wzrost</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.negative }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>spadek</Text>
            </View>
          </View>

        </View>

        <View>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Popularne trendy</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Rynki, które warto obserwować
              </Text>
            </View>
            <Ionicons name="flame-outline" size={22} color={colors.accent} />
          </View>
          {trendLoading ? (
            <View style={[styles.trendLoading, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.placeholderText, { color: colors.textMuted }]}>Pobieranie trendów...</Text>
            </View>
          ) : (
            <View style={styles.trendList}>
              {trendAssets.map((asset) => (
                <TrendCard
                  key={asset.symbol}
                  asset={asset}
                  candles={trendData[asset.symbol] ?? []}
                  colors={colors}
                  width={trendChartWidth}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

type TrendCardProps = {
  asset: TrendAsset;
  candles: CandleData[];
  colors: ReturnType<typeof useTheme>['colors'];
  width: number;
};

function TrendCard({ asset, candles, colors, width }: TrendCardProps) {
  const first = candles[0];
  const latest = candles[candles.length - 1];
  const changePercent = first ? ((latest.close - first.close) / first.close) * 100 : undefined;
  const chartData = candles.map((candle) => ({ timestamp: candle.timestamp, value: candle.close }));
  const isPositive = (changePercent ?? 0) >= 0;

  return (
    <View style={[styles.trendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.trendHeader}>
        <View style={[styles.assetIcon, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name={asset.icon} size={19} color={colors.accent} />
        </View>
        <View style={styles.trendName}>
          <Text style={[styles.assetTitle, { color: colors.text }]}>{asset.name}</Text>
          <Text style={[styles.assetSymbol, { color: colors.textMuted }]}>{asset.market} · {asset.unit}</Text>
        </View>
        <View style={styles.assetValue}>
          <Text style={[styles.assetPrice, { color: colors.text }]}>
            {latest ? latest.close.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) : '--'}
          </Text>
          <Text style={{ color: isPositive ? colors.positive : colors.negative }}>
            {changePercent === undefined ? '--' : `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`}
          </Text>
        </View>
      </View>
      {chartData.length > 1 ? (
        <View style={styles.trendChart}>
          <LineChart.Provider data={chartData}>
            <LineChart width={width} height={82} yGutter={10}>
              <LineChart.Path color={isPositive ? colors.positive : colors.negative} width={2} />
            </LineChart>
          </LineChart.Provider>
          <View style={styles.trendAxis}>
            <Text style={[styles.trendAxisText, { color: colors.textMuted }]}>
              {first ? formatTrendDate(first.timestamp) : '--'}
            </Text>
            <Text style={[styles.trendAxisSeparator, { color: colors.textMuted }]}></Text>
            <Text style={[styles.trendAxisText, styles.trendAxisEnd, { color: colors.textMuted }]}>
              {latest ? formatTrendDate(latest.timestamp) : '--'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.trendUnavailable, { color: colors.textMuted }]}>Brak danych trendu</Text>
      )}
    </View>
  );
}

type ChartButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
};

function ChartButton({ label, active, onPress, colors }: ChartButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chartButton,
        { backgroundColor: active ? colors.accent : colors.surfaceMuted },
      ]}
    >
      <Text style={[styles.chartButtonText, { color: active ? colors.background : colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatCandleTime(timestamp: number, interval: CandleInterval) {
  const options: Intl.DateTimeFormatOptions = interval === '1m' || interval === '5m' || interval === '15m' || interval === '1h'
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };

  return new Date(timestamp).toLocaleString('pl-PL', options);
}

function formatTrendDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
  });
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 32 },
  container: { gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chartTitle: { flex: 1 },
  marketBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  marketBadgeText: { fontSize: 10, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 8, padding: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  price: { fontSize: 30, fontWeight: '700', marginTop: 6, letterSpacing: -1 },
  chartDescription: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  controlLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chartButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 6 },
  chartButtonText: { fontSize: 12, fontWeight: '700' },
  chartWrap: { minHeight: 280, marginTop: 16, overflow: 'hidden' },
  chartPlaceholder: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  placeholderTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  placeholderText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  crosshairDate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 },
  crosshairHint: { alignItems: 'center', marginTop: 2 },
  crosshairDateText: { fontSize: 11 },
  timeAxis: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  timeAxisText: { flex: 1, fontSize: 10, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 30, marginBottom: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 10 },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  trendList: { gap: 10 },
  trendCard: { borderWidth: 1, borderRadius: 8, padding: 14 },
  trendHeader: { flexDirection: 'row', alignItems: 'center' },
  trendName: { flex: 1, marginLeft: 10 },
  trendChart: { height: 100, alignItems: 'center', marginTop: 6, overflow: 'hidden' },
  trendAxis: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  trendAxisText: { flex: 1, fontSize: 10 },
  trendAxisEnd: { textAlign: 'right' },
  trendAxisSeparator: { fontSize: 10, marginHorizontal: 6 },
  trendLoading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 8 },
  trendUnavailable: { fontSize: 12, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  assetIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  assetName: { flex: 1, marginLeft: 12 },
  assetTitle: { fontSize: 15, fontWeight: '600' },
  assetSymbol: { fontSize: 12, marginTop: 3 },
  assetValue: { alignItems: 'flex-end' },
  assetPrice: { fontSize: 14, fontWeight: '600' },
  disclaimer: { fontSize: 12, marginTop: 22, lineHeight: 18 },
});
