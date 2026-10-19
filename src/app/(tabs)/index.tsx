import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InstrumentSearchResult, searchInstruments } from '../../api/marketService';
import { PortfolioOverviewCard } from '../../components/PortfolioOverviewCard';
import { Skeleton } from '../../components/Skeleton';
import { StockCandleChart } from '../../components/StockCandleChart';
import { TrendCards } from '../../components/TrendCards';
import { useNavigationVisibility } from '../../navigationVisibility';
import { Currency, useTheme } from '../../theme';

const portfolioStocks: Record<Currency, { currency: Currency; stock: string; title: string; symbol: 'zł' | '€' | '$'; exchange: string }> = {
  PLN: { currency: 'PLN', stock: 'PKO', title: 'PKO BANK POLSKI', symbol: 'zł', exchange: 'GPW' },
  EUR: { currency: 'EUR', stock: 'MC.PA', title: 'LOUIS VUITTON / LVMH', symbol: '€', exchange: 'EURONEXT_PARIS' },
  USD: { currency: 'USD', stock: 'AAPL', title: 'APPLE', symbol: '$', exchange: 'NASDAQ' },
};

export default function Index() {
  const { colors, defaultCurrency, multiCurrency } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  const { setVisible } = useNavigationVisibility();
  const lastOffset = useRef(0);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);
  const [portfolioStock, setPortfolioStock] = useState(() => portfolioStocks[defaultCurrency]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const chartStock = portfolioStock;
  const handleStockChange = useCallback((stock: string, title: string, currency: Currency) => {
    setPortfolioStock({ ...portfolioStocks[currency], stock, title });
  }, []);
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      setSearchResults(await searchInstruments(searchQuery));
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);
  useEffect(() => () => setVisible(true), [setVisible]);
  const updateScrollability = (nextViewportHeight = viewportHeight.current, nextContentHeight = contentHeight.current) => {
    if (nextViewportHeight > 0 && nextContentHeight > 0 && nextContentHeight <= nextViewportHeight + 1) {
      setVisible(true);
    }
  };
  const handleLayout = (event: LayoutChangeEvent) => {
    viewportHeight.current = event.nativeEvent.layout.height;
    updateScrollability();
  };
  const handleContentSizeChange = (_width: number, height: number) => {
    contentHeight.current = height;
    updateScrollability();
  };
  const selectInstrument = (instrument: InstrumentSearchResult) => {
    const isEuropean = /PAR|LSE|LON|FRA|GER|MIL|AMS|BRU|STO|HEL|COP|OSL|EURONEXT|XPAR|XLON|XFRA/i.test(`${instrument.exchange} ${instrument.exchangeName}`);
    setPortfolioStock({
      currency: isEuropean ? 'EUR' : 'USD',
      stock: instrument.symbol,
      title: instrument.name.toUpperCase(),
      symbol: isEuropean ? '€' : '$',
      exchange: instrument.exchange || instrument.exchangeName,
    });
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: 38 + bottom }]}
      keyboardShouldPersistTaps="always"
      scrollEventThrottle={16}
      onLayout={handleLayout}
      onContentSizeChange={handleContentSizeChange}
      onScroll={(event) => {
        const offset = event.nativeEvent.contentOffset.y;
        const canScroll = contentHeight.current > viewportHeight.current + 1;
        if (!canScroll) {
          setVisible(true);
          return;
        }
        if (offset > lastOffset.current + 8) setVisible(false);
        if (offset < lastOffset.current - 8) setVisible(true);
        lastOffset.current = offset;
      }}
    >
      <View style={[styles.marketHeader, { paddingTop: top }]}>
        <Pressable onPress={() => setSearchOpen((current) => !current)} accessibilityLabel="Szukaj instrumentu">
          <Ionicons name={searchOpen ? 'close' : 'search'} size={22} color={colors.accent} />
        </Pressable>
        <Text style={[styles.marketHeaderTitle, { color: colors.text }]}>Rynki</Text>
        <Pressable disabled style={styles.profileButton} accessibilityLabel="Panel użytkownika niedostępny">
          <Ionicons name="person-circle-outline" size={25} color={colors.textMuted} />
        </Pressable>
      </View>
      {searchOpen && <View style={[styles.searchOverlay, { backgroundColor: colors.background, top: top + 62 }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput value={searchQuery} onChangeText={setSearchQuery} autoFocus placeholder="Nazwa lub ticker, np. Apple" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} />
          <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled style={styles.resultsList}>
            {searchLoading ? <View style={styles.searchSkeleton}>
              {[1, 2, 3].map((item) => <View key={item} style={styles.searchSkeletonRow}><Skeleton width="70%" height={14} /><Skeleton width="35%" height={10} /></View>)}
            </View> : searchResults.map((result) => <Pressable key={`${result.symbol}-${result.exchange}`} onPress={() => selectInstrument(result)} style={[styles.searchResult, { borderTopColor: colors.border }]}>
              <View style={styles.resultCopy}><Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{result.name}</Text><Text style={[styles.resultMeta, { color: colors.textMuted }]}>{result.symbol} · {result.exchangeName}</Text></View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>)}
          </ScrollView>
        </View>
      </View>}
      <Text style={[styles.eyebrow, { color: colors.accent }]}>EDUKACYJNY SYMULATOR</Text>
      <Text style={[styles.title, { color: colors.text }]}>Dzień dobry, inwestorze</Text>
      <View style={styles.section}><PortfolioOverviewCard key={`${defaultCurrency}-${multiCurrency}`} onStockChange={handleStockChange} /></View>
      <View style={styles.section}>
        <StockCandleChart stock={chartStock.stock} title={chartStock.title} currency={chartStock.symbol} exchange={chartStock.exchange} />
      </View>
      <View style={styles.section}><TrendCards /></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 24 },
  marketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  marketHeaderTitle: { fontSize: 20, fontWeight: '700' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  section: { marginTop: 22 },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  profileButton: { opacity: 0.55 },
  searchOverlay: { position: 'absolute', left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, paddingBottom: 10 },
  searchBox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  searchInput: { minHeight: 44, paddingHorizontal: 14, fontSize: 14 },
  resultsList: { maxHeight: 280 },
  searchSkeleton: { padding: 14, gap: 14 },
  searchSkeletonRow: { gap: 7 },
  searchResult: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  resultCopy: { flex: 1, marginRight: 8 },
  resultName: { fontSize: 13, fontWeight: '700' },
  resultMeta: { fontSize: 11, marginTop: 3 },
});
