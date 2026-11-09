import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurTargetView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getStockData,
  getStockQuoteDetails,
  InstrumentSearchResult,
  searchInstruments,
  StockFinancialData,
} from '../../api/marketService';
import { ModalChartView } from '../../components/ModalChartView';
import { CategorySelector } from '../../components/CategorySelector';
import { InstrumentRow } from '../../components/InstrumentRow';
import { PANEL_HEADER_HEIGHT, PanelHeader } from '../../components/PanelHeader';
import { Section } from '../../components/Section';
import { Skeleton } from '../../components/Skeleton';
import { resolveCurrency } from '../../currency';
import { notify } from '../../notificationBus';
import { useTheme } from '../../theme';
import { useScrollAwareNavigation } from '../../useScrollAwareNavigation';

interface FeaturedStock {
  symbol: string;
  name: string;
  exchange: string;
  exchangeName: string;
  currency: string;
  category: 'PL' | 'GLOBAL';
  price?: number;
  change?: number;
  changePercent?: number;
}

// Domyślna lista spółek wyświetlanych w sekcji "Wybrane spółki GPW i światowe" na ekranie MarketScreen
const DEFAULT_STOCKS: FeaturedStock[] = [
  // Polska (GPW)
  { symbol: 'PKO', name: 'PKO Bank Polski', exchange: 'GPW', exchangeName: 'Warszawa GPW', currency: 'PLN', category: 'PL' },
  { symbol: 'CDR', name: 'CD Projekt', exchange: 'GPW', exchangeName: 'Warszawa GPW', currency: 'PLN', category: 'PL' },
  { symbol: 'KGH', name: 'KGHM Polska Miedź', exchange: 'GPW', exchangeName: 'Warszawa GPW', currency: 'PLN', category: 'PL' },
  { symbol: 'PZU', name: 'Grupa PZU', exchange: 'GPW', exchangeName: 'Warszawa GPW', currency: 'PLN', category: 'PL' },
  { symbol: 'DNP', name: 'Dino Polska', exchange: 'GPW', exchangeName: 'Warszawa GPW', currency: 'PLN', category: 'PL' },
  { symbol: 'ALE', name: 'Allegro', exchange: 'GPW', exchangeName: 'Warszawa GPW', currency: 'PLN', category: 'PL' },

  // Świat (Global)
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', exchangeName: 'NASDAQ', currency: 'USD', category: 'GLOBAL' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', exchangeName: 'NASDAQ', currency: 'USD', category: 'GLOBAL' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', exchangeName: 'NASDAQ', currency: 'USD', category: 'GLOBAL' },
  { symbol: 'MC.PA', name: 'LVMH Louis Vuitton', exchange: 'EURONEXT_PARIS', exchangeName: 'Euronext Paryż', currency: 'EUR', category: 'GLOBAL' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', exchangeName: 'NASDAQ', currency: 'USD', category: 'GLOBAL' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', exchangeName: 'NASDAQ', currency: 'USD', category: 'GLOBAL' },
];

const FILTER_LABELS = {
  ALL: 'Wszystkie',
  PL: 'Polska (GPW)',
  GLOBAL: 'Świat (Global)',
} as const;

const FILTER_OPTIONS = [
  { key: 'ALL', label: FILTER_LABELS.ALL },
  { key: 'PL', label: FILTER_LABELS.PL },
  { key: 'GLOBAL', label: FILTER_LABELS.GLOBAL },
] as const;

// Ekran "Rynek" wyświetlający notowania giełdowe i umożliwiający wyszukiwanie instrumentów 
export default function MarketScreen() {
  const { colors } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  // Widok treści rozmywanej pod nagłówkiem (wymagane przez BlurView na Androidzie).
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [completedQuery, setCompletedQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PL' | 'GLOBAL'>('ALL');
  const [stocksList, setStocksList] = useState<FeaturedStock[]>(DEFAULT_STOCKS);

  // Modal view state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInstrument, setModalInstrument] = useState<{
    stock: string;
    title: string;
    currency: string;
    symbol: string;
    exchange: string;
    financialData?: StockFinancialData;
  } | null>(null);

  // Pobieranie aktualnych notowań dla domyślnych spółek w tle po załadowaniu komponentu
  useEffect(() => {
    let isMounted = true;

    const loadStockQuotes = async () => {
      const updated = await Promise.all(
        DEFAULT_STOCKS.map(async (stk) => {
          try {
            const quote = await getStockQuoteDetails(stk.symbol, stk.exchange);
            if (quote && isMounted) {
              return {
                ...stk,
                price: quote.price,
                change: quote.change,
                changePercent: quote.changePercent,
                currency: quote.currency || stk.currency,
              };
            }
          } catch {
            console.log(`Nie udało się pobrać notowań dla ${stk.symbol} (${stk.exchange})`);
          }
          return stk;
        }),
      );

      if (isMounted) {
        setStocksList(updated);
      }
    };

    loadStockQuotes();

    return () => {
      isMounted = false;
    };
  }, []);

  // Efekt wywoływany przy zmianie zapytania wyszukiwania; wprowadza opóźnienie 280ms przed wykonaniem wyszukiwania
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length < 2) {
        setSearchResults([]);
        setCompletedQuery('');
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      const results = await searchInstruments(q);
      setSearchResults(results);
      setCompletedQuery(q);
      setSearchLoading(false);
    }, 280);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Funckja otwierająca modal z wykresem dla wybranego instrumentu, pobierająca dane finansowe w tle
  const openStockModal = useCallback(
    async (item: { symbol: string; name: string; exchange: string; exchangeName?: string; currency?: string }) => {
      const currency = item.currency || resolveCurrency(item);

      const instrumentData = {
        stock: item.symbol,
        title: item.name.toUpperCase(),
        currency,
        symbol: item.symbol,
        exchange: item.exchange,
      };

      setModalInstrument(instrumentData);
      setModalVisible(true);

      // Pobierz dane finansowe w tle
      try {
        const financialData = await getStockData(item.symbol, item.exchange);
        if (financialData) {
          setModalInstrument((curr) =>
            curr
              ? { ...curr, currency: financialData.currency || curr.currency, financialData }
              : null,
          );
        } else {
          notify({
            variant: 'warning',
            title: 'Brak danych finansowych',
            message: `Nie udało się pobrać szczegółów dla ${item.symbol}. Dostępne są tylko notowania.`,
          });
        }
      } catch (err) {
        console.warn('Błąd pobierania danych finansowych:', err);
        notify({
          variant: 'error',
          title: 'Błąd pobierania danych',
          message: `Nie udało się pobrać danych dla ${item.symbol}. Spróbuj ponownie później.`,
        });
      }
    },
    [],
  );

  // Funckja zamykająca modal z wykresem i resetująca stan modalu
  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalInstrument(null);
  }, []);

  // Filtrowanie spółek w zależności od wybranego filtra rynku (ALL, PL, GLOBAL)
  const filteredStocks = stocksList.filter((s) => {
    if (selectedFilter === 'ALL') return true;
    return s.category === selectedFilter;
  });

  const searchTerm = searchQuery.trim();
  const isSearching = searchOpen && searchTerm.length >= 2 && (searchLoading || completedQuery !== '');
  const stockSectionTitle =
    selectedFilter === 'ALL'
      ? 'Wybrane spółki GPW i światowe'
      : selectedFilter === 'PL'
        ? 'Giełda Papierów Wartościowych w Warszawie'
        : 'Rynki zagraniczne (USA, Europa)';

  const cycleFilter = () => {
    setSelectedFilter((current) => (current === 'ALL' ? 'PL' : current === 'PL' ? 'GLOBAL' : 'ALL'));
  };

  // Funkcja zamykająca wyszukiwanie; zapytanie i wyniki zostają zapamiętane,
  // dzięki czemu po ponownym otwarciu można je od razu podmienić
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        blurTarget={blurTargetRef}
        title="Rynek"
        left={
          <Pressable
            onPress={() => setSearchOpen(true)}
            accessibilityLabel="Szukaj instrumentu"
            hitSlop={8}
          >
            <Ionicons name="search" size={22} color={colors.accent} />
          </Pressable>
        }
        right={
          <Pressable
            onPress={cycleFilter}
            accessibilityLabel={`Filtr rynku: ${FILTER_LABELS[selectedFilter]}`}
            hitSlop={8}
          >
            <Ionicons name="globe-outline" size={23} color={colors.textMuted} />
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
      <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: top + PANEL_HEADER_HEIGHT + 8, paddingBottom: 38 + bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollNav}
        >
          <Section
            first={isSearching}
            label={
              isSearching
                ? searchLoading
                  ? 'Wyszukiwanie...'
                  : `Wyniki dla "${searchQuery}" (${searchResults.length})`
                : stockSectionTitle
            }
          >
            {!isSearching && (
              <View style={styles.filtersRow}>
                <CategorySelector
                  options={FILTER_OPTIONS}
                  value={selectedFilter}
                  onChange={setSelectedFilter}
                  accessibilityLabel="Filtr rynku"
                />
              </View>
            )}

            {isSearching ? (
              searchLoading ? (
                <View>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.stockRow,
                        { borderBottomColor: colors.borderGlass, borderBottomWidth: StyleSheet.hairlineWidth },
                      ]}
                    >
                      <View style={styles.skeletonCopy}>
                        <Skeleton width="45%" height={14} />
                        <Skeleton width="30%" height={10} style={styles.skeletonSubline} />
                      </View>
                      <Skeleton width={58} height={14} />
                    </View>
                  ))}
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="search-outline" size={34} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Nie znaleziono spółek</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    Spróbuj wpisać inny ticker lub nazwę firmy (np. Apple, KGHM, NVDA).
                  </Text>
                </View>
              ) : (
                <View>
                  {searchResults.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.symbol}-${item.exchange}`}
                      style={[
                        styles.stockRow,
                        index < searchResults.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.borderGlass,
                        },
                      ]}
                      onPress={() =>
                        openStockModal({
                          symbol: item.symbol,
                          name: item.name,
                          exchange: item.exchange,
                          exchangeName: item.exchangeName,
                        })
                      }
                      activeOpacity={0.6}
                    >
                      <View style={styles.stockMeta}>
                        <View style={styles.stockSymbolRow}>
                          <Text style={[styles.stockSymbol, { color: colors.text }]}>{item.symbol.replace(/\.PA$/, '')}</Text>
                          <Text style={[styles.exchangeTag, { color: colors.textMuted }]}>
                            · {item.exchangeName || item.exchange}
                          </Text>
                        </View>
                        <Text style={[styles.stockName, { color: colors.textMuted }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ) : (
              <View>
                {filteredStocks.map((stock, index) => {
                  const hasPrice = stock.price !== undefined;

                  return (
                    <InstrumentRow
                      key={stock.symbol}
                      symbol={stock.symbol}
                      name={stock.name}
                      exchangeName={stock.exchangeName}
                      price={stock.price}
                      changePercent={stock.changePercent}
                      currency={stock.currency}
                      divider={index < filteredStocks.length - 1}
                      loading={!hasPrice}
                      onPress={() => openStockModal(stock)}
                    />
                  );
                })}
              </View>
            )}
          </Section>
        </ScrollView>
      </BlurTargetView>

      {modalVisible && modalInstrument && (
        <ModalChartView
          instrument={modalInstrument}
          financialData={modalInstrument.financialData}
          onClose={closeModal}
        />
      )}
    </View>
  );
}

// Stylesheet dla komponentu MarketScreen (ekran "Rynek")
const styles = StyleSheet.create({
  blurTarget: { flex: 1 },
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  filtersRow: {
    marginBottom: 18,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  stockMeta: {
    flex: 1,
    paddingRight: 14,
  },
  stockSymbolRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  stockSymbol: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  exchangeTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockName: {
    fontSize: 12,
    marginTop: 3,
  },
  skeletonCopy: {
    flex: 1,
    gap: 7,
  },
  skeletonSubline: {
    marginTop: 0,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
