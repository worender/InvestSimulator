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
import { InstrumentCard } from "../../components/InstrumentCard";
import { PANEL_HEADER_HEIGHT, PanelHeader } from "../../components/PanelHeader";
import { PortfolioCashSheet } from "../../components/PortfolioCashSheet";
import { PortfolioCategoryModal } from "../../components/PortfolioCategoryModal";
import {
  PORTFOLIO_PILLARS,
  PortfolioPillarSheet,
  type PortfolioPillarKey,
} from "../../components/PortfolioPillarSheet";
import { Section } from "../../components/Section";
import { SinglePortfolioCard } from "../../components/SinglePortfolioCard";
import {
  createCategory,
  createWallet,
  depositToWallet,
  transferBetweenWallets,
  withdrawFromWallet,
} from "../../database/database";
import { resolveMarketCategory } from "../../instrumentCategories";
import { NOTIFICATION_GROUPS, notify } from "../../notificationBus";
import { usePortfolios } from "../../portfolio/PortfolioProvider";
import { useTheme } from "../../theme";
import { useLayoutMode } from "../../useLayoutMode";
import { useResetOnPanelBlur } from "../../useResetOnPanelBlur";
import { useScrollAwareNavigation } from "../../useScrollAwareNavigation";

export default function PortfolioScreen() {
  const { colors, activeAccount } = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  const blurTargetRef = useRef<ComponentRef<typeof View>>(null);
  const scrollNav = useScrollAwareNavigation();
  const { isDesktop, isWeb } = useLayoutMode();
  const {
    portfolios,
    activePortfolio,
    setActiveWalletId,
    reload,
  } = usePortfolios();

  const [pillarSheetOpen, setPillarSheetOpen] = useState(false);
  const [addPortfolioSheetOpen, setAddPortfolioSheetOpen] = useState(false);
  const [cashSheetOpen, setCashSheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedAsset, setSelectedAsset] = useState<{
    symbol: string;
    categoryId: number;
  } | null>(null);

  const rotation = useSharedValue(0);
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const activePillars = activePortfolio?.categories ?? [];
  const hasMultiplePortfolios = portfolios.length > 1;
  const isAddDisabled = portfolios.length >= 5;
  const userId = activeAccount?.id ?? 1;

  const selectedCategory =
    activePortfolio?.categories.find(
      (category) => category.categoryId === selectedCategoryId,
    ) ?? null;

  const selectedAssetCategory =
    activePortfolio?.categories.find(
      (category) => category.categoryId === selectedAsset?.categoryId,
    ) ?? null;

  const selectedAssetItem =
    selectedAssetCategory?.items.find(
      (item) => item.symbol === selectedAsset?.symbol,
    ) ?? null;

  useResetOnPanelBlur(() => {
    setPillarSheetOpen(false);
    setAddPortfolioSheetOpen(false);
    setCashSheetOpen(false);
    setSelectedCategoryId(null);
    setSelectedAsset(null);
  });

  const handleSwitchPortfolio = () => {
    if (!activePortfolio || portfolios.length < 2) return;

    const index = portfolios.findIndex(
      (portfolio) => portfolio.walletId === activePortfolio.walletId,
    );
    const next = portfolios[(index + 1) % portfolios.length];

    rotation.value = withTiming(rotation.value + 180, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
    setActiveWalletId(next.walletId);
    notify({
      variant: "info",
      title: "Zmieniono portfel",
      category: NOTIFICATION_GROUPS.portfolio,
      message: `Wyświetlany jest teraz ${next.name}.`,
    });
  };

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

  const handleCreatePortfolio = async (input: AddPortfolioInput) => {
    try {
      const wallet = await createWallet(userId, {
        name: input.name,
        currency: input.currency,
        balance: 0,
      });

      for (const key of input.pillars) {
        const option = PORTFOLIO_PILLARS.find((pillar) => pillar.key === key);
        if (option) {
          await createCategory(wallet.id, {
            name: option.title,
            kind: key,
          });
        }
      }

      await reload();
      setActiveWalletId(wallet.id);
      setAddPortfolioSheetOpen(false);
      notify({
        variant: "success",
        title: "Utworzono nowy portfel",
        category: NOTIFICATION_GROUPS.portfolio,
        message: `${wallet.name} jest gotowy do inwestowania.`,
      });
    } catch (error) {
      notify({
        variant: "error",
        title: "Nie udało się utworzyć portfela",
        category: NOTIFICATION_GROUPS.portfolio,
        message:
          error instanceof Error
            ? error.message
            : "Spróbuj ponownie za chwilę.",
      });
    }
  };

  const handleAddPillar = async (key: PortfolioPillarKey) => {
    if (!activePortfolio) return;

    const option = PORTFOLIO_PILLARS.find((pillar) => pillar.key === key);
    if (!option) return;

    try {
      await createCategory(activePortfolio.walletId, {
        name: option.title,
        kind: key,
      });
      await reload();
      setPillarSheetOpen(false);
      notify({
        variant: "success",
        title: "Dodano filar",
        category: NOTIFICATION_GROUPS.portfolio,
        message: `${option.title} został dodany do portfela ${activePortfolio.name}.`,
      });
    } catch (error) {
      notify({
        variant: "error",
        title: "Nie udało się dodać filaru",
        category: NOTIFICATION_GROUPS.portfolio,
        message:
          error instanceof Error
            ? error.message
            : "Spróbuj ponownie za chwilę.",
      });
    }
  };

  const handleCashOperation = async (input: {
    operation: "deposit" | "withdraw" | "transfer";
    amount: number;
    sourceCurrency: string;
    targetPortfolioId?: string;
    targetAmount?: number;
  }): Promise<boolean> => {
    if (!activePortfolio) return false;

    try {
      if (input.operation === "deposit") {
        await depositToWallet(activePortfolio.walletId, userId, input.amount);
      } else if (input.operation === "withdraw") {
        await withdrawFromWallet(activePortfolio.walletId, userId, input.amount);
      } else {
        const target = portfolios.find(
          (portfolio) => portfolio.id === input.targetPortfolioId,
        );
        if (!target) throw new Error("Nie znaleziono portfela docelowego");
        await transferBetweenWallets(
          userId,
          activePortfolio.walletId,
          target.walletId,
          input.amount,
          input.targetAmount ?? 0,
        );
      }

      await reload();
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
        message: `${activePortfolio.name}: operacja została zrealizowana.`,
      });
      return true;
    } catch (error) {
      notify({
        variant: "error",
        title: "Operacja nie została wykonana",
        category: NOTIFICATION_GROUPS.portfolio,
        message:
          error instanceof Error
            ? error.message
            : "Spróbuj ponownie za chwilę.",
      });
      return false;
    }
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
          {activePortfolio ? (
            <>
              <SinglePortfolioCard portfolio={activePortfolio} />

              <Section label="Filary portfela">
                <View style={styles.categoriesGrid}>
                  {activePillars.map((category) => (
                    <AssetCategoryCard
                      key={category.categoryId}
                      category={category}
                      currency={activePortfolio.currency}
                      onPress={() => setSelectedCategoryId(category.categoryId)}
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
                            <Ionicons
                              name="add"
                              size={24}
                              color={colors.accent}
                            />
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
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="wallet-outline"
                size={32}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Brak portfela. Utwórz nowy portfel, aby rozpocząć inwestowanie.
              </Text>
            </View>
          )}
        </ScrollView>
      </BlurTargetView>

      {pillarSheetOpen && activePortfolio && (
        <PortfolioPillarSheet
          selectedKeys={activePillars.map((category) => category.kind)}
          onClose={() => setPillarSheetOpen(false)}
          onSelect={handleAddPillar}
        />
      )}

      {addPortfolioSheetOpen && (
        <AddPortfolioSheet
          onClose={() => setAddPortfolioSheetOpen(false)}
          onAdd={handleCreatePortfolio}
        />
      )}

      {cashSheetOpen && activePortfolio && (
        <PortfolioCashSheet
          portfolioId={activePortfolio.id}
          portfolioName={activePortfolio.name}
          portfolioCurrency={activePortfolio.currency}
          cashBalance={activePortfolio.cashBalance}
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

      {selectedCategory && activePortfolio && (
        <PortfolioCategoryModal
          portfolio={activePortfolio}
          category={selectedCategory}
          onClose={() => setSelectedCategoryId(null)}
          onOpenAsset={(asset) => {
            setSelectedCategoryId(null);
            setSelectedAsset({
              symbol: asset.symbol,
              categoryId: selectedCategory.categoryId,
            });
          }}
        />
      )}

      {selectedAssetItem && (
        <InstrumentCard
          instrument={{
            stock: selectedAssetItem.symbol,
            title: selectedAssetItem.name.toUpperCase(),
            currency: selectedAssetItem.currency,
            symbol: selectedAssetItem.symbol,
            exchange: selectedAssetItem.exchange,
            marketCategory: resolveMarketCategory({
              category: selectedAssetItem.category,
              symbol: selectedAssetItem.symbol,
              exchange: selectedAssetItem.exchange,
            }),
          }}
          onClose={() => {
            const categoryId = selectedAsset?.categoryId;
            setSelectedAsset(null);
            if (categoryId !== undefined) setSelectedCategoryId(categoryId);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blurTarget: { flex: 1 },
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  contentDesktop: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 32,
  },
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
