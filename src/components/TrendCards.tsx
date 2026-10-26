import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';
import { CandleData, DynamicTrendAsset, canRetryFetch, getDynamicTrends, getStockCandles, lastFetchErrorMap } from '../api/marketService';
import { notify } from '../notificationBus';
import { useTheme } from '../theme';
import { Skeleton } from './Skeleton';

type Category = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };
const categories: Category[] = [
  { key: 'gainers', label: 'Rosnące', icon: 'flame-outline' },
  { key: 'active', label: 'Aktywne', icon: 'pulse-outline' },
  { key: 'technology', label: 'Tech', icon: 'hardware-chip-outline' },
  { key: 'undervalued', label: 'Wartościowe', icon: 'diamond-outline' },
];

// Komponent wyświetlający karty trendów dla różnych kategorii aktywów giełdowych
export function TrendCards() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState('gainers');
  const [assets, setAssets] = useState<DynamicTrendAsset[]>([]);
  const [data, setData] = useState<Record<string, CandleData[]>>({});
  const [loadedCategory, setLoadedCategory] = useState('');
  const loading = loadedCategory !== category;

  useEffect(() => {
    let active = true;
    
    const loadTrendsAndCandles = async () => {
      try {
        // Pobierz trendy
        const trends = await getDynamicTrends(category);
        
        if (!active) return;
        setAssets(trends);

        // Pobierz świec dla każdego aktywa
        const candlesResults = await Promise.all(
          trends.map(async (asset) => {
            try {
              // Sprawdź czy można ponowić próbę po błędzie
              if (!canRetryFetch(asset.symbol)) {
                const state = lastFetchErrorMap.get(asset.symbol);
                const elapsedSeconds = Math.floor((Date.now() - (state?.timestamp ?? 0)) / 1000);
                notify({
                  variant: 'error',
                  title: 'Opóźnione pobieranie danych',
                  message: `Oczekiwanie na ponowną próbę pobrania danych świec dla ${asset.symbol}. Próba za ${elapsedSeconds} sekund...`,
                });
                return [asset.symbol, []] as const;
              }
              
              const candles = await getStockCandles(asset.symbol, '1d', 30, asset.exchange);
              return [asset.symbol, candles ?? []] as const;
            } catch (error) {
              console.error(`Błąd pobierania świec dla ${asset.symbol}:`, error);
              return [asset.symbol, []] as const;
            }
          })
        );

        if (active) {
          setData(Object.fromEntries(candlesResults));
          setLoadedCategory(category);
        }
      } catch (error) {
        console.error('Błąd ładowania trendów:', error);
        if (active) {
          notify({
            variant: 'error',
            title: 'Błąd ładowania trendów',
            message: 'Nie udało się pobrać danych trendów. Spróbuj ponownie później.',
          });
        }
      }
    };

    loadTrendsAndCandles();
    
    return () => { active = false; };
  }, [category]);

  return <View>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionContent}>
        <Text style={[styles.title, { color: colors.text }]}>Warte uwagi</Text>
        <View style={styles.categories}>
          {categories.map((item) => <Text key={item.key} onPress={() => setCategory(item.key)} style={[styles.category, { color: item.key === category ? colors.accent : colors.textMuted, borderBottomColor: item.key === category ? colors.accent : 'transparent' }]}>{item.label}</Text>)}
        </View>
      </View>
      <Ionicons name={categories.find((item) => item.key === category)?.icon ?? 'flame-outline'} size={34} color={colors.accent} />
    </View>
    {loading ? (
      <View>
        {[1, 2, 3].map((item) => (
          <View key={item} style={[styles.item, item < 3 && { borderBottomColor: colors.borderGlass }]}>
            <View style={styles.row}>
              <Skeleton width={34} height={34} radius={17} />
              <View style={styles.copy}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="38%" height={10} style={{ marginTop: 6 }} />
              </View>
              <Skeleton width={42} height={14} />
            </View>
            <View style={styles.chartSkeleton}>
              <Skeleton width="100%" height={1} radius={0} style={styles.chartLineTop} />
              <Skeleton width="100%" height={1} radius={0} style={styles.chartLineMiddle} />
              <Skeleton width="100%" height={1} radius={0} style={styles.chartLineBottom} />
              <Skeleton width="70%" height={4} radius={3} style={styles.chartStroke} />
            </View>
          </View>
        ))}
      </View>
    ) : (
      <View>
        {assets.slice(0, 3).map((asset, index) => (
          <TrendCard
            key={asset.symbol}
            asset={asset}
            candles={data[asset.symbol] ?? []}
            colors={colors}
            width={Math.max(width - 40, 1)}
            showSeparator={index < Math.min(assets.length, 3) - 1}
          />
        ))}
      </View>
    )}
  </View>;
}

// Komponent wyświetlający pojedynczą kartę trendu dla danego aktywa giełdowego
function TrendCard({ asset, candles, colors, width, showSeparator }: { asset: DynamicTrendAsset; candles: CandleData[]; colors: ReturnType<typeof useTheme>['colors']; width: number; showSeparator: boolean }) {
  const first = candles[0];
  const latest = candles[candles.length - 1];
  const values = candles.map((item) => ({ timestamp: item.timestamp, value: item.close }));
  const change = first && latest ? ((latest.close - first.close) / first.close) * 100 : asset.changePercent;
  const lowest = candles.length ? Math.min(...candles.map((item) => item.low)) : 0;
  const highest = candles.length ? Math.max(...candles.map((item) => item.high)) : 0;
  const firstDate = first ? formatDate(first.timestamp) : '';
  const lastDate = latest ? formatDate(latest.timestamp) : '';
  return <View style={[styles.item, showSeparator && { borderBottomColor: colors.border }]}>
    <View style={styles.row}><View style={styles.icon}><Ionicons name="trending-up-outline" size={18} color={colors.accent} /></View><View style={styles.copy}><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, { color: colors.text }]}>{truncate(asset.name, 24)}</Text><Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>{asset.exchangeName} · USD</Text></View><Text style={{ color: change >= 0 ? colors.positive : colors.negative, fontWeight: '700' }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</Text></View>
    {values.length > 1 && <View style={styles.chartBlock}>
      <View style={styles.chartCaption}><Text style={[styles.chartDescription, { color: colors.textMuted }]}>Cena zamknięcia (USD)</Text><Text style={[styles.chartDescription, { color: colors.textMuted }]}>Ostatnie 30 dni</Text></View>
      <View style={styles.chartArea}>
        <View style={styles.axisLabels}><Text style={[styles.axisLabel, { color: colors.textMuted }]}>{formatPrice(highest)}</Text><Text style={[styles.axisLabel, { color: colors.textMuted }]}>{formatPrice(lowest)}</Text></View>
        <View style={styles.chartContent}>
          <View pointerEvents="none" style={styles.grid}>
            {Array.from({ length: 9 }, (_, line) => <View key={`h-${line}`} style={[styles.gridHorizontal, { top: `${(line / 8) * 100}%`, backgroundColor: colors.border }]} />)}
            {Array.from({ length: 11 }, (_, line) => <View key={`v-${line}`} style={[styles.gridVertical, { left: `${(line / 10) * 100}%`, backgroundColor: colors.border }]} />)}
          </View>
          <LineChart.Provider data={values}><LineChart width={Math.max(width - 44, 1)} height={70} yGutter={10}><LineChart.Path color={change >= 0 ? colors.positive : colors.negative} width={2} /></LineChart></LineChart.Provider>
          <View style={styles.timeLabels}><Text style={[styles.axisLabel, { color: colors.textMuted }]}>{firstDate}</Text><Text style={[styles.axisLabel, { color: colors.textMuted }]}>{lastDate}</Text></View>
        </View>
      </View>
    </View>}
  </View>;
}

function formatPrice(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(value >= 100 ? 0 : 2);
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

// Stylesheet dla komponentu TrendCards (karty trendów)
const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionContent: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' }, subtitle: { fontSize: 12, marginTop: 2 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8, marginBottom: 2 },
  category: { fontSize: 12, fontWeight: '700', paddingBottom: 6, borderBottomWidth: 2 },
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center' }, icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 10 }, name: { fontWeight: '700', fontSize: 14 }, meta: { fontSize: 11, marginTop: 3 },
  chartBlock: { marginTop: 12 }, chartCaption: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chartDescription: { fontSize: 9, fontWeight: '600' }, chartArea: { flexDirection: 'row' }, axisLabels: { width: 44, height: 70, justifyContent: 'space-between', paddingVertical: 2 },
  chartContent: { flex: 1, height: 86 }, grid: { position: 'absolute', top: 0, left: 0, right: 0, height: 70, zIndex: 0 },
  gridHorizontal: { position: 'absolute', left: 0, right: 0, height: 1, opacity: 0.65 },
  gridVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, opacity: 0.65 },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }, axisLabel: { fontSize: 9 },
  chartSkeleton: { height: 70, marginTop: 12, position: 'relative' }, chartLineTop: { position: 'absolute', top: 8, left: 0, right: 0 },
  chartLineMiddle: { position: 'absolute', top: 34, left: 0, right: 0 }, chartLineBottom: { position: 'absolute', top: 60, left: 0, right: 0 },
  chartStroke: { position: 'absolute', top: 35, left: 10 },
});
