import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Reanimated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StockFinancialData } from "../api/marketService";
import { MOCK_PORTFOLIOS } from "../database/mockPortfolioData";
import {
  SEARCHABLE_INSTRUMENTS,
  SearchableInstrument,
} from "../database/mockSearchableInstruments";
import {
  InstrumentMarketCategory,
  MARKET_CATEGORY_LABELS,
  MARKET_INSTRUMENT_INFO,
  resolveMarketCategory,
} from "../instrumentCategories";
import { useLockScreenWhileActive } from "../interactionLock";
import { NOTIFICATION_GROUPS, notify } from "../notificationBus";
import { NotificationHost } from "../notifications";
import { useTheme } from "../theme";
import { useWatchlist } from "../watchlist";
import { CategorySelector } from "./CategorySelector";
import type { ChartInterval } from "./ChartFullscreenModal";
import {
  InstrumentDetails,
  useInstrumentFinancialData,
} from "./InstrumentDetails";
import { MarketClosedNoticeModal } from "./MarketClosedNoticeModal";
import { StockCandleChart } from "./StockCandleChart";
import { TradePanel } from "./TradePanel";

/**
 * Typy zakładek karty instrumentu.
 */
export type InstrumentCardTab = "instrument" | "market";

/**
 * Zakładki karty instrumentu z labelami i ikonami.
 * Kolejność decyduje o kolejności wyświetlania w interfejsie.
 */
const CARD_TABS = [
  { key: "instrument", label: "Instrument", icon: "swap-horizontal-outline" },
  { key: "market", label: "Dane rynkowe", icon: "stats-chart-outline" },
] as const;

/**
 * Skala ryzyka instrumentu: od niskiego (zielony) do bardzo wysokiego (czerwony).
 */
const RISK_LEVELS = [
  "Niski",
  "Umiarkowany",
  "Wysoki",
  "Bardzo wysoki",
] as const;
const RISK_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"] as const;

/**
 * Typ instrumentu używany w karcie instrumentu
 */
interface InstrumentCardInstrument {
  stock: string;
  title: string;
  currency: string;
  symbol: string;
  exchange: string;
  financialData?: StockFinancialData;
  marketCategory?: InstrumentMarketCategory;
}

interface InstrumentCardProps {
  instrument: InstrumentCardInstrument;
  financialData?: StockFinancialData;
  onClose: () => void;
  initialRangeIndex?: number;
  initialInterval?: ChartInterval;
}

/**
 * Konwertuje kategorię rynkową na kategorię używaną przez moduł handlu.
 * @param category Kategoria rynkowa
 * @returns Kategoria używana przez moduł handlu
 */
function toSearchableCategory(
  category: InstrumentMarketCategory,
): SearchableInstrument["category"] {
  switch (category) {
    case "bonds":
      return "BONDS";
    case "cfd":
      return "CFD";
    case "crypto":
      return "CRYPTO";
    default:
      return "STOCKS";
  }
}

/**
 * Komponent karty instrumentu: wyświetla wykres, moduł kupna/sprzedaży i informacje o instrumencie.
 * @param instrument Instrument do wyświetlenia
 * @param financialData Dane finansowe instrumentu (opcjonalne)
 * @param onClose Funkcja wywoływana przy zamknięciu karty
 * @param initialRangeIndex Początkowy indeks zakresu wykresu (opcjonalny)
 * @param initialInterval Początkowy interwał wykresu (opcjonalny)
 */
export function InstrumentCard({
  instrument,
  financialData: propFinancialData,
  onClose,
  initialRangeIndex,
  initialInterval,
}: InstrumentCardProps) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();

  // Blokuje gesty ekranu pod spodem
  useLockScreenWhileActive(true);

  const [activeTab, setActiveTab] = useState<InstrumentCardTab>("instrument");
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeData, setNoticeData] = useState<{
    instrument: SearchableInstrument;
    orderType: "BUY" | "SELL";
    quantity: number;
    totalCost: number;
  } | null>(null);

  // Portfel techniczny dla panelu handlu (podgląd rynku bez pozycji)
  const fallbackPortfolio = MOCK_PORTFOLIOS[0];

  const activeSymbol = instrument.symbol || instrument.stock;
  const activeName = instrument.title;
  const activeExchange = instrument.exchange;
  const activeCurrency = instrument.currency;
  const hasInstrument = Boolean(activeSymbol);

  const marketCategory =
    instrument.marketCategory ??
    resolveMarketCategory({
      symbol: activeSymbol,
      exchange: activeExchange,
    });

  const attachedFinancialData = propFinancialData ?? instrument.financialData;

  const instrumentRef = useMemo(
    () => ({
      stock: activeSymbol,
      exchange: activeExchange,
      currency: activeCurrency,
      financialData: attachedFinancialData,
    }),
    [activeSymbol, activeExchange, activeCurrency, attachedFinancialData],
  );

  const { financialData, loading } = useInstrumentFinancialData(
    instrumentRef,
    attachedFinancialData,
  );

  /**
   * Tworzy obiekt instrumentu do modułu handlu, łącząc dane finansowe i wyszukiwalne.
   * Wyszukiwalne instrumenty są używane do uzyskania domyślnej ceny, zmiany procentowej i statusu rynku.
   */
  const tradeInstrument = useMemo<SearchableInstrument>(() => {
    const symbolWithoutSuffix = activeSymbol.replace(/\.[A-Z]+$/i, "");
    const searchable = SEARCHABLE_INSTRUMENTS.find(
      (item) =>
        item.symbol === activeSymbol ||
        item.symbol === symbolWithoutSuffix ||
        item.symbol === instrument.stock,
    );

    return {
      id: activeSymbol,
      symbol: activeSymbol,
      name: activeName,
      category: toSearchableCategory(marketCategory),
      categoryLabel: `${MARKET_CATEGORY_LABELS[marketCategory]} · ${activeExchange}`,
      exchange: activeExchange,
      currency: activeCurrency,
      price: financialData?.price ?? searchable?.price ?? 0,
      changePercent:
        financialData?.changePercent ?? searchable?.changePercent ?? 0,
      isMarketOpen: searchable?.isMarketOpen ?? false,
      marketOpenTimeInfo:
        searchable?.marketOpenTimeInfo ?? "Rynek jest obecnie zamknięty.",
      chartPoints: searchable?.chartPoints ?? [],
    };
  }, [
    activeCurrency,
    activeExchange,
    activeName,
    activeSymbol,
    financialData,
    instrument.stock,
    marketCategory,
  ]);

  const isFavorite = isWatched(activeSymbol);

  const toggleFavorite = () => {
    toggleWatchlist({
      symbol: activeSymbol,
      name: activeName,
      exchange: activeExchange,
      currency: activeCurrency,
    });
  };

  /**
   * Tworzy obiekt z informacjami o instrumencie do wyświetlenia w karcie.
   */
  const instrumentInfo = {
    name: activeName,
    symbol: activeSymbol,
    exchange: activeExchange,
    categoryLabel: MARKET_CATEGORY_LABELS[marketCategory].toUpperCase(),
    description: MARKET_INSTRUMENT_INFO[marketCategory].description,
    riskLevel: MARKET_INSTRUMENT_INFO[marketCategory].riskLevel,
    assetClassInfo: MARKET_INSTRUMENT_INFO[marketCategory].assetClassInfo,
  };

  // Pozycja instrumentu na skali ryzyka
  const riskIndex = Math.max(
    0,
    RISK_LEVELS.indexOf(
      instrumentInfo.riskLevel as (typeof RISK_LEVELS)[number],
    ),
  );
  const riskColor = RISK_COLORS[riskIndex] ?? RISK_COLORS[0];
  const riskPercent = (riskIndex / (RISK_LEVELS.length - 1)) * 100;

  /**
   * Wyświetla alert o zamkniętym rynku i oczekującym zleceniu.
   * Zapisuje dane zlecenia w stanie komponentu i ustawia widoczność modala.
   * @param inst Instrument
   * @param orderType Typ zlecenia
   * @param quantity Ilość (liczba niekoniecznie całkowita)
   * @param total Łączna wartość zlecenia w walucie instrumentu
   */
  const handleMarketClosedAlert = (
    inst: SearchableInstrument,
    orderType: "BUY" | "SELL",
    quantity: number,
    total: number,
  ) => {
    setNoticeData({
      instrument: inst,
      orderType,
      quantity,
      totalCost: total,
    });
    setNoticeVisible(true);
  };

  /**
   * Potwierdza złożenie zlecenia oczekującego i wyświetla powiadomienie.
   */
  const handleConfirmPendingOrder = () => {
    if (noticeData) {
      const typeLabel = noticeData.orderType === "BUY" ? "kupna" : "sprzedaży";
      notify({
        variant: "success",
        title: "Zlecenie oczekujące złożone",
        category: NOTIFICATION_GROUPS.transactions,
        message: `Złożono zlecenie ${typeLabel} na ${noticeData.quantity} szt. ${noticeData.instrument.symbol}. Zostanie zrealizowane po wznowieniu handlu.`,
      });
    }
    setNoticeVisible(false);
  };

  // Animacja wysuwanej karty od dołu
  const translateY = useSharedValue(windowHeight);
  const dragStart = useSharedValue(0);
  const closeThreshold = Math.max(windowHeight * 0.12, 96);

  const animateClose = useCallback(() => {
    translateY.value = withTiming(
      windowHeight,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        "worklet";
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  }, [onClose, translateY, windowHeight]);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [translateY]);

  const createDragGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .onStart(() => {
          cancelAnimation(translateY);
          dragStart.value = translateY.value;
        })
        .onUpdate((event) => {
          const dy = event.translationY;
          const offset = dy > 0 ? dy : Math.max(dy * 0.15, -14);
          translateY.value = Math.max(dragStart.value + offset, -14);
        })
        .onEnd((event) => {
          const shouldClose =
            translateY.value > closeThreshold ||
            (event.translationY > 32 && event.velocityY > 800);

          if (shouldClose) {
            const remaining = Math.max(windowHeight - translateY.value, 0);
            const duration = Math.min(Math.max(remaining * 0.35, 120), 260);
            translateY.value = withTiming(
              windowHeight,
              { duration, easing: Easing.out(Easing.cubic) },
              (finished) => {
                "worklet";
                if (finished) {
                  runOnJS(onClose)();
                }
              },
            );
          } else {
            translateY.value = withSpring(0, {
              damping: 24,
              stiffness: 240,
              mass: 0.9,
              overshootClamping: true,
            });
          }
        }),
    [closeThreshold, onClose, translateY, dragStart, windowHeight],
  );

  const dragGesture = useMemo(() => createDragGesture(), [createDragGesture]);
  const headerDragGesture = useMemo(
    () => createDragGesture(),
    [createDragGesture],
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, Math.max(windowHeight * 0.5, 1)],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: interpolate(
          translateY.value,
          [0, 80],
          [1, 1.35],
          Extrapolation.CLAMP,
        ),
      },
    ],
    backgroundColor: interpolateColor(
      translateY.value,
      [0, 50],
      [theme.colors.border, theme.colors.accent],
    ),
  }));

  const contentBottom = 40 + bottom;

  return (
    <>
      <Modal
        visible
        transparent
        animationType="none"
        onRequestClose={animateClose}
      >
        <NotificationHost />
        <GestureHandlerRootView style={styles.gestureRoot}>
          <View style={styles.modalRoot}>
            <Reanimated.View
              style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}
            >
              <Pressable
                style={styles.backdrop}
                onPress={animateClose}
                accessibilityLabel="Zamknij okno modalne"
              />
            </Reanimated.View>

            <Reanimated.View
              style={[
                styles.sheet,
                { backgroundColor: theme.colors.background },
                sheetAnimatedStyle,
              ]}
            >
              <View
                style={[
                  styles.header,
                  { borderBottomColor: theme.colors.borderGlass },
                ]}
              >
                <GestureDetector gesture={dragGesture}>
                  <View
                    style={styles.dragArea}
                    accessibilityHint="Przeciągnij w dół, aby zamknąć okno"
                  >
                    <Reanimated.View
                      style={[styles.dragHandle, handleAnimatedStyle]}
                    />
                  </View>
                </GestureDetector>

                <View style={styles.headerRow}>
                  <View style={styles.side}>
                    <Pressable
                      onPress={toggleFavorite}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isFavorite
                          ? "Usuń z polubionych"
                          : "Dodaj do polubionych"
                      }
                    >
                      <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={22}
                        color={isFavorite ? "#FF3B30" : theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>

                  <GestureDetector gesture={headerDragGesture}>
                    <View style={styles.center}>
                      <Text
                        accessibilityRole="header"
                        numberOfLines={1}
                        style={[
                          styles.headerTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {activeName}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.headerSubtitle,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {activeSymbol} · {activeExchange}
                      </Text>
                    </View>
                  </GestureDetector>

                  <View style={[styles.side, styles.sideRight]}>
                    <Pressable
                      onPress={animateClose}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Zamknij"
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color={theme.colors.accent}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.tabsBar,
                  { borderBottomColor: theme.colors.borderGlass },
                ]}
              >
                <CategorySelector
                  options={CARD_TABS}
                  value={activeTab}
                  onChange={setActiveTab}
                  accessibilityLabel="Sekcja instrumentu"
                />
              </View>

              {activeTab === "instrument" ? (
                <ScrollView
                  key="instrument"
                  style={styles.content}
                  contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: contentBottom },
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {hasInstrument ? (
                    <>
                      {/* Wykres */}
                      <View style={styles.chartContainer}>
                        <StockCandleChart
                          key={`${activeSymbol}-${initialRangeIndex ?? "default"}-${initialInterval ?? "default"}`}
                          stock={activeSymbol}
                          title={activeName}
                          currency={activeCurrency}
                          exchange={activeExchange}
                          variant="embedded"
                          initialRangeIndex={initialRangeIndex}
                          initialInterval={initialInterval}
                        />
                      </View>

                      <TradePanel
                        key={activeSymbol}
                        instrument={tradeInstrument}
                        portfolio={fallbackPortfolio}
                        ownedQuantity={0}
                        onMarketClosedAlert={handleMarketClosedAlert}
                      />

                      {/* Informacje o instrumencie */}
                      <View style={styles.assetInfoSection}>
                        <Text
                          style={[
                            styles.assetInfoTitle,
                            { color: theme.colors.text },
                          ]}
                        >
                          {instrumentInfo.name}
                        </Text>
                        <Text
                          style={[
                            styles.assetInfoMeta,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {instrumentInfo.symbol} · {instrumentInfo.exchange} ·{" "}
                          {instrumentInfo.categoryLabel}
                        </Text>

                        <Text
                          style={[
                            styles.assetInfoDescription,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {instrumentInfo.description}
                        </Text>

                        {/* Wskaźnik ryzyka: termometr z trójkątem na skali */}
                        <View
                          style={[
                            styles.riskCard,
                            {
                              borderColor: theme.colors.border,
                              backgroundColor:
                                theme.mode === "dark"
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.03)",
                            },
                          ]}
                        >
                          <View style={styles.riskHeader}>
                            <Text
                              style={[
                                styles.riskLabel,
                                { color: theme.colors.textMuted },
                              ]}
                            >
                              POZIOM RYZYKA
                            </Text>
                            <Text
                              style={[styles.riskValue, { color: riskColor }]}
                            >
                              {instrumentInfo.riskLevel}
                            </Text>
                          </View>

                          <View style={styles.riskMeter}>
                            <View
                              style={[
                                styles.riskMarker,
                                { left: `${riskPercent}%` },
                              ]}
                            >
                              <Ionicons
                                name="caret-down"
                                size={16}
                                color={riskColor}
                              />
                            </View>
                            <View style={styles.riskBar}>
                              {RISK_COLORS.map((color) => (
                                <View
                                  key={color}
                                  style={[
                                    styles.riskSegment,
                                    { backgroundColor: color },
                                  ]}
                                />
                              ))}
                            </View>
                          </View>

                          <View style={styles.riskScale}>
                            {RISK_LEVELS.map((level, index) => (
                              <Text
                                key={level}
                                style={[
                                  styles.riskScaleLabel,
                                  {
                                    color:
                                      index === riskIndex
                                        ? riskColor
                                        : theme.colors.textMuted,
                                    fontWeight:
                                      index === riskIndex ? "700" : "400",
                                  },
                                ]}
                              >
                                {level}
                              </Text>
                            ))}
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.assetInfoFootnote,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {instrumentInfo.assetClassInfo}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="albums-outline"
                        size={28}
                        color={theme.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.emptyStateText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        Brak instrumentów w tej kategorii.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              ) : (
                <ScrollView
                  key="market"
                  style={styles.content}
                  contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: contentBottom },
                  ]}
                  showsVerticalScrollIndicator={false}
                >
                  {hasInstrument ? (
                    <InstrumentDetails
                      financialData={financialData}
                      loading={loading}
                      category={marketCategory}
                    />
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="albums-outline"
                        size={28}
                        color={theme.colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.emptyStateText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        Brak instrumentów w tej kategorii.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </Reanimated.View>
          </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Powiadomienie modalne o zamkniętym rynku */}
      <MarketClosedNoticeModal
        visible={noticeVisible}
        instrument={noticeData?.instrument ?? null}
        orderType={noticeData?.orderType ?? "BUY"}
        quantity={noticeData?.quantity ?? 0}
        totalCost={noticeData?.totalCost ?? 0}
        onConfirmPendingOrder={handleConfirmPendingOrder}
        onClose={() => setNoticeVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  sheet: {
    height: "91%",
    maxHeight: "91%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  dragArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  side: {
    width: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
  },
  sideRight: {
    justifyContent: "flex-end",
    paddingLeft: 0,
    paddingRight: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    maxWidth: "100%",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 2,
  },
  tabsBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  chartContainer: {
    paddingTop: 10,
  },
  assetInfoSection: {
    marginTop: 38,
    gap: 8,
  },
  assetInfoTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  assetInfoMeta: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  assetInfoDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  riskCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  riskValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  riskMeter: {
    height: 20,
    justifyContent: "center",
  },
  riskMarker: {
    position: "absolute",
    top: -2,
    marginLeft: -8,
  },
  riskBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  riskSegment: {
    flex: 1,
  },
  riskScale: {
    flexDirection: "row",
  },
  riskScaleLabel: {
    flex: 1,
    fontSize: 9,
  },
  assetInfoFootnote: {
    fontSize: 11,
    lineHeight: 16,
  },
  emptyState: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
