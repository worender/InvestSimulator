import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurTargetView } from 'expo-blur';
import { useRef, useState, type ComponentRef } from 'react';
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
          <Pressable
            onPress={handleAddPortfolio}
            disabled={isAddDisabled}
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
        }
      />

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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
