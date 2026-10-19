import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PortfolioOverviewCard } from '../../components/PortfolioOverviewCard';
import { StockCandleChart } from '../../components/StockCandleChart';
import { TrendCards } from '../../components/TrendCards';
import { useNavigationVisibility } from '../../navigationVisibility';
import { useTheme } from '../../theme';

export default function Index() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { setVisible } = useNavigationVisibility();
  const lastOffset = useRef(0);
  const [portfolioStock, setPortfolioStock] = useState({ stock: 'PKO', title: 'PKO BANK POLSKI' });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: 120 + bottom }]}
      scrollEventThrottle={16}
      onScroll={(event) => {
        const offset = event.nativeEvent.contentOffset.y;
        if (offset > lastOffset.current + 8) setVisible(false);
        if (offset < lastOffset.current - 8) setVisible(true);
        lastOffset.current = offset;
      }}
    >
      <Text style={[styles.eyebrow, { color: colors.accent }]}>EDUKACYJNY SYMULATOR</Text>
      <Text style={[styles.title, { color: colors.text }]}>Dzień dobry, inwestorze</Text>
      <View style={styles.section}><PortfolioOverviewCard onStockChange={(stock, title) => setPortfolioStock({ stock, title })} /></View>
      <View style={styles.section}><StockCandleChart stock={portfolioStock.stock} title={portfolioStock.title} /></View>
      <View style={styles.section}><TrendCards /></View>
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>Dane są edukacyjne i nie stanowią rekomendacji inwestycyjnej.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 24 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  section: { marginTop: 22 },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: 10 },
});
