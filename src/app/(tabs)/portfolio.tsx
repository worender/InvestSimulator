import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurTargetView } from "expo-blur";
import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AddPortfolioSheet,
  type AddPortfolioInput,
} from "../../components/AddPortfolioSheet";
import { AssetCategoryCard } from "../../components/AssetCategoryCard";
import { PortfolioCashSheet } from "../../components/PortfolioCashSheet";
import { PANEL_HEADER_HEIGHT, PanelHeader } from "../../components/PanelHeader";
import {
  pillarKeyToAssetCategoryKey,
  PORTFOLIO_PILLARS,
  PortfolioPillarKey,
  PortfolioPillarSheet,
} from "../../components/PortfolioPillarSheet";
import { Section } from "../../components/Section";
import { SinglePortfolioCard } from "../../components/SinglePortfolioCard";
import {
  MOCK_PORTFOLIOS,
  MockPortfolio,
  PortfolioCategory,
} from "../../database/mockPortfolioData";
import { NOTIFICATION_GROUPS, notify } from "../../notificationBus";
import { useTheme } from "../../theme";
import { useLayoutMode } from "../../useLayoutMode";
import { useResetOnPanelBlur } from "../../useResetOnPanelBlur";
import { useScrollAwareNavigation } from "../../useScrollAwareNavigation";

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  // Widok treści rozmywanej pod nagłówkiem
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();
  const { isDesktop, isWeb } = useLayoutMode();

  // Stan portfeli użytkownika
  const [portfolios, setPortfolios] =
    useState<MockPortfolio[]>(MOCK_PORTFOLIOS);
  const [activePortfolioIndex, setActivePortfolioIndex] = useState(0);
  const [pillarCategoriesByPortfolio, setPillarCategoriesByPortfolio] =
    useState<Record<string, PortfolioCategory[]>>({});
  const [pillarSheetOpen, setPillarSheetOpen] = useState(false);
  const [addPortfolioSheetOpen, setAddPortfolioSheetOpen] = useState(false);
  const [cashSheetOpen, setCashSheetOpen] = useState(false);

  // Animacja obracających się strzałek w headerze
  const rotation = useSharedValue(0);
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const currentPortfolio = portfolios[activePortfolioIndex] || portfolios[0];
  const activePillars =
    pillarCategoriesByPortfolio[currentPortfolio?.id] ??
    currentPortfolio?.categories ??
    [];
  const hasMultiplePortfolios = portfolios.length > 1;
  const isAddDisabled = portfolios.length >= 5;

  const handleSwitchPortfolio = () => {
    rotation.value = withTiming(rotation.value + 180, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
    setActivePortfolioIndex((prev) => {
      const next = (prev + 1) % portfolios.length;
      notify({
        variant: "info",
        title: "Zmieniono portfel",
        category: NOTIFICATION_GROUPS.portfolio,
        message: `Wyświetlany jest teraz ${portfolios[next].name}.`,
      });
      return next;
    });
  };

  // Po opuszczeniu zakładki menu i wyszukiwanie wracają do stanu początkowego.
  useResetOnPanelBlur(() => {
    setPillarSheetOpen(false);
    setAddPortfolioSheetOpen(false);
    setCashSheetOpen(false);
  });

  /**
   * Obsługuje kliknięcie przycisku dodawania nowego portfela.
   * Jeśli limit portfeli został osiągnięty, wyświetla powiadomienie.
   * W przeciwnym razie otwiera arkusz tworzenia nowego portfela.
   */
  const handleAddPortfolio = () => {
    if (isAddDisabled) {
      notify({
        variant: "info",
        title: "Limit osiągnięty",
        category: NOTIFICATION_GROUPS.portfolio,
        message: "Maksymalna liczba portfeli (5) została osiągnięta.",
      });
      return;
    }
    setAddPortfolioSheetOpen(true);
  };

  /**
   * Tworzy nowy portfel na podstawie danych z formularza.
   * @param input Dane z formularza tworzenia portfela
   */
  const handleCreatePortfolio = (input: AddPortfolioInput) => {
    const newPortfolio: MockPortfolio = {
      ...currentPortfolio,
      id: `port-${Date.now()}`,
      name: input.name,
      currency: input.currency,
      currencySymbol:
        input.currency === "PLN" ? "zł" : input.currency === "EUR" ? "€" : "$",
      cashBalance: 0,
      totalValue: 0,
      profitCurrency: 0,
      profitPercent: 0,
      categories: [],
    };

    const pillarCategories = input.pillars.map((key) => {
      const option = PORTFOLIO_PILLARS.find((pillar) => pillar.key === key)!;
      return {
        id: pillarKeyToAssetCategoryKey(key),
        title: option.title,
        subtitle: option.description,
        pastelBgLight: option.pastelLight,
        pastelBgDark: option.pastelDark,
        accentColor: option.color,
        totalValue: 0,
        profitCurrency: 0,
        profitPercent: 0,
        items: [],
      } satisfies PortfolioCategory;
    });

    setPortfolios((prev) => [...prev, newPortfolio]);
    setPillarCategoriesByPortfolio((prev) => ({
      ...prev,
      [newPortfolio.id]: pillarCategories,
    }));
    setAddPortfolioSheetOpen(false);
    setActivePortfolioIndex(portfolios.length);
    notify({
      variant: "success",
      title: "Utworzono nowy portfel",
      category: NOTIFICATION_GROUPS.portfolio,
      message: `${newPortfolio.name} jest gotowy do inwestowania.`,
    });
  };

  /**
   * Dodaje nowy filar do aktualnego portfela.
   * @param key
   * @returns
   */
  const handleAddPillar = (key: PortfolioPillarKey) => {
    const option = PORTFOLIO_PILLARS.find((pillar) => pillar.key === key);
    if (!option || !currentPortfolio) return;

    setPillarCategoriesByPortfolio((prev) => {
      const existing =
        prev[currentPortfolio.id] ?? currentPortfolio.categories ?? [];
      if (existing.some((category) => category.id === key)) return prev;

      const category: PortfolioCategory = {
        id: pillarKeyToAssetCategoryKey(key),
        title: option.title,
        subtitle: option.description,
        pastelBgLight: option.pastelLight,
        pastelBgDark: option.pastelDark,
        accentColor: option.color,
        totalValue: 0,
        profitCurrency: 0,
        profitPercent: 0,
        items: [],
      };

      return {
        ...prev,
        [currentPortfolio.id]: [...existing, category],
      };
    });
    notify({
      variant: "success",
      title: "Dodano filar",
      category: NOTIFICATION_GROUPS.portfolio,
      message: `${option.title} został dodany do portfela ${currentPortfolio.name}.`,
    });
  };

  const handleCashOperation = (input: {
    operation: "deposit" | "withdraw" | "transfer";
    amount: number;
    sourceCurrency: string;
    targetPortfolioId?: string;
    targetAmount?: number;
  }) => {
    setPortfolios((prev) =>
      prev.map((portfolio) => {
        if (input.operation === "transfer") {
          if (portfolio.id === currentPortfolio.id) {
            const cashBalance = portfolio.cashBalance - input.amount;
            return {
              ...portfolio,
              cashBalance,
              totalValue: Math.max(0, portfolio.totalValue - input.amount),
            };
          }
          if (portfolio.id === input.targetPortfolioId) {
            const transferredAmount = input.targetAmount ?? input.amount;
            return {
              ...portfolio,
              cashBalance: portfolio.cashBalance + transferredAmount,
              totalValue: portfolio.totalValue + transferredAmount,
            };
          }
          return portfolio;
        }

        if (portfolio.id !== currentPortfolio.id) return portfolio;
        const cashBalance =
          input.operation === "deposit"
            ? portfolio.cashBalance + input.amount
            : portfolio.cashBalance - input.amount;
        return {
          ...portfolio,
          cashBalance,
          totalValue: Math.max(
            0,
            input.operation === "deposit"
              ? portfolio.totalValue + input.amount
              : portfolio.totalValue - input.amount,
          ),
        };
      }),
    );
    setCashSheetOpen(false);

    const operationLabel =
      input.operation === "deposit"
        ? "Wpłata"
        : input.operation === "withdraw"
          ? "Wypłata"
          : "Transfer";
    notify({
      variant: "success",
      title: `${operationLabel} wykonana`,
      category: NOTIFICATION_GROUPS.portfolio,
      message: `${currentPortfolio.name}: operacja została zrealizowana w walucie ${currentPortfolio.currency}.`,
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
            <Pressable
              onPress={() => setCashSheetOpen(true)}
              accessibilityLabel="Wpłata lub wypłata środków"
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={22}
                color={colors.accent}
              />
            </Pressable>
            <Pressable
              onPress={handleAddPortfolio}
              accessibilityLabel="Dodaj nowe portfolio"
              accessibilityState={{ disabled: isAddDisabled }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: "transparent",
                  opacity: isAddDisabled ? 0.45 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
        }
      />

      <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[
            styles.content,
            isDesktop && styles.contentDesktop,
            {
              paddingBottom: 38 + bottom,
              paddingTop: top + PANEL_HEADER_HEIGHT + 8,
            },
          ]}
          showsVerticalScrollIndicator={isWeb}
          {...scrollNav}
        >
          <SinglePortfolioCard portfolio={currentPortfolio} />

          <Section label="Filary portfela">
            <View style={styles.categoriesGrid}>
              {activePillars.map((category) => (
                <AssetCategoryCard
                  key={category.id}
                  category={category}
                  currency={currentPortfolio.currency}
                  onPress={() => undefined}
                />
              ))}

              {activePillars.length < 5 && (
                <Pressable
                  onPress={() => setPillarSheetOpen(true)}
                  accessibilityLabel="Dodaj filar portfela"
                  style={({ pressed }) => [
                    styles.addCard,
                    {
                      borderColor: colors.accent + "99",
                      backgroundColor: colors.background,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={styles.addCardClip}>
                    <View style={styles.addCardContent}>
                      <View
                        style={[
                          styles.addCardButton,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.accent + "99",
                          },
                        ]}
                      >
                        <Ionicons name="add" size={24} color={colors.accent} />
                      </View>
                      <Text
                        style={[styles.addCardLabel, { color: colors.text }]}
                      >
                        Dodaj
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )}
            </View>
          </Section>
        </ScrollView>
      </BlurTargetView>

      {pillarSheetOpen && (
        <PortfolioPillarSheet
          selectedKeys={activePillars.map(
            (category) => category.id as PortfolioPillarKey,
          )}
          onClose={() => setPillarSheetOpen(false)}
          onSelect={(key) => {
            handleAddPillar(key);
            setPillarSheetOpen(false);
          }}
        />
      )}

      {addPortfolioSheetOpen && (
        <AddPortfolioSheet
          onClose={() => setAddPortfolioSheetOpen(false)}
          onAdd={handleCreatePortfolio}
        />
      )}

      {cashSheetOpen && (
        <PortfolioCashSheet
          portfolioId={currentPortfolio.id}
          portfolioName={currentPortfolio.name}
          portfolioCurrency={currentPortfolio.currency}
          cashBalance={currentPortfolio.cashBalance}
          portfolios={portfolios.map((portfolio) => ({
            id: portfolio.id,
            name: portfolio.name,
            currency: portfolio.currency,
            cashBalance: portfolio.cashBalance,
          }))}
          onClose={() => setCashSheetOpen(false)}
          onConfirm={handleCashOperation}
        />
      )}
    </View>
  );
}

// Stylesheet dla komponentu PortfolioScreen (ekran "Portfolio")
const styles = StyleSheet.create({
  blurTarget: { flex: 1 },
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  // Na desktopie treść w wyśrodkowanej kolumnie o ograniczonej szerokości
  contentDesktop: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 32,
  },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 4,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addCard: {
    width: "48%",
    borderRadius: 20,
    borderWidth: 1.2,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addCardClip: {
    borderRadius: 20,
    overflow: "hidden",
  },
  addCardContent: {
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 110,
  },
  addCardButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addCardLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 6,
  },
});
