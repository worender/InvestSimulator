import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InstrumentSearchResult, getStockData } from '../../api/marketService';
import { AssetCategoryCard } from '../../components/AssetCategoryCard';
import { InstrumentDetailModal, ModalTab } from '../../components/InstrumentDetailModal';
import { InstrumentSearchSheet } from '../../components/InstrumentSearchSheet';
import { PANEL_HEADER_HEIGHT, PanelHeader } from '../../components/PanelHeader';
import { Section } from '../../components/Section';
import { SinglePortfolioCard } from '../../components/SinglePortfolioCard';
import { resolveCurrency } from '../../currency';
import {
  MOCK_PORTFOLIOS,
  MockPortfolio,
  PortfolioAssetItem,
  PortfolioCategory,
} from '../../database/mockPortfolioData';
import { notify } from '../../notificationBus';
import { useTheme } from '../../theme';
import { useScrollAwareNavigation } from '../../useScrollAwareNavigation';

export default function PortfolioScreen() {
  const { colors, mode } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  // Widok treści rozmywanej pod nagłówkiem (wymagane przez BlurView na Androidzie).
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();

  // Stan portfeli użytkownika
  const [portfolios, setPortfolios] = useState<MockPortfolio[]>(MOCK_PORTFOLIOS);
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

  // Menu przycisku "+" w headerze (osobny overlay, nie wpływa na układ treści)
  const [menuOpen, setMenuOpen] = useState(false);

  // Overlay wyszukiwania instrumentu (wspólny dla karty i menu headera)
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  // Animacja obracających się strzałek w headerze
  const rotation = useSharedValue(0);
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Animacja przycisku "+": obrót o 45° zmienia go w "x" po otwarciu menu
  const menuIconRotation = useSharedValue(0);
  const menuIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${menuIconRotation.value}deg` }],
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

  // Otwieranie/zamykanie menu przycisku "+" z animacją ikony
  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    menuIconRotation.value = withTiming(next ? 45 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeMenu = () => {
    setMenuOpen(false);
    menuIconRotation.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
  };

  // Dodanie nowego portfela na bazie aktualnie wybranego (limit 5)
  const handleAddPortfolio = () => {
    closeMenu();
    if (isAddDisabled) {
      notify({
        variant: 'info',
        title: 'Limit osiągnięty',
        message: 'Maksymalna liczba portfeli (5) została osiągnięta.',
      });
      return;
    }
    const newPortfolio: MockPortfolio = {
      ...currentPortfolio,
      id: `port-${Date.now()}`,
      name: `Portfel ${portfolios.length + 1}`,
    };
    setPortfolios((prev) => [...prev, newPortfolio]);
    setActivePortfolioIndex(portfolios.length);
    notify({
      variant: 'success',
      title: 'Utworzono nowy portfel',
      message: `${newPortfolio.name} jest gotowy do inwestowania.`,
    });
  };

  const handleOpenSearchSheet = () => {
    closeMenu();
    setSearchSheetOpen(true);
  };

  const handleSelectCategory = (category: PortfolioCategory) => {
    setSelectedCategory(category);
    setSelectedAsset(category.items[0] || null);
    setModalInitialTab('details');
    setModalVisible(true);
  };

  // Dodanie instrumentu do portfela: modal otwiera się od razu, a dane finansowe dociągają się w tle
  const handleAddInstrument = async (instrument: InstrumentSearchResult) => {
    setSearchSheetOpen(false);
    setSelectedCategory(null);
    setSelectedAsset(null);
    const resolvedCurrency = resolveCurrency(instrument);
    const selectedInstrument = {
      stock: instrument.symbol,
      title: instrument.name.toUpperCase(),
      currency: resolvedCurrency,
      symbol: instrument.symbol,
      exchange: instrument.exchange || instrument.exchangeName,
    };

    setModalInitialTab('details');
    setModalInstrument(selectedInstrument);
    setModalVisible(true);

    try {
      const financialData = await getStockData(instrument.symbol, instrument.exchange);
      if (!financialData) return;
      // Aktualizuj tylko wtedy, gdy modal nadal pokazuje ten sam instrument.
      setModalInstrument((current) =>
        current && current.symbol === instrument.symbol
          ? {
              ...current,
              currency: financialData.currency || current.currency,
              financialData,
            }
          : current,
      );
    } catch (error) {
      console.error('Błąd pobierania danych finansowych:', error);
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
          <View style={styles.headerButtons}>
            {/* Przycisk edycji/portfolio - mniejszy, jasny (biały w trybie ciemnym) */}
            <Pressable
              onPress={() => {
                notify({
                  variant: 'info',
                  title: 'Edycja/Usuwanie',
                  message: 'Obecnie wybrane portfolio nie może być usunięte ani edytowane.',
                });
              }}
              accessibilityLabel="Edytuj portfel"
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={mode === 'dark' ? '#ffffff' : colors.text}
              />
            </Pressable>

            {/* Przycisk "+": otwiera menu portfeli/instrumentów, ikona zmienia się w "x" */}
            <Pressable
              onPress={toggleMenu}
              accessibilityLabel={menuOpen ? 'Zamknij menu dodawania' : 'Dodaj portfel lub instrument'}
              accessibilityState={{ expanded: menuOpen }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: menuOpen ? colors.accentGlass : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Reanimated.View style={menuIconStyle}>
                <Ionicons name="add" size={24} color={colors.accent} />
              </Reanimated.View>
            </Pressable>
          </View>
        }
      />

      {/* Menu przycisku "+" jako osobny overlay nad treścią - nie przesuwa kart pod spodem */}
      {menuOpen && (
        <View style={styles.menuLayer} pointerEvents="box-none">
          <Pressable
            style={[StyleSheet.absoluteFill, styles.menuBackdrop]}
            onPress={closeMenu}
            accessibilityLabel="Zamknij menu"
          />
          <Reanimated.View
            style={[
              styles.menuCard,
              {
                top: top + PANEL_HEADER_HEIGHT + 6,
                backgroundColor: mode === 'dark' ? 'rgba(22, 27, 34, 0.97)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: colors.borderGlass,
              },
            ]}
          >
            <Pressable
              onPress={handleOpenSearchSheet}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.menuItem,
                { borderBottomColor: colors.borderGlass, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              <Text style={[styles.menuText, { color: colors.text }]}>Dodaj instrument</Text>
            </Pressable>

            <Pressable
              onPress={handleAddPortfolio}
              accessibilityRole="button"
              accessibilityState={{ disabled: isAddDisabled }}
              style={({ pressed }) => [
                styles.menuItem,
                styles.menuItemLast,
                { opacity: isAddDisabled ? 0.45 : pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons name="wallet-outline" size={20} color={colors.accent} />
              <Text style={[styles.menuText, { color: colors.text }]}>Dodaj nowe portfolio</Text>
              {isAddDisabled && (
                <Text style={[styles.menuLimit, { color: colors.textMuted }]}>limit</Text>
              )}
            </Pressable>
          </Reanimated.View>
        </View>
      )}

      <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[styles.content, { paddingBottom: 38 + bottom, paddingTop: top + PANEL_HEADER_HEIGHT + 8 }]}
          showsVerticalScrollIndicator={false}
          {...scrollNav}
        >
          {/* Pojedyncza karta portfela 1:1 z dashboard */}
          <SinglePortfolioCard portfolio={currentPortfolio} />

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

              {/* Karta dodawania instrumentu - należy do siatki i zajmuje dokładnie tyle samo miejsca co jedna karta */}
              <Pressable
                onPress={handleOpenSearchSheet}
                accessibilityLabel="Dodaj instrument do portfela"
                style={({ pressed }) => [
                  styles.addCard,
                  {
                    borderColor: '#22c55e55',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <BlurView
                  intensity={mode === 'dark' ? 40 : 55}
                  tint={mode === 'dark' ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: 'rgba(34, 197, 94, 0.16)',
                      opacity: mode === 'dark' ? 0.78 : 0.65,
                    },
                  ]}
                />

                <View style={styles.addCardContent}>
                  <View
                    style={[
                      styles.addCardButton,
                      { backgroundColor: '#22c55e25', borderColor: '#22c55e55' },
                    ]}
                  >
                    <Ionicons name="add" size={24} color="#22c55e" />
                  </View>
                  <Text style={[styles.addCardLabel, { color: colors.text }]}>Dodaj</Text>
                </View>
              </Pressable>
            </View>
          </Section>
        </ScrollView>
      </BlurTargetView>

      {/* Overlay wyszukiwania instrumentu (zielona karta + menu headera) */}
      {searchSheetOpen && (
        <InstrumentSearchSheet
          visible
          onClose={() => setSearchSheetOpen(false)}
          onSelect={handleAddInstrument}
        />
      )}

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
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 4 },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Overlay menu "+": zajmuje cały ekran, ale leży nad treścią i nie zmienia układu
  menuLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Poniżej nagłówka (zIndex 20), aby przycisk "+" pozostał klikalny i mógł zamknąć menu
    zIndex: 15,
    elevation: 15,
  },
  menuBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  menuCard: {
    position: 'absolute',
    right: 20,
    width: 232,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  menuLimit: {
    fontSize: 11,
  },
  // Karta dodawania instrumentu: te same wymiary co pojedyncza karta kategorii
  addCard: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1.2,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addCardContent: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 110,
  },
  addCardButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
