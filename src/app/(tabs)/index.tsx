import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStockData, InstrumentSearchResult, searchInstruments, StockFinancialData } from '../../api/marketService';
import { ModalChartView } from '../../components/ModalChartView';
import { PanelHeader } from '../../components/PanelHeader';
import { PortfolioOverviewCard } from '../../components/PortfolioOverviewCard';
import { Section } from '../../components/Section';
import { Skeleton } from '../../components/Skeleton';
import { StockCandleChart } from '../../components/StockCandleChart';
import { TrendCards } from '../../components/TrendCards';
import { resolveCurrency } from '../../currency';
import { notify } from '../../notificationBus';
import { useTheme } from '../../theme';
import { useKeyboardShortcut } from '../../useKeyboardShortcut';
import { useLayoutMode } from '../../useLayoutMode';
import { useScrollAwareNavigation } from '../../useScrollAwareNavigation';

// Przykładowe spółki w portfelu, które są wyświetlane na ekranie głównym aplikacji
const portfolioStocks: Record<string, { currency: string; stock: string; title: string; symbol: string; exchange: string }> = {
  PLN: { currency: 'PLN', stock: 'PKO', title: 'PKO BANK POLSKI', symbol: 'zł', exchange: 'GPW' },
  EUR: { currency: 'EUR', stock: 'MC.PA', title: 'LOUIS VUITTON / LVMH', symbol: '€', exchange: 'EURONEXT_PARIS' },
  USD: { currency: 'USD', stock: 'AAPL', title: 'APPLE', symbol: '$', exchange: 'NASDAQ' },
};

export default function Index() {
  const { colors, defaultCurrency, multiCurrency } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const scrollNav = useScrollAwareNavigation();
  const { isDesktop } = useLayoutMode();
  const [portfolioStock, setPortfolioStock] = useState(() => portfolioStocks[defaultCurrency]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [completedQuery, setCompletedQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInstrument, setModalInstrument] = useState<{
    stock: string;
    title: string;
    currency: string;
    symbol: string;
    exchange: string;
    financialData?: StockFinancialData;
  } | null>(null);
  const chartStock = portfolioStock;

  // Funkcja obsługująca zmianę spółki w portfelu, aktualizująca stan portfolioStock
  const handleStockChange = useCallback((stock: string, title: string, currency: string) => {
    setPortfolioStock({ ...portfolioStocks[currency], stock, title });
  }, []);
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const query = searchQuery.trim();
      if (query.length < 2) {
        setSearchResults([]);
        setCompletedQuery('');
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      setSearchResults(await searchInstruments(query));
      setCompletedQuery(query);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Funkcja zamykająca wyszukiwanie i resetująca stan wyszukiwania
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setCompletedQuery('');
  }, []);
  
  // Funkcja obsługująca wybór instrumentu z wyników wyszukiwania, pobierająca dane finansowe i otwierająca modal z wykresem
  const selectInstrument = async (instrument: InstrumentSearchResult) => {
    const resolvedCurrency = resolveCurrency(instrument);
    const selectedInstrument: {
      stock: string;
      title: string;
      currency: string;
      symbol: string;
      exchange: string;
    } = {
      stock: instrument.symbol,
      title: instrument.name.toUpperCase(),
      currency: resolvedCurrency,
      symbol: instrument.symbol,
      exchange: instrument.exchange || instrument.exchangeName,
    };

    // Pobierz dane finansowe z Yahoo Finance
    try {
      const financialData = await getStockData(instrument.symbol, instrument.exchange);
      if (!financialData) {
        notify({
          variant: 'warning',
          title: 'Brak danych finansowych',
          message: `Nie udało się pobrać szczegółów dla ${instrument.symbol}. Dostępne są tylko notowania.`,
        });
      }
      setModalInstrument({
        ...selectedInstrument,
        currency: financialData?.currency || resolvedCurrency,
        financialData: financialData ?? undefined,
      });
    } catch (error) {
      console.error('Błąd pobierania danych finansowych:', error);
      notify({
        variant: 'error',
        title: 'Błąd pobierania danych',
        message: `Nie udało się pobrać danych dla ${instrument.symbol}. Spróbuj ponownie później.`,
      });
      setModalInstrument(selectedInstrument);
    }

    closeSearch();
    setModalVisible(true);
  };
  
  // Funkcja zamykająca modal z wykresem i resetująca stan modalu
  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalInstrument(null);
  }, []);

  // Skróty na webie działają tylko na widocznej zakładce (pozostałe zostają zamontowane w tle)
  const isFocused = useIsFocused();
  const openSearchShortcut = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    setSearchOpen(true);
  }, []);
  useKeyboardShortcut('/', openSearchShortcut, isFocused && !modalVisible);
  useKeyboardShortcut('Escape', closeSearch, isFocused && searchOpen && !modalVisible);

  const query = searchQuery.trim();
  // Overlay pojawia się dla dwóch zanków wyszukiwania oraz gdy trwa ładowanie wyników
  const searchReady = query.length >= 2 && (searchLoading || completedQuery !== '');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        title="Pulpit"
        left={
          <Pressable onPress={() => setSearchOpen(true)} accessibilityLabel="Szukaj instrumentu" hitSlop={8}>
            <Ionicons name="search" size={22} color={colors.accent} />
          </Pressable>
        }
        right={
          <Pressable
            onPress={() => router.navigate('/settings')}
            accessibilityLabel="Przejdź do ustawień"
            hitSlop={8}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.textMuted} />
          </Pressable>
        }
        search={{
          open: searchOpen,
          value: searchQuery,
          onChangeText: setSearchQuery,
          onClose: closeSearch,
          placeholder: 'Nazwa lub ticker, np. Apple',
        }}
      />
      <View style={styles.body}>
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop, { paddingBottom: 38 + bottom }]}
          keyboardShouldPersistTaps="always"
          {...scrollNav}
        >
          <Text style={[styles.eyebrow, { color: colors.accent }]}>EDUKACYJNY SYMULATOR</Text>
          <Text style={[styles.title, { color: colors.text }]}>Dzień dobry, inwestorze</Text>

          <Section label="Portfel">
            <PortfolioOverviewCard key={`${defaultCurrency}-${multiCurrency}`} onStockChange={handleStockChange} />
          </Section>

          {/* Na desktopie wykres i trendy stoją obok siebie, na mobile jedno pod drugim */}
          <View style={isDesktop && styles.columns}>
            <View style={isDesktop && styles.mainColumn}>
              <Section>
                <StockCandleChart stock={chartStock.stock} title={chartStock.title} currency={chartStock.symbol} exchange={chartStock.exchange} />
              </Section>
            </View>

            <View style={isDesktop && styles.sideColumn}>
              <Section>
                <TrendCards />
              </Section>
            </View>
          </View>
        </ScrollView>

        {searchOpen && searchReady && (
          <View style={[styles.resultsOverlay, { backgroundColor: colors.background }]}>
            {searchLoading ? (
              <View>
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} style={[styles.searchSkeletonRow, { borderBottomColor: colors.borderGlass }]}>
                    <Skeleton width="58%" height={14} />
                    <Skeleton width="32%" height={10} />
                  </View>
                ))}
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.searchState}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.searchStateTitle, { color: colors.text }]}>Brak wyników</Text>
                <Text style={[styles.searchStateCopy, { color: colors.textMuted }]}>
                  Spróbuj innego tickera lub nazwy spółki.
                </Text>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={Platform.OS === 'web'}>
                {searchResults.map((result, index) => (
                  <Pressable
                    key={`${result.symbol}-${result.exchange}`}
                    onPress={() => selectInstrument(result)}
                    style={[
                      styles.searchResult,
                      index < searchResults.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.borderGlass,
                      },
                    ]}
                  >
                    <View style={styles.resultCopy}>
                      <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{result.name}</Text>
                      <Text style={[styles.resultMeta, { color: colors.textMuted }]}>{result.symbol} · {result.exchangeName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Modal Chart View */}
      {modalVisible && modalInstrument?.stock && (
        <ModalChartView
          instrument={modalInstrument}
          financialData={modalInstrument.financialData}
          onClose={closeModal}
        />
      )}
    </View>
  );
}

// Stylesheet dla komponentu Index (ekran główny aplikacji)
const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  contentDesktop: { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 32 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 32 },
  mainColumn: { flex: 3, minWidth: 0 },
  sideColumn: { flex: 2, minWidth: 0 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  resultsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 10,
  },
  searchState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
  searchStateTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  searchStateCopy: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  searchSkeletonRow: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  searchResult: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  resultCopy: { flex: 1, marginRight: 8 },
  resultName: { fontSize: 14, fontWeight: '700' },
  resultMeta: { fontSize: 11, marginTop: 3 },
});
