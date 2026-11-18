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
import {
  MOCK_PORTFOLIOS,
  MockPortfolio,
  PortfolioAssetItem,
  PortfolioCategory,
  TransactionHistoryItem,
} from "../database/mockPortfolioData";
import {
  SEARCHABLE_INSTRUMENTS,
  SearchableInstrument,
} from "../database/mockSearchableInstruments";
import { useDisplayCurrency } from "../displayCurrency";
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
 * Maksymalna liczba transakcji wyświetlanych w karcie instrumentu.
 * Pozostałe są dostępne w pełnej historii transakcji.
 */
const MAX_VISIBLE_TRANSACTIONS = 5;

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
  initialTab?: InstrumentCardTab;
  // Dane portfela są opcjonalne: karta działa też jako podgląd rynku bez pozycji
  portfolio?: MockPortfolio;
  category?: PortfolioCategory | null;
  asset?: PortfolioAssetItem | null;
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
 * Komponent karty instrumentu: wyświetla wykres, moduł kupna/sprzedaży, historię transakcji i informacje o instrumencie.
 * @param instrument Instrument do wyświetlenia
 * @param financialData Dane finansowe instrumentu (opcjonalne)
 * @param onClose Funkcja wywoływana przy zamknięciu karty
 * @param initialRangeIndex Początkowy indeks zakresu wykresu (opcjonalny)
 * @param initialInterval Początkowy interwał wykresu (opcjonalny)
 * @param initialTab Początkowa zakładka karty (opcjonalna, domyślnie "instrument")
 * @param portfolio Portfel użytkownika (opcjonalny)
 * @param category Kategoria portfela (opcjonalna)
 * @param asset Pozycja w portfelu (opcjonalna)
 * @returns
 */
export function InstrumentCard({
  instrument,
  financialData: propFinancialData,
  onClose,
  initialRangeIndex,
  initialInterval,
  initialTab = "instrument",
  portfolio,
  category,
  asset,
}: InstrumentCardProps) {
  const theme = useTheme();
  const display = useDisplayCurrency();
  const { bottom } = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();

  // Blokuje gesty ekranu pod spodem
  useLockScreenWhileActive(true);

  const [activeTab, setActiveTab] = useState<InstrumentCardTab>(initialTab);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [noticeData, setNoticeData] = useState<{
    instrument: SearchableInstrument;
    orderType: "BUY" | "SELL";
    quantity: number;
    totalCost: number;
  } | null>(null);

  const categoryItems = category?.items ?? [];
  const initialAssetIndex = useMemo(() => {
    if (!category || !asset) return 0;
    const index = category.items.findIndex((item) => item.id === asset.id);
    return index >= 0 ? index : 0;
  }, [asset, category]);
  const [selectedAssetIndex, setSelectedAssetIndex] =
    useState(initialAssetIndex);

  const categoryAsset = categoryItems[selectedAssetIndex] ?? null;
  const fallbackPortfolio = portfolio ?? MOCK_PORTFOLIOS[0];

  // Pozycja instrumentu w portfelu: najpierw wybrana kategoria, potem
  // dopasowanie po symbolu w bieżącym portfelu
  const portfolioAsset = useMemo<PortfolioAssetItem | null>(() => {
    if (categoryAsset) return categoryAsset;
    if (asset) return asset;

    const symbol = instrument.stock.replace(/\.[A-Z]+$/i, "");
    for (const portfolioCategory of fallbackPortfolio.categories) {
      const found = portfolioCategory.items.find(
        (item) =>
          item.symbol === instrument.stock ||
          item.symbol.replace(/\.[A-Z]+$/i, "") === symbol,
      );
      if (found) return found;
    }
    return null;
  }, [asset, categoryAsset, fallbackPortfolio, instrument.stock]);

  const activeSymbol = portfolioAsset?.symbol ?? instrument.stock;
  const activeName = portfolioAsset?.name ?? instrument.title;
  const activeExchange = portfolioAsset?.exchange ?? instrument.exchange;
  const activeCurrency = portfolioAsset?.currency ?? instrument.currency;
  const hasInstrument = Boolean(portfolioAsset || instrument.stock);

  const marketCategory = portfolioAsset
    ? resolveMarketCategory({
        category: portfolioAsset.category,
        symbol: activeSymbol,
        exchange: activeExchange,
      })
    : (instrument.marketCategory ??
      resolveMarketCategory({
        symbol: activeSymbol,
        exchange: activeExchange,
      }));

  // Dane finansowe dołączone do instrumentu pasują tylko do tego samego symbolu
  const attachedFinancialData =
    portfolioAsset && portfolioAsset.symbol !== instrument.stock
      ? undefined
      : (propFinancialData ?? instrument.financialData);

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
   * Tworzy obiekt instrumentu do modułu handlu, łącząc dane z portfela, finansowe i wyszukiwalne.
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
      price:
        portfolioAsset?.currentPrice ??
        financialData?.price ??
        searchable?.price ??
        0,
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
    portfolioAsset,
  ]);

  const ownedQuantity = portfolioAsset?.ownedQuantity ?? 0;

  // Historia transakcji: połączone transkacje kupna i sprzedaży.
  // Sortowanie od najnowszych do najstarszych.
  // W karcie pokazujemy maksymalnie 5 ostatnich operacji.
  const transactions = useMemo<TransactionHistoryItem[]>(() => {
    if (!portfolioAsset) return [];
    return [
      ...portfolioAsset.purchaseHistory,
      ...portfolioAsset.salesHistory,
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [portfolioAsset]);
  const recentTransactions = useMemo(
    () => transactions.slice(0, MAX_VISIBLE_TRANSACTIONS),
    [transactions],
  );
  const hasMoreTransactions = transactions.length > MAX_VISIBLE_TRANSACTIONS;

  const isFavorite = isWatched(activeSymbol);

  const toggleFavorite = () => {
    toggleWatchlist({
      symbol: activeSymbol,
      name: activeName,
      exchange: activeExchange,
      currency: activeCurrency,
    });
  };

  // Wartość przeliczona na walutę wyświetlania (dla wiele walut on).
  const formatNumber = (num: number, maxDecimals = 2) =>
    Math.abs(num).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });

  const formatMoney = (value: number, currency?: string) =>
    `${formatNumber(display.convertForDisplay(value, currency))} ${display.displaySymbol(currency)}`;

  // Pojedynczy wiersz historii transakcji
  const renderTransactionRow = (tx: TransactionHistoryItem) => {
    const isBuy = tx.type === "BUY";
    const txColor = isBuy ? theme.colors.positive : theme.colors.negative;

    return (
      <View
        key={tx.id}
        style={[styles.txLine, { borderBottomColor: theme.colors.border }]}
      >
        <View style={styles.txLineLeft}>
          <View style={styles.txDotLabel}>
            <View
              style={[styles.txIndicatorDot, { backgroundColor: txColor }]}
            />
            <Text style={[styles.txName, { color: theme.colors.text }]}>
              {isBuy ? "Kupno" : "Sprzedaż"}
            </Text>
          </View>
          <Text style={[styles.txDate, { color: theme.colors.textMuted }]}>
            {tx.date}
          </Text>
        </View>
        <View style={styles.txLineRight}>
          <Text style={[styles.txQtyPrice, { color: theme.colors.text }]}>
            {isBuy ? "+" : "-"}
            {tx.quantity} szt. @{" "}
            {formatMoney(tx.price, portfolioAsset?.currency)}
          </Text>
          <Text style={[styles.txTotal, { color: theme.colors.textMuted }]}>
            {formatMoney(tx.total, portfolioAsset?.currency)}
          </Text>
        </View>
      </View>
    );
  };

  const isProfit = (portfolioAsset?.profitCurrency ?? 0) >= 0;
  const arrowColor = isProfit ? theme.colors.positive : theme.colors.negative;
  const arrowName = isProfit ? "arrow-up" : "arrow-down";
  const sign = isProfit ? "+" : "-";

  const formattedProfitVal = portfolioAsset
    ? `${sign}${formatMoney(portfolioAsset.profitCurrency, portfolioAsset.currency)}`
    : "-";
  const formattedProfitPct = portfolioAsset
    ? `${sign}${Math.abs(portfolioAsset.profitPercent).toFixed(2)}%`
    : "-";

  const purchaseYear = portfolioAsset
    ? new Date(portfolioAsset.firstPurchasedDate).getFullYear()
    : new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsHolding = currentYear - purchaseYear;

  // Zysk w okresach jest pokazywany zawsze
  // Dla instrumentów posiadanych w portfelu pokazujemy zysk w okresach 1M, 3M, 1R, 3L, 5L.
  const periodReturns: {
    label: string;
    value?: number;
    available: boolean;
  }[] = portfolioAsset
    ? [
        {
          label: "1M",
          value: portfolioAsset.returns.oneMonth,
          available: true,
        },
        {
          label: "3M",
          value: portfolioAsset.returns.threeMonths,
          available: true,
        },
        {
          label: "1R",
          value: portfolioAsset.returns.oneYear,
          available: yearsHolding >= 1,
        },
        {
          label: "3L",
          value: portfolioAsset.returns.threeYears,
          available:
            yearsHolding >= 3 &&
            portfolioAsset.returns.threeYears !== undefined,
        },
        {
          label: "5L",
          value: portfolioAsset.returns.fiveYears,
          available:
            yearsHolding >= 5 && portfolioAsset.returns.fiveYears !== undefined,
        },
      ]
    : [
        { label: "1M", available: false },
        { label: "3M", available: false },
        { label: "1R", available: false },
        { label: "3L", available: false },
        { label: "5L", available: false },
      ];

  /**
   * Tworzy obiekt z informacjami o instrumencie do wyświetlenia w karcie.
   */
  const instrumentInfo = portfolioAsset
    ? {
        name: portfolioAsset.name,
        symbol: portfolioAsset.symbol,
        exchange: portfolioAsset.exchange,
        categoryLabel: portfolioAsset.category.toUpperCase(),
        description: portfolioAsset.description,
        riskLevel: portfolioAsset.riskLevel,
        assetClassInfo: portfolioAsset.assetClassInfo,
      }
    : {
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
                  {categoryItems.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pickerRow}
                    >
                      {categoryItems.map((item, index) => {
                        const selected = index === selectedAssetIndex;
                        const itemPositive = item.profitCurrency >= 0;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => setSelectedAssetIndex(index)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            style={[
                              styles.pickerChip,
                              {
                                borderColor: selected
                                  ? theme.colors.accent
                                  : theme.colors.border,
                                backgroundColor: selected
                                  ? theme.colors.accent + "1f"
                                  : theme.colors.surfaceMutedGlass,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerSymbol,
                                {
                                  color: selected
                                    ? theme.colors.accent
                                    : theme.colors.text,
                                },
                              ]}
                            >
                              {item.symbol}
                            </Text>
                            <Text
                              style={[
                                styles.pickerChange,
                                {
                                  color: itemPositive ? "#10b981" : "#ef4444",
                                },
                              ]}
                            >
                              {itemPositive ? "+" : "-"}
                              {Math.abs(item.profitPercent).toFixed(2)}%
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}

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
                        ownedQuantity={ownedQuantity}
                        onMarketClosedAlert={handleMarketClosedAlert}
                      />
                      {/* Historia transakcji */}
                      {transactions.length > 0 && (
                        <View style={styles.sectionBlock}>
                          <Text
                            style={[
                              styles.sectionHeading,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            TRANSAKCJE
                          </Text>
                          {recentTransactions.map(renderTransactionRow)}
                          {hasMoreTransactions && (
                            <Pressable
                              onPress={() => setHistoryVisible(true)}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel="Pokaż pełną historię transakcji"
                              style={({ pressed }) => [
                                styles.txShowAll,
                                { opacity: pressed ? 0.6 : 1 },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.txShowAllText,
                                  { color: theme.colors.accent },
                                ]}
                              >
                                Pokaż wszystkie ({transactions.length})
                              </Text>
                              <Ionicons
                                name="chevron-forward"
                                size={14}
                                color={theme.colors.accent}
                              />
                            </Pressable>
                          )}
                        </View>
                      )}
                      {/* Wynik finansowy */}
                      {portfolioAsset && ownedQuantity > 0 && (
                        <View style={styles.sectionBlock}>
                          <Text
                            style={[
                              styles.sectionHeading,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            WYNIK FINANSOWY
                          </Text>
                          <View style={styles.profitInline}>
                            <Ionicons
                              name={arrowName}
                              size={16}
                              color={arrowColor}
                            />
                            <Text
                              style={[
                                styles.profitValue,
                                { color: arrowColor },
                              ]}
                            >
                              {formattedProfitVal}
                            </Text>
                            <Text
                              style={[
                                styles.profitPct,
                                { color: theme.colors.textMuted },
                              ]}
                            >
                              ({formattedProfitPct})
                            </Text>
                          </View>
                        </View>
                      )}

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
                      <View style={styles.sectionBlock}>
                        <Text
                          style={[
                            styles.sectionHeading,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          ZYSK W OKRESACH
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.periodBlocksRow}
                        >
                          {periodReturns.map((period) => {
                            const val = period.value ?? 0;
                            const isPeriodPositive = val >= 0;
                            const periodColor = isPeriodPositive
                              ? theme.colors.positive
                              : theme.colors.negative;

                            return (
                              <View
                                key={period.label}
                                style={styles.periodBlock}
                              >
                                <Text
                                  style={[
                                    styles.periodBlockLabel,
                                    { color: theme.colors.textMuted },
                                  ]}
                                >
                                  {period.label}
                                </Text>
                                {period.available &&
                                period.value !== undefined ? (
                                  <Text
                                    numberOfLines={1}
                                    allowFontScaling={false}
                                    style={[
                                      styles.periodBlockValue,
                                      { color: periodColor },
                                    ]}
                                  >
                                    {isPeriodPositive ? "+" : ""}
                                    {period.value.toFixed(2)}%
                                  </Text>
                                ) : (
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.periodBlockValue,
                                      { color: theme.colors.textMuted },
                                    ]}
                                  >
                                    -
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
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

      {/* Pełna historia transakcji w oknie modalnym */}
      <Modal
        visible={historyVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.historyModalRoot}>
          <Pressable
            style={styles.historyBackdrop}
            onPress={() => setHistoryVisible(false)}
            accessibilityLabel="Zamknij historię transakcji"
          />
          <View
            style={[
              styles.historySheet,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.borderGlass,
              },
            ]}
          >
            <View
              style={[
                styles.historyHeader,
                { borderBottomColor: theme.colors.borderGlass },
              ]}
            >
              <View>
                <Text
                  style={[styles.historyTitle, { color: theme.colors.text }]}
                >
                  Historia transakcji
                </Text>
                <Text
                  style={[
                    styles.historySubtitle,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {activeSymbol} · {transactions.length} operacji
                </Text>
              </View>
              <Pressable
                onPress={() => setHistoryVisible(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Zamknij"
              >
                <Ionicons name="close" size={22} color={theme.colors.accent} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.historyScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.historyList}
            >
              {transactions.map(renderTransactionRow)}
            </ScrollView>
          </View>
        </View>
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
  pickerRow: {
    gap: 8,
    paddingVertical: 4,
  },
  pickerChip: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 82,
  },
  pickerSymbol: {
    fontSize: 13,
    fontWeight: "800",
  },
  pickerChange: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  chartContainer: {
    paddingTop: 10,
  },
  profitInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profitValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  profitPct: {
    fontSize: 12,
  },
  sectionBlock: {
    marginTop: 34,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  periodBlocksRow: {
    gap: 10,
    paddingRight: 8,
  },
  periodBlock: {
    minWidth: 64,
    gap: 6,
  },
  periodBlockLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  periodBlockValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  txLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    gap: 10,
  },
  txLineLeft: {
    flex: 1,
    gap: 3,
  },
  txDotLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  txIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  txName: {
    fontSize: 13,
    fontWeight: "600",
  },
  txDate: {
    fontSize: 11,
  },
  txLineRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  txQtyPrice: {
    fontSize: 12,
    fontWeight: "600",
  },
  txTotal: {
    fontSize: 11,
  },
  txShowAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 12,
    alignSelf: "flex-start",
  },
  txShowAllText: {
    fontSize: 12,
    fontWeight: "700",
  },
  historyModalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  historyBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  historySheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "80%",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  historySubtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  historyList: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  historyScroll: {
    flexShrink: 1,
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
