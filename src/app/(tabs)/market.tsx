import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurTargetView } from "expo-blur";
import { useIsFocused } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCachedDynamicTrends,
  getCachedQuoteDetails,
  getDynamicTrends,
  getStockData,
  getStockQuotesBatch,
  InstrumentSearchResult,
  searchInstruments,
  StockFinancialData,
  StockQuoteDetails,
  type DynamicTrendAsset,
} from "../../api/marketService";
import { CategorySelector } from "../../components/CategorySelector";
import {
  InstrumentDetails,
  useInstrumentFinancialData,
} from "../../components/InstrumentDetails";
import { InstrumentRow } from "../../components/InstrumentRow";
import { ModalChartView } from "../../components/ModalChartView";
import { PANEL_HEADER_HEIGHT, PanelHeader } from "../../components/PanelHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { StockCandleChart } from "../../components/StockCandleChart";
import { resolveCurrency } from "../../currency";
import {
  FIXED_MARKET_INSTRUMENTS,
  isDynamicMarketTab,
  MARKET_SECTION_LABELS,
  MARKET_TABS,
  type DynamicMarketTabKey,
  type MarketInstrument,
  type MarketTabKey,
} from "../../marketTabs";
import { NOTIFICATION_GROUPS, notify } from '../../notificationBus';
import { useTheme } from "../../theme";
import { useKeyboardShortcut } from "../../useKeyboardShortcut";
import { useLayoutMode } from "../../useLayoutMode";
import { useScrollAwareNavigation } from "../../useScrollAwareNavigation";
import { useWatchlist } from "../../watchlist";

const quoteKey = (symbol: string, exchange?: string) =>
  `${symbol}_${exchange || ""}`;

const withResolvedCurrency = (
  instrument: MarketInstrument,
): MarketInstrument & { currency: string } => ({
  ...instrument,
  currency: instrument.currency || resolveCurrency(instrument),
});

const toMarketInstrument = (asset: DynamicTrendAsset): MarketInstrument => ({
  symbol: asset.symbol,
  name: asset.name,
  exchange: asset.exchange,
  exchangeName: asset.exchangeName,
  currency: resolveCurrency(asset),
});

// Ekran "Rynek" wyświetlający notowania giełdowe i umożliwiający wyszukiwanie instrumentów
export default function MarketScreen() {
  const { colors } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  // Widok treści rozmywanej pod nagłówkiem (wymagane przez BlurView na Androidzie)
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();
  const { instruments: watchlistInstruments } = useWatchlist();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>(
    [],
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [completedQuery, setCompletedQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<MarketTabKey>("watchlist");
  const [dynamicInstruments, setDynamicInstruments] = useState<
    Record<DynamicMarketTabKey, MarketInstrument[]>
  >({ gainers: [], active: [] });
  const [dynamicLoading, setDynamicLoading] = useState<
    Record<DynamicMarketTabKey, boolean>
  >({
    gainers: false,
    active: false,
  });
  const { isDesktop } = useLayoutMode();
  const { width: windowWidth } = useWindowDimensions();
  // Na węższym desktopie lista oddaje miejsce wykresowi
  const listPanelWidth = windowWidth >= 1280 ? 420 : 340;

  // Lista instrumentów wybranej zakładki. Zakładki stałe mają z góry ustalone składy
  const watchlistItems = useMemo<MarketInstrument[]>(
    () =>
      watchlistInstruments.map((instrument) => ({
        ...instrument,
        exchangeName: instrument.exchange,
      })),
    [watchlistInstruments],
  );

  const currentInstruments = useMemo<MarketInstrument[]>(() => {
    if (selectedTab === "watchlist") return watchlistItems;
    if (isDynamicMarketTab(selectedTab)) return dynamicInstruments[selectedTab];
    return FIXED_MARKET_INSTRUMENTS[selectedTab];
  }, [dynamicInstruments, selectedTab, watchlistItems]);

  const [quotes, setQuotes] = useState<
    Record<string, StockQuoteDetails | null>
  >(() => {
    const initial: Record<string, StockQuoteDetails | null> = {};
    for (const instrument of watchlistInstruments) {
      const cached = getCachedQuoteDetails(
        instrument.symbol,
        instrument.exchange,
      );
      if (cached) {
        initial[quoteKey(instrument.symbol, instrument.exchange)] = cached;
      }
    }
    return initial;
  });

  // Instrument pokazywany w prawym panelu na desktopie
  const initialSelected = watchlistItems[0] ?? FIXED_MARKET_INSTRUMENTS.pl[0];
  const [selectedStock, setSelectedStock] = useState<
    MarketInstrument & { currency: string }
  >(() => withResolvedCurrency(initialSelected));

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

  // Po opuszczeniu zakładki wyszukiwanie i jego lista wyników wracają do stanu początkowego.
  useResetOnPanelBlur(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setCompletedQuery('');
    setSearchLoading(false);
  });

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
        setCompletedQuery("");
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

  // Notowania dla aktualnie widocznej listy
  useEffect(() => {
    if (currentInstruments.length === 0) return;

    const missing = currentInstruments.filter(
      (instrument) =>
        quotes[quoteKey(instrument.symbol, instrument.exchange)] === undefined,
    );
    if (missing.length === 0) return;

    let active = true;

    getStockQuotesBatch(
      missing.map(({ symbol, exchange }) => ({ symbol, exchange })),
    )
      .then((result) => {
        if (!active) return;
        setQuotes((prev) => {
          const next = { ...prev };
          for (const instrument of missing) {
            const key = quoteKey(instrument.symbol, instrument.exchange);
            next[key] = result[key] ?? null;
          }
          return next;
        });
      })
      .catch(() => {
        if (!active) return;
        setQuotes((prev) => {
          const next = { ...prev };
          for (const instrument of missing) {
            next[quoteKey(instrument.symbol, instrument.exchange)] = null;
          }
          return next;
        });
      });

    return () => {
      active = false;
    };
  }, [currentInstruments, quotes]);

  // Instrument dla prawego panelu
  const panelInstrument = useMemo<
    (MarketInstrument & { currency: string }) | null
  >(() => {
    if (currentInstruments.length === 0) return null;
    const selected = currentInstruments.find(
      (instrument) =>
        instrument.symbol === selectedStock.symbol &&
        instrument.exchange === selectedStock.exchange,
    );
    return withResolvedCurrency(selected ?? currentInstruments[0]);
  }, [currentInstruments, selectedStock.exchange, selectedStock.symbol]);

  // Dynamiczne zakładki: lista z Yahoo, cache 10 min po stronie klienta i serwera
  const applyDynamicAssets = useCallback(
    (category: DynamicMarketTabKey, assets: DynamicTrendAsset[]) => {
      const mapped = assets.slice(0, 10).map(toMarketInstrument);
      setDynamicInstruments((prev) => ({ ...prev, [category]: mapped }));

      if (mapped.length > 0) {
        setSelectedStock((current) => {
          const exists = mapped.some(
            (instrument) =>
              instrument.symbol === current.symbol &&
              instrument.exchange === current.exchange,
          );
        } else {
          notify({
            variant: 'warning',
            title: 'Brak danych finansowych',
            category: NOTIFICATION_GROUPS.marketFinancials,
            message: `Nie udało się pobrać szczegółów dla ${item.symbol}. Dostępne są tylko notowania.`,
          });
        }
      } catch (err) {
        console.warn('Błąd pobierania danych finansowych:', err);
        notify({
          variant: 'error',
          title: 'Błąd pobierania danych',
          category: NOTIFICATION_GROUPS.marketFinancials,
          message: `Nie udało się pobrać danych dla ${item.symbol}. Spróbuj ponownie później.`,
          return exists ? current : withResolvedCurrency(mapped[0]);
        });
      }
    },
    [],
  );

  const loadDynamicTab = useCallback(
    (category: DynamicMarketTabKey) => {
      const cached = getCachedDynamicTrends(category);
      if (cached && cached.length > 0) {
        applyDynamicAssets(category, cached);
        setDynamicLoading((prev) => ({ ...prev, [category]: false }));
      } else {
        setDynamicLoading((prev) => ({ ...prev, [category]: true }));
      }

      getDynamicTrends(category)
        .then((assets) => {
          applyDynamicAssets(category, assets);
          setDynamicLoading((prev) => ({ ...prev, [category]: false }));
        })
        .catch(() => {
          setDynamicLoading((prev) => ({ ...prev, [category]: false }));
        });
    },
    [applyDynamicAssets],
  );

  // Zmiana zakładki
  const handleTabChange = (tab: MarketTabKey) => {
    setSelectedTab(tab);

    if (isDynamicMarketTab(tab)) {
      loadDynamicTab(tab);
      return;
    }

    const list =
      tab === "watchlist" ? watchlistItems : FIXED_MARKET_INSTRUMENTS[tab];
    if (list.length > 0) {
      setSelectedStock(withResolvedCurrency(list[0]));
    }
  };

  // Funkcja otwierająca modal z wykresem dla wybranego instrumentu, pobierająca dane finansowe w tle
  const openStockModal = useCallback(async (item: MarketInstrument) => {
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
            ? {
                ...curr,
                currency: financialData.currency || curr.currency,
                financialData,
              }
            : null,
        );
      } else {
        notify({
          variant: "warning",
          title: "Brak danych finansowych",
          message: `Nie udało się pobrać szczegółów dla ${item.symbol}. Dostępne są tylko notowania.`,
        });
      }
    } catch (err) {
      console.warn("Błąd pobierania danych finansowych:", err);
      notify({
        variant: "error",
        title: "Błąd pobierania danych",
        message: `Nie udało się pobrać danych dla ${item.symbol}. Spróbuj ponownie później.`,
      });
    }
  }, []);

  // Na desktopie kliknięcie wybiera instrument do prawego panelu, na mobile otwiera modal
  const pressInstrument = (item: MarketInstrument) => {
    if (!isDesktop) {
      openStockModal(item);
      return;
    }
    setSelectedStock(withResolvedCurrency(item));
  };

  // Funkcja zamykająca modal z wykresem i resetująca stan modalu
  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalInstrument(null);
  }, []);

  const searchTerm = searchQuery.trim();
  const isSearching =
    searchOpen &&
    searchTerm.length >= 2 &&
    (searchLoading || completedQuery !== "");

  const watchlistEmpty =
    !isSearching &&
    selectedTab === "watchlist" &&
    currentInstruments.length === 0;
  const dynamicEmpty =
    !isSearching &&
    isDynamicMarketTab(selectedTab) &&
    !dynamicLoading[selectedTab] &&
    currentInstruments.length === 0;
  const showEmptyState = watchlistEmpty || dynamicEmpty;
  const showDynamicSkeleton =
    !isSearching &&
    isDynamicMarketTab(selectedTab) &&
    dynamicLoading[selectedTab] &&
    currentInstruments.length === 0;

  // Funkcja zamykająca wyszukiwanie; zapytanie i wyniki zostają zapamiętane,
  // dzięki czemu po ponownym otwarciu można je od razu podmienić
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  // Skróty na webie działają tylko na widocznej zakładce (pozostałe zostają zamontowane w tle)
  const isFocused = useIsFocused();
  const openSearchShortcut = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    setSearchOpen(true);
  }, []);
  useKeyboardShortcut("/", openSearchShortcut, isFocused && !modalVisible);
  useKeyboardShortcut(
    "Escape",
    closeSearch,
    isFocused && searchOpen && !modalVisible,
  );

  // Strzałki góra/dół przełączają instrument w prawym panelu (desktop), lista przewija się do zaznaczenia
  const selectByOffset = (offset: number) => (event: KeyboardEvent) => {
    event.preventDefault();
    if (currentInstruments.length === 0) return;
    const current = currentInstruments.findIndex(
      (instrument) =>
        instrument.symbol === selectedStock.symbol &&
        instrument.exchange === selectedStock.exchange,
    );
    const nextIndex = Math.min(
      Math.max(current + offset, 0),
      currentInstruments.length - 1,
    );
    const next = currentInstruments[nextIndex];
    setSelectedStock(withResolvedCurrency(next));
    document
      .getElementById(`market-row-${next.symbol}`)
      ?.scrollIntoView({ block: "nearest" });
  };
  const arrowsEnabled = isFocused && isDesktop && !isSearching && !modalVisible;
  useKeyboardShortcut("ArrowDown", selectByOffset(1), arrowsEnabled);
  useKeyboardShortcut("ArrowUp", selectByOffset(-1), arrowsEnabled);

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
        search={{
          open: searchOpen,
          value: searchQuery,
          onChangeText: setSearchQuery,
          onClose: closeSearch,
          placeholder: "Nazwa lub ticker, np. Apple",
        }}
      />
      {/* Na desktopie lista i wykres to dwa panele obok siebie, każdy przewijany osobno (jak w xStation) */}
      <BlurTargetView
        ref={blurTargetRef}
        style={[styles.blurTarget, isDesktop && styles.split]}
      >
        <ScrollView
          style={
            isDesktop
              ? [
                  styles.listPanel,
                  { width: listPanelWidth, borderRightColor: colors.border },
                ]
              : undefined
          }
          contentContainerStyle={[
            styles.content,
            showEmptyState && styles.contentFill,
            {
              paddingTop: top + PANEL_HEADER_HEIGHT + 8,
              paddingBottom: 38 + bottom,
            },
          ]}
          showsVerticalScrollIndicator={Platform.OS === "web"}
          keyboardShouldPersistTaps="handled"
          {...scrollNav}
        >
          {isSearching ? (
            <Section
              first
              label={
                searchLoading
                  ? "Wyszukiwanie..."
                  : `Wyniki dla "${searchQuery}" (${searchResults.length})`
              }
            >
              {searchLoading ? (
                <View>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.stockRow,
                        {
                          borderBottomColor: colors.borderGlass,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={styles.skeletonCopy}>
                        <Skeleton width="45%" height={14} />
                        <Skeleton
                          width="30%"
                          height={10}
                          style={styles.skeletonSubline}
                        />
                      </View>
                      <Skeleton width={58} height={14} />
                    </View>
                  ))}
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="search-outline"
                    size={34}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Nie znaleziono spółek
                  </Text>
                  <Text
                    style={[styles.emptySubtitle, { color: colors.textMuted }]}
                  >
                    Spróbuj wpisać inny ticker lub nazwę firmy (np. Apple, KGHM,
                    NVDA).
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
                        pressInstrument({
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
                          <Text
                            style={[styles.stockSymbol, { color: colors.text }]}
                          >
                            {item.symbol.replace(/\.PA$/, "")}
                          </Text>
                          <Text
                            style={[
                              styles.exchangeTag,
                              { color: colors.textMuted },
                            ]}
                          >
                            · {item.exchangeName || item.exchange}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.stockName,
                            { color: colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Section>
          ) : (
            <>
              <View style={styles.tabsRow}>
                <CategorySelector
                  options={MARKET_TABS}
                  value={selectedTab}
                  onChange={handleTabChange}
                  accessibilityLabel="Zakładki rynku"
                />
              </View>

              {showEmptyState ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name={
                      watchlistEmpty ? "star-outline" : "cloud-offline-outline"
                    }
                    size={34}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[styles.emptyStateText, { color: colors.textMuted }]}
                  >
                    {watchlistEmpty
                      ? "Tutaj pojawią się zaobserwowane instrumenty"
                      : "Brak instrumentów do wyświetlenia"}
                  </Text>
                </View>
              ) : showDynamicSkeleton ? (
                <View>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.stockRow,
                        {
                          borderBottomColor: colors.borderGlass,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={styles.skeletonCopy}>
                        <Skeleton width="45%" height={14} />
                        <Skeleton
                          width="30%"
                          height={10}
                          style={styles.skeletonSubline}
                        />
                      </View>
                      <Skeleton width={58} height={14} />
                    </View>
                  ))}
                </View>
              ) : (
                <Section first label={MARKET_SECTION_LABELS[selectedTab]}>
                  <View>
                    {currentInstruments.map((stock, index) => {
                      const key = quoteKey(stock.symbol, stock.exchange);
                      const quote = quotes[key];

                      return (
                        <View key={key} nativeID={`market-row-${stock.symbol}`}>
                          <InstrumentRow
                            symbol={stock.symbol}
                            name={stock.name}
                            exchangeName={stock.exchangeName}
                            price={quote?.price}
                            changePercent={quote?.changePercent}
                            currency={
                              quote?.currency ??
                              stock.currency ??
                              resolveCurrency(stock)
                            }
                            divider={index < currentInstruments.length - 1}
                            loading={quote === undefined}
                            onPress={() => pressInstrument(stock)}
                          />
                        </View>
                      );
                    })}
                  </View>
                </Section>
              )}
            </>
          )}
        </ScrollView>

        {isDesktop &&
          (panelInstrument ? (
            <InstrumentPanel
              instrument={panelInstrument}
              paddingTop={top + PANEL_HEADER_HEIGHT + 8}
            />
          ) : (
            <View style={[styles.detailPanel, styles.detailEmpty]}>
              <Ionicons
                name="analytics-outline"
                size={32}
                color={colors.textMuted}
              />
              <Text
                style={[styles.detailEmptyText, { color: colors.textMuted }]}
              >
                Wybierz instrument, aby zobaczyć wykres
              </Text>
            </View>
          ))}
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

// Prawy panel na desktopie: wykres i szczegóły finansowe wybranego instrumentu (na mobile to samo jest w modalu)
function InstrumentPanel({
  instrument,
  paddingTop,
}: {
  instrument: MarketInstrument & { currency: string };
  paddingTop: number;
}) {
  const { financialData, loading } = useInstrumentFinancialData({
    stock: instrument.symbol,
    exchange: instrument.exchange,
    currency: instrument.currency,
  });

  return (
    <ScrollView
      style={styles.detailPanel}
      contentContainerStyle={[styles.detailContent, { paddingTop }]}
      showsVerticalScrollIndicator
    >
      <StockCandleChart
        stock={instrument.symbol}
        title={instrument.name.toUpperCase()}
        currency={financialData?.currency ?? instrument.currency}
        exchange={instrument.exchange}
      />
      <InstrumentDetails financialData={financialData} loading={loading} grid />
    </ScrollView>
  );
}

// Stylesheet dla komponentu MarketScreen (ekran "Rynek")
const styles = StyleSheet.create({
  blurTarget: { flex: 1 },
  split: { flexDirection: "row" },
  listPanel: { flexGrow: 0, borderRightWidth: 1 },
  stockRowDesktop: { paddingHorizontal: 10, borderRadius: 8 },
  detailPanel: { flex: 1 },
  detailContent: {
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingBottom: 38,
  },
  detailEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  detailEmptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  contentFill: {
    flexGrow: 1,
  },
  tabsRow: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  stockMeta: {
    flex: 1,
    paddingRight: 14,
  },
  stockSymbolRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  stockSymbol: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  exchangeTag: {
    fontSize: 11,
    fontWeight: "600",
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
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 10,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
