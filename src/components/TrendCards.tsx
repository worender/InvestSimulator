import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CandleData, DynamicTrendAsset, canRetryFetch, getDynamicTrends, getStockCandles, lastFetchErrorMap } from '../api/marketService';
import { currencySymbol, resolveCurrency } from '../currency';
import { notify } from '../notificationBus';
import { useTheme } from '../theme';
import { CHART_RANGES } from './ChartFullscreenModal';
import { ModalChartView } from './ModalChartView';
import { Skeleton } from './Skeleton';
import { TrendChart, trendChangePercent } from './TrendChart';

type Category = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };
const categories: Category[] = [
  { key: 'gainers', label: 'Rosnące', icon: 'flame-outline' },
  { key: 'active', label: 'Aktywne', icon: 'pulse-outline' },
  { key: 'technology', label: 'Tech', icon: 'hardware-chip-outline' },
  { key: 'undervalued', label: 'Wartościowe', icon: 'diamond-outline' },
];

const TREND_RANGE_INDEX = Math.max(
  0,
  CHART_RANGES.findIndex((range) => range.days === 30),
);

// Komponent wyświetlający karty trendów dla różnych kategorii aktywów giełdowych
export function TrendCards() {
  const { colors } = useTheme();
  const [category, setCategory] = useState('gainers');
  const [assets, setAssets] = useState<DynamicTrendAsset[]>([]);
  const [data, setData] = useState<Record<string, CandleData[]>>({});
  const [loadedCategory, setLoadedCategory] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<DynamicTrendAsset | null>(null);
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
              <Skeleton width={54} height={22} radius={11} />
            </View>
            <View style={styles.chartSkeleton}>
              <Skeleton width="100%" height={1} radius={0} style={styles.chartLineTop} />
              <Skeleton width="100%" height={1} radius={0} style={styles.chartLineMiddle} />
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
            showSeparator={index < Math.min(assets.length, 3) - 1}
            onPress={() => setSelectedAsset(asset)}
          />
        ))}
      </View>
    )}

    {selectedAsset && (
      <ModalChartView
        instrument={toModalInstrument(selectedAsset)}
        initialRangeIndex={TREND_RANGE_INDEX}
        initialInterval="1d"
        onClose={() => setSelectedAsset(null)}
      />
    )}
  </View>;
}

// Komponent wyświetlający pojedynczą kartę trendu dla danego aktywa giełdowego
function TrendCard({ asset, candles, colors, showSeparator, onPress }: { asset: DynamicTrendAsset; candles: CandleData[]; colors: ReturnType<typeof useTheme>['colors']; showSeparator: boolean; onPress: () => void }) {
  const latest = candles[candles.length - 1];
  const values = candles.map((item) => ({ timestamp: item.timestamp, value: item.close }));
  const hasChart = values.length > 1;
  const currency = resolveCurrency(asset);
  const change = trendChangePercent(values, asset.changePercent);
  const tone = change >= 0 ? colors.positive : colors.negative;
  const changeLabel = `${change >= 0 ? '+' : ''}${change.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Otwórz wykres ${asset.name}`}
    style={({ pressed }) => [
      styles.item,
      showSeparator && { borderBottomColor: colors.border },
      pressed && styles.itemPressed,
    ]}
  >
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: change >= 0 ? colors.positiveGlass : colors.negativeGlass }]}>
        <Ionicons name={change >= 0 ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={tone} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, { color: colors.text }]}>{truncate(asset.name, 24)}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>
          {asset.exchangeName}{latest ? ` · ${formatPrice(latest.close)} ${currency}` : ` · ${currency}`}
        </Text>
      </View>
      <View style={[styles.changeBadge, { backgroundColor: change >= 0 ? colors.positiveGlass : colors.negativeGlass }]}>
        <Ionicons name={change >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color={tone} />
        <Text style={[styles.changeText, { color: tone }]}>{changeLabel}</Text>
      </View>
    </View>
    {hasChart ? (
      <TrendChart data={values} height={88} style={styles.chart} />
    ) : (
      <View style={styles.chartEmpty}>
        <Ionicons name="analytics-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.chartEmptyText, { color: colors.textMuted }]}>Brak danych do wykresu</Text>
      </View>
    )}
  </Pressable>;
}

function toModalInstrument(asset: DynamicTrendAsset) {
  const currency = resolveCurrency(asset);
  return {
    stock: asset.symbol,
    title: asset.name.toUpperCase(),
    currency,
    symbol: currencySymbol(currency),
    exchange: asset.exchange,
  };
}

function formatPrice(value: number) {
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  itemPressed: { opacity: 0.72 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 10 }, name: { fontWeight: '700', fontSize: 14 }, meta: { fontSize: 11, marginTop: 3 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 11 },
  changeText: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chart: { marginTop: 12 },
  chartEmpty: { height: 88, marginTop: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  chartEmptyText: { fontSize: 11, fontWeight: '500' },
  chartSkeleton: { height: 88, marginTop: 12, position: 'relative' },
  chartLineTop: { position: 'absolute', top: 16, left: 0, right: 0 },
  chartLineMiddle: { position: 'absolute', top: 52, left: 0, right: 0 },
  chartStroke: { position: 'absolute', top: 44, left: 10 },
});
