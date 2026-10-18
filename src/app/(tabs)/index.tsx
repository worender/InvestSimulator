import { useEffect, useState } from "react";
import { View, StyleSheet, Button, TextInput, Pressable, ActivityIndicator } from "react-native";
import Ionicons from '@expo/vector-icons/AntDesign';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { getStockCandles, CandleData } from '../../api/marketService';




export default function Index() {
  const [value, setValue] = useState("0");
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const symbol = "PKO"; // Domyślna spółka z GPW

  useEffect(() => {
    const fetchCandles = async () => {
      setLoading(true);
      const data = await getStockCandles(symbol, '1h', 5);
      if (data) {
        setCandles(data);
      }
      setLoading(false);
    };

    fetchCandles();
  }, [symbol]);

  const changeValue = (amount: number) => {
    const currentValue = Number.parseInt(value);
    if (isNaN(currentValue)) {
      setValue(String(amount));
    } else {
      setValue(String(currentValue + amount));
    }
  };

  

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>EDUKACYJNY SYMULATOR</Text>
          <Text style={[styles.title, { color: colors.text }]}>Dzień dobry, inwestorze</Text>
        </View>
    <View style={styles.container}>
  
        <View style={styles.chartContainer}>
          {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : candles.length > 0 ? (
          <CandlestickChart.Provider data={candles}>
            <CandlestickChart height={300}>
              <CandlestickChart.Candles />
              <CandlestickChart.Crosshair>
                <CandlestickChart.Tooltip />
              </CandlestickChart.Crosshair>
            </CandlestickChart>
          </CandlestickChart.Provider>
        ) : (
          <Ionicons name="line-chart" size={300} color="#fff" style={{ alignSelf: 'center' }} />
        )}
        <View style={[styles.marketBadge, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.positive }]} />
          <Text style={[styles.marketBadgeText, { color: colors.textMuted }]}>OTWARTE</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.label, { color: colors.textMuted }]}>INDEKS EDU 500</Text>
            <Text style={[styles.price, { color: colors.text }]}>106,10</Text>
          </View>
          <View style={styles.change}>
            <Text style={[styles.changeValue, { color: colors.positive }]}>+2,81%</Text>
            <Text style={[styles.changeCaption, { color: colors.textMuted }]}>dzisiaj</Text>
          </View>
        </View>
        <View style={styles.chartWrap}>
          <LineChart.Provider data={chartData}>
            <LineChart width={chartWidth} height={190}>
              <LineChart.Path color={colors.accent} width={2.5} />
              <LineChart.CursorLine
                color={colors.textMuted}
                showLabel
                textStyle={{ color: colors.textMuted, fontSize: 11 }}
              />
            </LineChart>
          </LineChart.Provider>
        </View>
        <View style={styles.axis}>
          <Text style={[styles.axisText, { color: colors.textMuted }]}>09:00</Text>
          <Text style={[styles.axisText, { color: colors.textMuted }]}>12:00</Text>
          <Text style={[styles.axisText, { color: colors.textMuted }]}>16:00</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Obserwowane rynki</Text>
      <MarketRow icon="logo-bitcoin" name="Bitcoin" symbol="BTC / USD" price="67 421,00" change="+1,24%" colors={colors} />
      <MarketRow icon="logo-apple" name="Apple" symbol="AAPL" price="172,62" change="+0,83%" colors={colors} />
      <MarketRow icon="cash-outline" name="S&P 500" symbol="SPX" price="5 117,09" change="-0,18%" negative colors={colors} />
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>Dane są fikcyjne i służą wyłącznie do nauki.</Text>
    </ScrollView>
  );
}

type MarketRowProps = { icon: keyof typeof Ionicons.glyphMap; name: string; symbol: string; price: string; change: string; negative?: boolean; colors: ReturnType<typeof useTheme>['colors'] };

function MarketRow({ icon, name, symbol, price, change, negative, colors }: MarketRowProps) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.assetIcon, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={19} color={colors.text} />
      </View>
      <View style={styles.assetName}>
        <Text style={[styles.assetTitle, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.assetSymbol, { color: colors.textMuted }]}>{symbol}</Text>
      </View>
      <View style={styles.assetValue}>
        <Text style={[styles.assetPrice, { color: colors.text }]}>{price}</Text>
        <Text style={{ color: negative ? colors.negative : colors.positive }}>{change}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 32 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  marketBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  marketBadgeText: { fontSize: 10, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 8, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  price: { fontSize: 30, fontWeight: '700', marginTop: 6, letterSpacing: -1 },
  change: { alignItems: 'flex-end' },
  changeValue: { fontSize: 16, fontWeight: '700' },
  changeCaption: { fontSize: 12, marginTop: 3 },
  chartWrap: { marginTop: 16, overflow: 'hidden' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  axisText: { fontSize: 11 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 30, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  assetIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  assetName: { flex: 1, marginLeft: 12 },
  assetTitle: { fontSize: 15, fontWeight: '600' },
  assetSymbol: { fontSize: 12, marginTop: 3 },
  assetValue: { alignItems: 'flex-end' },
  assetPrice: { fontSize: 14, fontWeight: '600' },
  disclaimer: { fontSize: 12, marginTop: 22, lineHeight: 18 },
});
