import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';
import { Currency, useTheme } from '../theme';

const currencyOrder: Currency[] = ['PLN', 'EUR', 'USD'];
type Portfolio = { symbol: string; total: string; active: string; inactive: string; accent: string; stock: string; stockName: string; values: { timestamp: number; value: number }[] };
const cards: Record<Currency, Portfolio> = {
  PLN: { symbol: 'zł', total: '10 000,00', active: '7 450,00', inactive: '2 550,00', accent: '#2563eb', stock: 'PKO', stockName: 'PKO Bank Polski', values: [{ timestamp: 1, value: 6800 }, { timestamp: 2, value: 7100 }, { timestamp: 3, value: 7450 }] },
  EUR: { symbol: '€', total: '2 320,00', active: '1 780,00', inactive: '540,00', accent: '#7c3aed', stock: 'MC.PA', stockName: 'Louis Vuitton / LVMH', values: [{ timestamp: 1, value: 1600 }, { timestamp: 2, value: 1700 }, { timestamp: 3, value: 1780 }] },
  USD: { symbol: '$', total: '2 520,00', active: '1 940,00', inactive: '580,00', accent: '#059669', stock: 'AAPL', stockName: 'Apple', values: [{ timestamp: 1, value: 1750 }, { timestamp: 2, value: 1860 }, { timestamp: 3, value: 1940 }] },
};

export function PortfolioOverviewCard({ onStockChange }: { onStockChange?: (stock: string, title: string, currency: Currency) => void }) {
  const { colors, defaultCurrency, multiCurrency } = useTheme();
  const { width } = useWindowDimensions();
  const [deckOrder, setDeckOrder] = useState<Currency[]>(() => {
    const selected = currencyOrder.filter((item) => item !== defaultCurrency);
    return [defaultCurrency, ...selected];
  });
  const [travel] = useState(() => new Animated.Value(0));
  const lastTap = useRef(0);
  const animating = useRef(false);
  const selectedOrder = [defaultCurrency, ...currencyOrder.filter((item) => item !== defaultCurrency)];
  const activeOrder = multiCurrency && deckOrder[0] !== defaultCurrency ? deckOrder : selectedOrder;
  const currency = activeOrder[0];
  const data = cards[currency];
  useEffect(() => {
    onStockChange?.(data.stock, data.stockName, currency);
  }, [currency, data.stock, data.stockName, onStockChange]);
  const changeCurrency = useCallback(() => {
    if (animating.current || !multiCurrency) return;
    animating.current = true;
    const nextOrder = [...activeOrder.slice(1), activeOrder[0]];
    const next = cards[nextOrder[0]];
    Animated.timing(travel, { toValue: 1, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        setDeckOrder(nextOrder);
        onStockChange?.(next.stock, next.stockName, nextOrder[0]);
        travel.setValue(0);
        animating.current = false;
      }
    });
  }, [activeOrder, multiCurrency, onStockChange, travel]);
  const handleCardPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      changeCurrency();
    } else {
      lastTap.current = now;
    }
  };
  const chartLabels = [data.values[data.values.length - 1].value, data.values[Math.floor(data.values.length / 2)].value, data.values[0].value];

  return (
    <View style={styles.deck}>
      {multiCurrency && activeOrder.slice(1).map((item, index) => (
        <Animated.View
          key={item}
          style={[
            styles.backCard,
            {
              backgroundColor: cards[item].accent,
              opacity: 0.45,
              transform: [
                { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [(index + 1) * 6, index * 6] }) },
                { scale: travel.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.backLabel}>PORTFEL {item}</Text>
          <Text style={styles.backTotal}>{cards[item].total} {cards[item].symbol}</Text>
          <Text style={styles.backStock}>{cards[item].stockName}</Text>
        </Animated.View>
      ))}
      <Animated.View style={[styles.cardWrapper, {
        zIndex: 3,
        elevation: 3,
        opacity: travel.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0, 0] }),
        transform: [
          { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [0, 34] }) },
          { scale: travel.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) },
        ],
      }]}>
      <Pressable onPress={handleCardPress} style={[styles.card, { backgroundColor: colors.surface, borderColor: data.accent }]}>
        <View style={styles.header}>
          <View><Text style={[styles.label, { color: colors.textMuted }]}>WARTOŚĆ PORTFELA · 3 MIESIĄCE</Text><Text style={[styles.total, { color: colors.text }]}>{data.total} {data.symbol}</Text></View>
          <Ionicons name="wallet-outline" size={24} color={data.accent} />
        </View>
        <View style={styles.stockRow}>
          <Ionicons name="trending-up-outline" size={16} color={data.accent} />
          <Text style={[styles.stockText, { color: colors.text }]}>{data.stockName} · {data.stock}</Text>
        </View>
        <Text style={[styles.swipeHint, { color: colors.textMuted }]}>{multiCurrency ? `Dotknij karty dwa razy, aby zmienić portfel · ${currency}` : `Domyślna waluta portfela · ${currency}`}</Text>
        <View style={styles.breakdown}><Text style={[styles.breakdownText, { color: colors.textMuted }]}>Aktywne <Text style={{ color: colors.text }}>{data.active} {data.symbol}</Text></Text><Text style={[styles.breakdownText, { color: colors.textMuted }]}>Nieaktywne <Text style={{ color: colors.text }}>{data.inactive} {data.symbol}</Text></Text></View>
        <View style={styles.chartRow}>
          <View style={styles.yAxis}>
            {chartLabels.map((value, index) => <Text key={`${value}-${index}`} style={[styles.yAxisLabel, { color: colors.textMuted }]}>{value.toLocaleString('pl-PL')} {data.symbol}</Text>)}
          </View>
          <View style={styles.chart}>
            <View pointerEvents="none" style={styles.grid}>
              {[0, 1, 2].map((index) => <View key={index} style={[styles.gridLine, { top: index * 54, backgroundColor: colors.border }]} />)}
            </View>
            <LineChart.Provider data={data.values}><LineChart height={110} width={Math.max(width - 124, 1)}><LineChart.Path color={data.accent} width={2.5} /></LineChart></LineChart.Provider>
          </View>
        </View>
        <Text style={{ color: colors.positive, fontWeight: '700' }}>+8,70% · wynik za ostatnie 3 miesiące</Text>
      </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { position: 'relative', paddingTop: 12 },
  backCard: { position: 'absolute', top: 0, left: 12, right: 12, height: '100%', borderRadius: 18, zIndex: 1, elevation: 1 },
  backLabel: { color: '#ffffff', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, margin: 18 },
  backTotal: { color: '#ffffff', fontSize: 24, fontWeight: '700', marginHorizontal: 18 },
  backStock: { color: '#ffffff', fontSize: 11, fontWeight: '600', marginHorizontal: 18, marginTop: 10 },
  cardWrapper: { borderRadius: 18, position: 'relative' },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, minHeight: 260 },
  header: { flexDirection: 'row', justifyContent: 'space-between' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }, total: { fontSize: 28, fontWeight: '700', marginTop: 7 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 }, stockText: { fontSize: 12, fontWeight: '700' }, swipeHint: { fontSize: 10, marginTop: 6 },
  breakdown: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, breakdownText: { fontSize: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 12 }, yAxis: { width: 46, height: 110, justifyContent: 'space-between', paddingVertical: 2 },
  yAxisLabel: { fontSize: 8, textAlign: 'right' }, chart: { flex: 1, height: 110, overflow: 'hidden', position: 'relative' },
  grid: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }, gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
});
