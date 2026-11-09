import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurTargetView } from "expo-blur";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getStockData,
  InstrumentSearchResult,
  searchInstruments,
  StockFinancialData,
} from "../../api/marketService";
import { AccountMenu } from "../../components/AccountMenu";
import { ModalChartView } from "../../components/ModalChartView";
import { PANEL_HEADER_HEIGHT, PanelHeader } from "../../components/PanelHeader";
import { PortfolioOverviewCard } from "../../components/PortfolioOverviewCard";
import { SavedArticlesSection } from "../../components/SavedArticlesSection";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { TrendCards } from "../../components/TrendCards";
import { WatchedInstrumentsSection } from "../../components/WatchedInstrumentsSection";
import { AccountAvatar } from "../../components/settings/AccountAvatar";
import { resolveCurrency } from "../../currency";
import { notify } from "../../notificationBus";
import { useTheme } from "../../theme";
import { useScrollAwareNavigation } from "../../useScrollAwareNavigation";

export default function Index() {
  const { colors, defaultCurrency, multiCurrency, activeAccount } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  // Widok treści rozmywanej pod nagłówkiem (wymagane przez BlurView na Androidzie).
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>(
    [],
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [completedQuery, setCompletedQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInstrument, setModalInstrument] = useState<{
    stock: string;
    title: string;
    currency: string;
    symbol: string;
    exchange: string;
    financialData?: StockFinancialData;
  } | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const query = searchQuery.trim();
      if (query.length < 2) {
        setSearchResults([]);
        setCompletedQuery("");
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

  // Funkcja zamykająca wyszukiwanie; zapytanie i wyniki zostają zapamiętane,
  // dzięki czemu po ponownym otwarciu można je od razu podmienić
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
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
      const financialData = await getStockData(
        instrument.symbol,
        instrument.exchange,
      );
      if (!financialData) {
        notify({
          variant: "warning",
          title: "Brak danych finansowych",
          message: `Nie udało się pobrać szczegółów dla ${instrument.symbol}. Dostępne są tylko notowania.`,
        });
      }
      setModalInstrument({
        ...selectedInstrument,
        currency: financialData?.currency || resolvedCurrency,
        financialData: financialData ?? undefined,
      });
    } catch (error) {
      console.error("Błąd pobierania danych finansowych:", error);
      notify({
        variant: "error",
        title: "Błąd pobierania danych",
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

  const searchTerm = searchQuery.trim();
  // Sekcja wyników pojawia się dla dwóch znaków wyszukiwania oraz gdy trwa ładowanie wyników
  const isSearching =
    searchOpen &&
    searchTerm.length >= 2 &&
    (searchLoading || completedQuery !== "");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PanelHeader
        blurTarget={blurTargetRef}
        title="Pulpit"
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
            onPress={() => setAccountMenuOpen((open) => !open)}
            accessibilityLabel="Menu konta"
            accessibilityState={{ expanded: accountMenuOpen }}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            {activeAccount?.avatar_uri ? (
              <AccountAvatar
                uri={activeAccount.avatar_uri}
                name={activeAccount.username}
                size={30}
              />
            ) : (
              <Ionicons name="person-circle" size={26} color={colors.accent} />
            )}
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
      <BlurTargetView ref={blurTargetRef} style={styles.body}>
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: 38 + bottom,
              paddingTop: top + PANEL_HEADER_HEIGHT + 8,
            },
          ]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          {...scrollNav}
        >
          {isSearching ? (
            <Section
              first
              label={
                searchLoading
                  ? "Wyszukiwanie..."
                  : `Wyniki dla "${searchTerm}" (${searchResults.length})`
              }
            >
              {searchLoading ? (
                <View>
                  {[1, 2, 3, 4].map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.searchSkeletonRow,
                        { borderBottomColor: colors.borderGlass },
                      ]}
                    >
                      <Skeleton width="58%" height={14} />
                      <Skeleton width="32%" height={10} />
                    </View>
                  ))}
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.searchState}>
                  <Ionicons
                    name="search-outline"
                    size={32}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[styles.searchStateTitle, { color: colors.text }]}
                  >
                    Brak wyników
                  </Text>
                  <Text
                    style={[
                      styles.searchStateCopy,
                      { color: colors.textMuted },
                    ]}
                  >
                    Spróbuj innego tickera lub nazwy spółki.
                  </Text>
                </View>
              ) : (
                <View>
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
                        <Text
                          style={[styles.resultName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {result.name}
                        </Text>
                        <Text
                          style={[
                            styles.resultMeta,
                            { color: colors.textMuted },
                          ]}
                        >
                          {result.symbol} · {result.exchangeName}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </Section>
          ) : (
            <>
              <Section label="Portfel">
                <PortfolioOverviewCard
                  key={`${defaultCurrency}-${multiCurrency}`}
                />
              </Section>

              <Section label="Obserwowane">
                <WatchedInstrumentsSection />
              </Section>

              <Section label="Zapisane artykuły">
                <SavedArticlesSection />
              </Section>

              <Section label="Warte uwagi">
                <TrendCards />
              </Section>
            </>
          )}
        </ScrollView>
      </BlurTargetView>

      {accountMenuOpen && (
        <AccountMenu onClose={() => setAccountMenuOpen(false)} />
      )}

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
  searchState: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
    gap: 8,
  },
  searchStateTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  searchStateCopy: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  searchSkeletonRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  resultCopy: { flex: 1, marginRight: 8 },
  resultName: { fontSize: 14, fontWeight: "700" },
  resultMeta: { fontSize: 11, marginTop: 3 },
});
