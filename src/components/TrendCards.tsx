import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';
import { CandleData, getStockCandles } from '../api/marketService';
import { useTheme } from '../theme';

type Asset = { symbol: string; name: string; market: string; icon: keyof typeof Ionicons.glyphMap; unit: string };
const categories: Record<string, Asset[]> = {
  Hot: [{ symbol: 'GC=F', name: 'Złoto', market: 'COMEX', icon: 'sparkles-outline', unit: 'USD / uncję' }, { symbol: 'BTC-USD', name: 'Bitcoin', market: 'Krypto', icon: 'logo-bitcoin', unit: 'USD' }, { symbol: 'CL=F', name: 'Ropa WTI', market: 'NYMEX', icon: 'flame-outline', unit: 'USD / baryłkę' }],
  Tech: [{ symbol: 'AAPL', name: 'Apple', market: 'NASDAQ', icon: 'logo-apple', unit: 'USD' }, { symbol: 'MSFT', name: 'Microsoft', market: 'NASDAQ', icon: 'desktop-outline', unit: 'USD' }, { symbol: 'NVDA', name: 'NVIDIA', market: 'NASDAQ', icon: 'hardware-chip-outline', unit: 'USD' }],
  Space: [{ symbol: 'RKLB', name: 'Rocket Lab', market: 'NASDAQ', icon: 'rocket-outline', unit: 'USD' }, { symbol: 'SPCE', name: 'Virgin Galactic', market: 'NYSE', icon: 'planet-outline', unit: 'USD' }, { symbol: 'BA', name: 'Boeing', market: 'NYSE', icon: 'airplane-outline', unit: 'USD' }],
};

export function TrendCards() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState('Hot');
  const [data, setData] = useState<Record<string, CandleData[]>>({});
  const [loadedCategory, setLoadedCategory] = useState('');
  const assets = categories[category];
  const loading = loadedCategory !== category;
  useEffect(() => {
    let active = true;
    Promise.all(assets.map(async (asset) => [asset.symbol, (await getStockCandles(asset.symbol, '1d', 30)) ?? []] as const)).then((result) => {
      if (active) { setData(Object.fromEntries(result)); setLoadedCategory(category); }
    });
    return () => { active = false; };
  }, [assets, category]);
  return <View><View style={styles.heading}><View><Text style={[styles.title, { color: colors.text }]}>Warte uwagi</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Ciekawe trendy rynkowe</Text></View><Ionicons name="flame-outline" size={22} color={colors.accent} /></View>
    <View style={styles.categories}>{Object.keys(categories).map((item) => <Text key={item} onPress={() => setCategory(item)} style={[styles.category, { color: item === category ? colors.accent : colors.textMuted, borderBottomColor: item === category ? colors.accent : 'transparent' }]}>{item}</Text>)}</View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View> : assets.map((asset) => <TrendCard key={asset.symbol} asset={asset} candles={data[asset.symbol] ?? []} colors={colors} width={Math.max(width - 68, 1)} />)}
  </View>;
}
function TrendCard({ asset, candles, colors, width }: { asset: Asset; candles: CandleData[]; colors: ReturnType<typeof useTheme>['colors']; width: number }) {
  const first = candles[0]; const latest = candles[candles.length - 1]; const values = candles.map((item) => ({ timestamp: item.timestamp, value: item.close })); const change = first ? ((latest.close - first.close) / first.close) * 100 : 0;
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.row}><View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}><Ionicons name={asset.icon} size={18} color={colors.accent} /></View><View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{asset.name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{asset.market} · {asset.unit}</Text></View><Text style={{ color: change >= 0 ? colors.positive : colors.negative, fontWeight: '700' }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</Text></View>{values.length > 1 && <LineChart.Provider data={values}><LineChart width={width} height={70} yGutter={10}><LineChart.Path color={change >= 0 ? colors.positive : colors.negative} width={2} /></LineChart></LineChart.Provider>}</View>;
}
const styles = StyleSheet.create({ heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, title: { fontSize: 18, fontWeight: '700' }, subtitle: { fontSize: 12, marginTop: 2 }, categories: { flexDirection: 'row', gap: 22, marginBottom: 12 }, category: { fontSize: 13, fontWeight: '700', paddingBottom: 6, borderBottomWidth: 2 }, loading: { height: 80, justifyContent: 'center', alignItems: 'center' }, card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 }, row: { flexDirection: 'row', alignItems: 'center' }, icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, marginLeft: 10 }, name: { fontWeight: '700', fontSize: 14 }, meta: { fontSize: 11, marginTop: 3 } });
