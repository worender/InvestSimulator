import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Reanimated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
// import { LineChart } from 'react-native-wagmi-charts';
import { Currency, useTheme } from '../theme';
import { GlassSurface } from './GlassSurface';

const currencyOrder: Currency[] = ['PLN', 'EUR', 'USD'];
type Portfolio = { symbol: string; total: string; active: string; inactive: string; accent: string; stock: string; stockName: string; values: { timestamp: number; value: number }[] };
// Przykładowe dane portfela dla każdej waluty
const cards: Record<Currency, Portfolio> = {
  PLN: { symbol: 'zł', total: '10 000,00', active: '7 450,00', inactive: '2 550,00', accent: '#2563eb', stock: 'PKO', stockName: 'PKO Bank Polski', values: [{ timestamp: 1, value: 6800 }, { timestamp: 2, value: 7100 }, { timestamp: 3, value: 7450 }] },
  EUR: { symbol: '€', total: '2 320,00', active: '1 780,00', inactive: '540,00', accent: '#7c3aed', stock: 'MC.PA', stockName: 'Louis Vuitton / LVMH', values: [{ timestamp: 1, value: 1600 }, { timestamp: 2, value: 1700 }, { timestamp: 3, value: 1780 }] },
  USD: { symbol: '$', total: '2 520,00', active: '1 940,00', inactive: '580,00', accent: '#059669', stock: 'AAPL', stockName: 'Apple', values: [{ timestamp: 1, value: 1750 }, { timestamp: 2, value: 1860 }, { timestamp: 3, value: 1940 }] },
};

const SHUFFLE_MS = 380;

// Funkcje animacji kart portfela w talii: wierzch, środek, spód
function moveToFront(phase: SharedValue<number>) {
  phase.value = withTiming(0, { duration: SHUFFLE_MS, easing: Easing.out(Easing.back(1.05)) });
}
function moveToMiddle(phase: SharedValue<number>) {
  phase.value = withTiming(1, { duration: SHUFFLE_MS, easing: Easing.out(Easing.cubic) });
}
function moveToBack(phase: SharedValue<number>, onDone: () => void) {
  phase.value = withTiming(2, { duration: SHUFFLE_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
    'worklet';
    if (finished) {
      runOnJS(onDone)();
    }
  });
}
// Funkcje animacji krycia kart portfela w talii: wierzch, środek, spód
function fadeCardOut(opacity: SharedValue<number>) {
  opacity.value = withDelay(
    40,
    withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
  );
}
function fadeCardIn(opacity: SharedValue<number>) {
  opacity.value = withTiming(1, { duration: 200 });
}

type PortfolioCardProps = {
  data: Portfolio;
  currency: Currency;
  index: number;
  isFront: boolean;
  width: number;
  multiCurrency: boolean;
  // Pozycja karty w talii
  phase: SharedValue<number>;
  opacity: SharedValue<number>;
  onPress: () => void;
};

// Komponent pojedynczej karty portfela w talii
function PortfolioCard({ data, currency, index, isFront, width, multiCurrency, phase, opacity, onPress }: PortfolioCardProps) {
  const { colors } = useTheme();
  const animatedStyle = useAnimatedStyle(() => {
    const pos = phase.value;
    return {
      opacity: opacity.value,
      transform: [
        { translateY: pos * 16 },
        { scale: 1 - pos * 0.045 },
      ],
    };
  });
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
  }));
  const chartLabels = [data.values[data.values.length - 1].value, data.values[Math.floor(data.values.length / 2)].value, data.values[0].value];

  return (
    <Reanimated.View
      pointerEvents={isFront ? 'auto' : 'none'}
      style={[
        isFront ? styles.frontSlot : styles.backSlot,
        { zIndex: 30 - index * 10, elevation: isFront ? 6 : 0 },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={isFront ? onPress : undefined}
        style={[styles.card, { borderColor: data.accent }]}
      >
        <GlassSurface
          pointerEvents="none"
          tintColor={data.accent}
          style={[StyleSheet.absoluteFill, styles.cardGlass]}
        />

        <Reanimated.View pointerEvents="none" style={contentStyle}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.label, { color: colors.textMuted }]}>WARTOŚĆ PORTFELA · 3 MIESIĄCE</Text>
                <Text style={[styles.total, { color: colors.text }]}>{data.total} {data.symbol}</Text>
              </View>
              <Ionicons name="wallet-outline" size={24} color={data.accent} />
            </View>
            <View style={styles.stockRow}>
              <Ionicons name="trending-up-outline" size={16} color={data.accent} />
              <Text style={[styles.stockText, { color: colors.text }]}>{data.stockName} · {data.stock}</Text>
            </View>
            <Text style={[styles.swipeHint, { color: colors.textMuted }]}>
              {multiCurrency
                ? `Dotknij karty dwa razy, aby zmienić portfel · ${currency}`
                : `Domyślna waluta portfela · ${currency}`}
            </Text>
            <View style={styles.breakdown}>
              <Text style={[styles.breakdownText, { color: colors.textMuted }]}>
                Aktywne <Text style={{ color: colors.text }}>{data.active} {data.symbol}</Text>
              </Text>
              <Text style={[styles.breakdownText, { color: colors.textMuted }]}>
                Nieaktywne <Text style={{ color: colors.text }}>{data.inactive} {data.symbol}</Text>
              </Text>
            </View>
            <View style={styles.chartRow}>
              <View style={styles.yAxis}>
                {chartLabels.map((value, pointIndex) => (
                  <Text key={`${value}-${pointIndex}`} style={[styles.yAxisLabel, { color: colors.textMuted }]}>
                    {value.toLocaleString('pl-PL')} {data.symbol}
                  </Text>
                ))}
              </View>
              <View style={styles.chart}>
                <View pointerEvents="none" style={styles.grid}>
                  {[0, 1, 2].map((gridIndex) => (
                    <View key={gridIndex} style={[styles.gridLine, { top: gridIndex * 54, backgroundColor: colors.border }]} />
                  ))}
                </View>
                {/* <LineChart.Provider data={data.values}>
                  <LineChart height={110} width={Math.max(width - 124, 1)}>
                    <LineChart.Path color={data.accent} width={2.5} />
                  </LineChart>
                </LineChart.Provider> */}
              </View>
            </View>
            <Text style={{ color: colors.positive, fontWeight: '700' }}>+8,70% · wynik za ostatnie 3 miesiące</Text>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

export function PortfolioOverviewCard({ onStockChange }: { onStockChange?: (stock: string, title: string, currency: Currency) => void }) {
  const { defaultCurrency, multiCurrency } = useTheme();
  const { width } = useWindowDimensions();
  // Kolejność talii: [wierzch, środek, spód]. Zmieniana dopiero po zakończeniu animacji
  const [deckOrder, setDeckOrder] = useState<Currency[]>(() => {
    const selected = currencyOrder.filter((item) => item !== defaultCurrency);
    return [defaultCurrency, ...selected];
  });

  const phasePLN = useSharedValue(deckOrder.indexOf('PLN'));
  const phaseEUR = useSharedValue(deckOrder.indexOf('EUR'));
  const phaseUSD = useSharedValue(deckOrder.indexOf('USD'));
  const opacityPLN = useSharedValue(1);
  const opacityEUR = useSharedValue(1);
  const opacityUSD = useSharedValue(1);
  const phases = useMemo<Record<Currency, SharedValue<number>>>(
    () => ({ PLN: phasePLN, EUR: phaseEUR, USD: phaseUSD }),
    [phasePLN, phaseEUR, phaseUSD],
  );
  const opacities = useMemo<Record<Currency, SharedValue<number>>>(
    () => ({ PLN: opacityPLN, EUR: opacityEUR, USD: opacityUSD }),
    [opacityPLN, opacityEUR, opacityUSD],
  );

  const lastTap = useRef(0);
  const animating = useRef(false);

  const currency = deckOrder[0];
  const data = cards[currency];
  useEffect(() => {
    onStockChange?.(data.stock, data.stockName, currency);
  }, [currency, data.stock, data.stockName, onStockChange]);

  const commitShuffle = useCallback((nextOrder: Currency[], departed: Currency) => {
    setDeckOrder(nextOrder);
    fadeCardIn(opacities[departed]);
    animating.current = false;
  }, [opacities]);

  const changeCurrency = useCallback(() => {
    if (animating.current || !multiCurrency) return;
    animating.current = true;
    const [front, middle, back] = deckOrder;

    // Środek wjeżdża na wierzch, spód na środek, wierzch zjeżdża na spód
    moveToFront(phases[middle]);
    moveToMiddle(phases[back]);
    fadeCardOut(opacities[front]);
    moveToBack(phases[front], () => commitShuffle([middle, back, front], front));
  }, [commitShuffle, deckOrder, multiCurrency, opacities, phases]);

  // Funkcja obsługująca naciśnięcie karty portfela: podwójne dotknięcie zmienia walutę
  const handleCardPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      changeCurrency();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <View style={styles.deck}>
      {(multiCurrency ? currencyOrder : [deckOrder[0]]).map((item) => (
        <PortfolioCard
          key={item}
          currency={item}
          data={cards[item]}
          index={deckOrder.indexOf(item)}
          isFront={deckOrder[0] === item}
          width={width}
          multiCurrency={multiCurrency}
          phase={phases[item]}
          opacity={opacities[item]}
          onPress={handleCardPress}
        />
      ))}
    </View>
  );
}

// Stylesheet dla komponentu PortfolioOverviewCard (karta portfela)
const styles = StyleSheet.create({
  deck: { position: 'relative', marginBottom: 12 },
  frontSlot: { position: 'relative' },
  backSlot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, minHeight: 260, overflow: 'hidden' },
  cardGlass: { borderRadius: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between' }, label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }, total: { fontSize: 28, fontWeight: '700', marginTop: 7 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 }, stockText: { fontSize: 12, fontWeight: '700' }, swipeHint: { fontSize: 10, marginTop: 6 },
  breakdown: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, breakdownText: { fontSize: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 12 }, yAxis: { width: 46, height: 110, justifyContent: 'space-between', paddingVertical: 2 },
  yAxisLabel: { fontSize: 8, textAlign: 'right' }, chart: { flex: 1, height: 110, overflow: 'hidden', position: 'relative' },
  grid: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }, gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
});
