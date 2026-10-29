import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useRef, useState, useCallback, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssetCategoryCard } from '../../components/AssetCategoryCard';
import { InstrumentDetailModal, ModalTab } from '../../components/InstrumentDetailModal';
import { PANEL_HEADER_HEIGHT, PanelHeader } from '../../components/PanelHeader';
import { Section } from '../../components/Section';
import { SinglePortfolioCard } from '../../components/SinglePortfolioCard';
import { Skeleton } from '../../components/Skeleton';
import { resolveCurrency } from '../../currency';
import { notify } from '../../notificationBus';
import { useTheme } from '../../theme';
import { useScrollAwareNavigation } from '../../useScrollAwareNavigation';
import { searchInstruments, InstrumentSearchResult, getStockData } from '../../api/marketService';
import { MOCK_PORTFOLIOS, MockPortfolio } from '../../database/mockPortfolioData';

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  // Widok treści rozmywanej pod nagłówkiem (wymagane przez BlurView na Androidzie).
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();

  // Stan portfeli użytkownika
  const [portfolios] = useState<MockPortfolio[]>(MOCK_PORTFOLIOS);
  const [activePortfolioIndex, setActivePortfolioIndex] = useState(0);

  // Stan modalu szczegółów i zakupu instrumentu / kategorii
  const [selectedCategory, setSelectedCategory] = useState<PortfolioCategory | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAssetItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<ModalTab>('details');
  const [modalInstrument, setModalInstrument] = useState<{
    stock: string;
    title: string;
    currency: string;
    symbol: string;
    exchange: string;
    financialData?: any;
  } | null>(null);

  // Stan rozwijanej listy (overlay)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Stan nowej zielonej karty - dodawanie instrumentów
  const [greenCardOpen, setGreenCardOpen] = useState(false);
  const [greenCardSearchQuery, setGreenCardSearchQuery] = useState('');
  const [greenCardSearchResults, setGreenCardSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [greenCardSearchLoading, setGreenCardSearchLoading] = useState(false);

  // Animacja obracających się strzałek w headerze
  const rotation = useSharedValue(0);
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const currentPortfolio = portfolios[activePortfolioIndex] || portfolios[0];
  const hasMultiplePortfolios = portfolios.length > 1;
  const isAddDisabled = portfolios.length >= 5;

  const handleSwitchPortfolio = () => {
    rotation.value = withTiming(rotation.value + 180, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
    setActivePortfolioIndex((prev) => (prev + 1) % portfolios.length);
  };

  const handleAddPortfolio = () => {
    if (isAddDisabled) {
      notify({
        variant: 'info',
        title: 'Limit osiągnięty',
        message: 'Maksymalna liczba portfeli (5) została osiągnięta.',
      });
      return;
    }
    notify({
      variant: 'info',
      title: 'Tworzenie portfela',
      message: 'Dodawanie nowych portfeli będzie dostępne wkrótce.',
    });
  };

  const handleSelectCategory = (category: PortfolioCategory) => {
    setSelectedCategory(category);
    setSelectedAsset(category.items[0] || null);
    setModalInitialTab('details');
    setModalVisible(true);
  };

  // Obsługa rozwijanej listy w headerze - wyszukiwanie instrumentów
  const handleHeaderSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearchLoading(true);
    const results = await searchInstruments(query);
    setSearchResults(results);
    setSearchLoading(false);
    setDropdownOpen(true);
  }, []);

  const handleCloseHeaderDropdown = useCallback(() => {
    setDropdownOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Obsługa zielonej karty - dodawanie instrumentów do portfela
  const handleGreenCardSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setGreenCardSearchResults([]);
      setGreenCardOpen(false);
      return;
    }
    setGreenCardSearchLoading(true);
    const results = await searchInstruments(query);
    setGreenCardSearchResults(results);
    setGreenCardSearchLoading(false);
    setGreenCardOpen(true);
  }, []);

  const handleCloseGreenCardDropdown = useCallback(() => {
    setGreenCardOpen(false);
    setGreenCardSearchQuery('');
    setGreenCardSearchResults([]);
  }, []);

  // Dodanie instrumentu do portfela
  const handleAddInstrument = async (instrument: InstrumentSearchResult) => {
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
      setModalInstrument({
        ...selectedInstrument,
        currency: financialData?.currency || resolvedCurrency,
        financialData: financialData ?? undefined,
      });
      setModalVisible(true);
      setGreenCardOpen(false);
    } catch (error) {
      console.error('Błąd pobierania danych finansowych:', error);
      setModalInstrument(selectedInstrument);
      setModalVisible(true);
      setGreenCardOpen(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedCategory(null);
    setSelectedAsset(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Stały tytuł headeru: Portfolio (punkt 4) */}
      <PanelHeader
        blurTarget={blurTargetRef}
        title="Portfolio"
        left={
          hasMultiplePortfolios ? (
            <Pressable
              onPress={handleSwitchPortfolio}
              accessibilityLabel="Zmień portfel"
              hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Reanimated.View style={rotationStyle}>
                <Ionicons name="sync-outline" size={22} color={colors.accent} />
              </Reanimated.View>
            </Pressable>
          ) : undefined
        }
        right={
          <>
            <View style={styles.headerButtons}>
              {/* Przycisk edycji/portfolio */}
              <Pressable
                onPress={() => {
                  notify({
                    variant: 'info',
                    title: 'Edycja/Usuwanie',
                    message: 'Obecnie wybrane portfolio nie może być usunięte ani edytowane.',
                  });
                }}
                accessibilityLabel="Edytuj portfel"
                hitSlop={8}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="pencil-outline" size={22} color={colors.textMuted} />
              </Pressable>
              
              {/* Przycisk dodawania portfolio */}
              <Pressable
                onPress={() => setDropdownOpen(true)}
                accessibilityLabel="Dodaj nowy portfel"
                hitSlop={8}
                style={({ pressed }) => [{ opacity: isAddDisabled ? 0.35 : pressed ? 0.7 : 1 }]}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={isAddDisabled ? colors.textMuted : colors.accent}
                />
              </Pressable>
            </View>

            {/* Rozwijana lista w headerze */}
            {dropdownOpen && (
              <View style={styles.dropdownOverlay}>
                <View style={styles.dropdownContent}>
                  <Pressable
                    onPress={() => {
                      notify({
                        variant: 'info',
                        title: 'Dodaj instrument',
                        message: 'Dodawanie instrumentów będzie dostępne wkrótce.',
                      });
                      handleCloseHeaderDropdown();
                    }}
                    style={styles.dropdownItem}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.text} />
                    <Text style={[styles.dropdownText, { color: colors.text }]}>Dodaj instrument</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      notify({
                        variant: 'info',
                        title: 'Dodaj nowe portfolio',
                        message: 'Maksymalna liczba portfeli (5) została osiągnięta.',
                      });
                      handleCloseHeaderDropdown();
                    }}
                    style={styles.dropdownItem}
                  >
                    <Ionicons name="wallet-outline" size={20} color={colors.text} />
                    <Text style={[styles.dropdownText, { color: colors.text }]}>Dodaj nowe portfolio</Text>
                    {isAddDisabled && (
                      <Text style={[styles.dropdownTextDisabled, { color: colors.textMuted }]}>(limit osiągnięty)</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </>
        }
      />

      {/* Overlay rozwijanej listy dla zielonej karty */}
      {greenCardOpen && (
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownContent}>
            {searchLoading ? (
              <View style={styles.loadingItem}>
                <Skeleton height={16} />
              </View>
            ) : greenCardSearchResults.length === 0 ? (
              <View style={styles.searchState}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.searchStateTitle, { color: colors.text }]}>Brak wyników</Text>
                <Text style={[styles.searchStateCopy, { color: colors.textMuted }]}>
                  Spróbuj innego tickera lub nazwy spółki.
                </Text>
              </View>
            ) : (
              greenCardSearchResults.map((result) => (
                <Pressable
                  key={`${result.symbol}-${result.exchange}`}
                  onPress={() => handleAddInstrument(result)}
                  style={[
                    styles.searchResult,
                    { borderBottomColor: colors.borderGlass },
                  ]}
                >
                  <View style={styles.resultCopy}>
                    <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{result.name}</Text>
                    <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
                      {result.symbol} · {result.exchangeName}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))
            )}
          </View>
        </View>
      )}

      <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[styles.content, { paddingBottom: 38 + bottom, paddingTop: top + PANEL_HEADER_HEIGHT + 8 }]}
          showsVerticalScrollIndicator={false}
          {...scrollNav}
        >
          <Text style={[styles.intro, { color: colors.textMuted }]}>
            Twoje decyzje, Twoje tempo nauki.
          </Text>

          {/* Pojedyncza karta portfela 1:1 z dashboard */}
          <SinglePortfolioCard portfolio={currentPortfolio} />

          {/* Nowa zielona karta z przyciskiem + i listą instrumentów do dodania */}
          <Pressable
            onPress={() => handleGreenCardSearch('')}
            accessibilityLabel="Dodaj instrument do portfela"
            style={styles.greenCard}
          >
            {/* Zielone tło z transparentnością i boxowym wyglądem */}
            <View style={styles.greenBg}>
              <BlurView
                intensity={50}
                tint="light"
                style={StyleSheet.absoluteFill}
              />
            </View>

            <View style={styles.greenCardContent}>
              {/* Przycisk + w prawym górnym rogu */}
              <Pressable
                onPress={() => handleGreenCardSearch('')}
                accessibilityLabel="Dodaj instrument"
                style={styles.plusButton}
              >
                <Ionicons name="add" size={32} color="#ffffff" />
              </Pressable>

              {/* Tekst na środku karty */}
              <View style={styles.greenCardText}>
                <Text style={styles.greenCardTitle}>Dodaj instrument</Text>
                <Text style={styles.greenCardSubtitle}>Szukaj i dodaj spółki</Text>
              </View>
            </View>
          </Pressable>

          {/* Sekcja z kolorowymi kafelkami w siatce 2x2 (punkty 1, 3) */}
          <Section label="Kategorie aktywów">
            <View style={styles.categoriesGrid}>
              {currentPortfolio.categories.map((category) => (
                <AssetCategoryCard
                  key={category.id}
                  category={category}
                  currencySymbol={currentPortfolio.currencySymbol}
                  onPress={() => handleSelectCategory(category)}
                />
              ))}
            </View>
          </Section>
        </ScrollView>
      </BlurTargetView>

      {/* Okno modalne szczegółów instrumentu i zakupu (punkty 6, 7, 8, 9, 10, 11, 12) */}
      <InstrumentDetailModal
        visible={modalVisible}
        asset={selectedAsset}
        category={selectedCategory}
        portfolio={currentPortfolio}
        initialTab={modalInitialTab}
        onClose={handleCloseModal}
        modalInstrument={modalInstrument}
      />
    </View>
  );
}

// Stylesheet dla komponentu PortfolioScreen (ekran "Portfolio")
const styles = StyleSheet.create({
  blurTarget: { flex: 1 },
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 4 },
  greenCard: {
    position: 'relative',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#22c55e',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  greenBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  greenCardContent: {
    position: 'relative',
    zIndex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  plusButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  greenCardText: {
    alignItems: 'center',
    marginTop: -40,
  },
  greenCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  greenCardSubtitle: {
    fontSize: 12,
    color: '#e0e0e0',
    textAlign: 'center',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  dropdownContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  dropdownTextDisabled: {
    fontSize: 11,
    marginLeft: 8,
  },
  loadingItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  searchState: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 8,
  },
  searchStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  searchStateCopy: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  resultCopy: {
    flex: 1,
    marginRight: 8,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultMeta: {
    fontSize: 11,
    marginTop: 3,
  },
  cardContent: {
    zIndex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
