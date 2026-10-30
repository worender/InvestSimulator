import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
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
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MockPortfolio,
  PortfolioAssetItem,
  PortfolioCategory,
  TransactionHistoryItem,
} from '../database/mockPortfolioData';
import { SearchableInstrument } from '../database/mockSearchableInstruments';
import { useLockScreenWhileActive } from '../interactionLock';
import { notify } from '../notificationBus';
import { useTheme } from '../theme';
import { MarketClosedNoticeModal } from './MarketClosedNoticeModal';
import { StockCandleChart } from './StockCandleChart';
import { TradeInstrumentView } from './TradeInstrumentView';

export type ModalTab = 'details' | 'trade';

// Skala ryzyka inwestycyjnego: od najniższego do najwyższego.
const RISK_LEVELS = ['Niski', 'Umiarkowany', 'Wysoki', 'Bardzo wysoki'] as const;
const RISK_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'] as const;

interface InstrumentDetailModalProps {
  visible: boolean;
  asset: PortfolioAssetItem | null;
  category?: PortfolioCategory | null;
  portfolio: MockPortfolio;
  onClose: () => void;
  initialTab?: ModalTab;
  onMarketClosedAlert?: (
    instrument: SearchableInstrument,
    orderType: 'BUY' | 'SELL',
    quantity: number,
    total: number,
  ) => void;
  modalInstrument?: {
    stock: string;
    title: string;
    currency: string;
    symbol: string;
    exchange: string;
    financialData?: any;
  } | null;
}

export function InstrumentDetailModal({
  visible,
  asset,
  category,
  portfolio,
  onClose,
  initialTab = 'details',
  onMarketClosedAlert,
  modalInstrument,
}: InstrumentDetailModalProps) {
  const { colors, mode } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isDark = mode === 'dark';

  // Blokuje gesty ekranu pod spodem
  useLockScreenWhileActive(visible);

  const [userSelectedTab, setUserSelectedTab] = useState<ModalTab | null>(null);
  const activeTab = userSelectedTab ?? initialTab;

  const activeTabIndex = activeTab === 'trade' ? 1 : 0;
  const pagerX = useSharedValue(-activeTabIndex * windowWidth);
  const wasVisibleRef = useRef(visible);

  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerButtonHeight, setPickerButtonHeight] = useState(0);

  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeData, setNoticeData] = useState<{
    instrument: SearchableInstrument;
    orderType: 'BUY' | 'SELL';
    quantity: number;
    totalCost: number;
  } | null>(null);

  const translateY = useSharedValue(windowHeight);
  const dragStart = useSharedValue(0);

  const finishClose = useCallback(() => {
    setUserSelectedTab(null);
    setSelectedAssetIndex(0);
    setPickerOpen(false);
    setNoticeVisible(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const target = -activeTabIndex * windowWidth;
    if (!visible || !wasVisibleRef.current) {
      pagerX.value = target;
    } else {
      pagerX.value = withTiming(target, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
    }
    wasVisibleRef.current = visible;
  }, [activeTabIndex, visible, windowWidth, pagerX]);

  const closeThreshold = Math.max(windowHeight * 0.12, 96);

  const animateClose = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(
      windowHeight,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [finishClose, translateY, windowHeight]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    }
  }, [visible, translateY]);

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
                'worklet';
                if (finished) {
                  runOnJS(finishClose)();
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
    [closeThreshold, finishClose, translateY, dragStart, windowHeight],
  );

  const dragGesture = useMemo(() => createDragGesture(), [createDragGesture]);
  const headerDragGesture = useMemo(() => createDragGesture(), [createDragGesture]);

  // Poziomy gest przełączania zakładek modala (jak swipe między zakładkami ekranu głównego)
  const tabSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-32, 32])
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          if (event.translationX < -60) {
            runOnJS(setUserSelectedTab)('trade');
          } else if (event.translationX > 60) {
            runOnJS(setUserSelectedTab)('details');
          }
        }),
    [],
  );

  const pagerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pagerX.value }],
  }));

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
      [colors.border, colors.accent],
    ),
  }));

  const handleMarketClosedAlert = (
    inst: SearchableInstrument,
    orderType: 'BUY' | 'SELL',
    qty: number,
    total: number,
  ) => {
    if (onMarketClosedAlert) {
      onMarketClosedAlert(inst, orderType, qty, total);
    }
    setNoticeData({
      instrument: inst,
      orderType,
      quantity: qty,
      totalCost: total,
    });
    setNoticeVisible(true);
  };

  const handleConfirmPendingOrder = () => {
    if (noticeData) {
      const typeLabel = noticeData.orderType === 'BUY' ? 'kupna' : 'sprzedaży';
      notify({
        variant: 'success',
        title: 'Zlecenie oczekujące złożone',
        message: `Złożono zlecenie ${typeLabel} na ${noticeData.quantity} szt. ${noticeData.instrument.symbol}. Zostanie zrealizowane po wznowieniu handlu.`,
      });
    }
    setNoticeVisible(false);
  };

  const formatNumber = (num: number, maxDecimals = 2) =>
    Math.abs(num).toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });

  // Wszystkie instrumenty w kategorii
  const categoryItems = useMemo(
    () => (category?.items ?? []).map((item, idx) => ({ ...item, index: idx })),
    [category],
  );

  // Aktualny instrument z kategorii lub bezpośrednio przekazany do modala.
  // Gdy kategoria jest wybrana, liczy się pozycja z listy
  const currentAsset = category
    ? categoryItems[selectedAssetIndex] ?? categoryItems[0] ?? asset
    : asset;

  const isProfit = (currentAsset?.profitCurrency ?? 0) >= 0;
  const arrowColor = isProfit ? '#10b981' : '#ef4444';
  const arrowName = isProfit ? 'arrow-up' : 'arrow-down';
  const sign = isProfit ? '+' : '-';

  const formattedProfitVal = currentAsset
    ? `${sign}${formatNumber(currentAsset.profitCurrency)} ${currentAsset.currency}`
    : '-';
  const formattedProfitPct = currentAsset
    ? `${sign}${Math.abs(currentAsset.profitPercent).toFixed(2)}%`
    : '-';

  const purchaseYear = currentAsset
    ? new Date(currentAsset.firstPurchasedDate).getFullYear()
    : new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsHolding = currentYear - purchaseYear;

  const periodReturns: {
    label: string;
    value?: number;
    available: boolean;
  }[] = currentAsset
    ? [
        {
          label: '1M',
          value: currentAsset.returns.oneMonth,
          available: true,
        },
        {
          label: '3M',
          value: currentAsset.returns.threeMonths,
          available: true,
        },
        {
          label: '1R',
          value: currentAsset.returns.oneYear,
          available: yearsHolding >= 1,
        },
        {
          label: '3L',
          value: currentAsset.returns.threeYears,
          available: yearsHolding >= 3 && currentAsset.returns.threeYears !== undefined,
        },
        {
          label: '5L',
          value: currentAsset.returns.fiveYears,
          available: yearsHolding >= 5 && currentAsset.returns.fiveYears !== undefined,
        },
      ]
    : [];

  // Obsługa modalInstrument (dodawanie instrumentu bezpośrednio przez zieloną kartę)
  const displayAsset = modalInstrument ? {
    symbol: modalInstrument.symbol,
    name: modalInstrument.title,
    exchange: modalInstrument.exchange,
    riskLevel: 'Niski', // Domyślnie niskie ryzyko dla nowych instrumentów
    profitCurrency: 0,
    totalValue: 0,
    cashBalance: 0,
    currencySymbol: modalInstrument.currency,
    currency: modalInstrument.currency,
    returns: {
      oneMonth: undefined,
      threeMonths: undefined,
      sixMonths: undefined,
      oneYear: undefined,
      threeYears: undefined,
      fiveYears: undefined,
    },
  } : currentAsset;

  const currentAssetForDisplay = displayAsset ?? currentAsset;

  const modalTitle = currentAssetForDisplay
    ? currentAssetForDisplay.symbol
    : category
      ? category.title
      : 'Szczegóły';
  const modalSubtitle = currentAssetForDisplay
    ? currentAssetForDisplay.name
    : category
      ? category.title
      : portfolio.name;

  // Pozycja instrumentu na skali ryzyka
  const riskIndex = currentAssetForDisplay
    ? Math.max(0, RISK_LEVELS.indexOf(currentAssetForDisplay.riskLevel as (typeof RISK_LEVELS)[number]))
    : 0;
  const riskColor = RISK_COLORS[riskIndex] ?? RISK_COLORS[0];
  const riskPercent = (riskIndex / (RISK_LEVELS.length - 1)) * 100;

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={animateClose}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Reanimated.View style={[styles.backdrop, backdropAnimatedStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
          </Reanimated.View>

          <Reanimated.View style={[styles.sheet, { backgroundColor: colors.background }, sheetAnimatedStyle]}>
            <GestureDetector gesture={dragGesture}>
              <View style={styles.dragArea}>
                <Reanimated.View style={[styles.dragHandle, handleAnimatedStyle]} />
              </View>
            </GestureDetector>

            {/* Nagłówek z możliwością przeciągania */}
            <GestureDetector gesture={headerDragGesture}>
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                  <View style={styles.symbolRow}>
                    <Text style={[styles.headerSymbol, { color: colors.text }]}>{modalTitle}</Text>
                    {currentAsset && (
                      <Text
                        style={[
                          styles.headerExchange,
                          { color: colors.textMuted, borderColor: colors.border },
                        ]}
                      >
                        {currentAsset.exchange}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.headerName, { color: colors.textMuted }]} numberOfLines={1}>
                    {modalSubtitle}
                  </Text>
                </View>

                <Pressable
                  onPress={animateClose}
                  hitSlop={10}
                  accessibilityLabel="Zamknij"
                  style={({ pressed }) => [
                    styles.closeBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>
            </GestureDetector>

            <View style={[styles.tabsBar, { borderBottomColor: colors.border }]}>
              <Pressable
                onPress={() => setUserSelectedTab('details')}
                style={[
                  styles.tabBtn,
                  activeTab === 'details' && [styles.activeTabBtn, { borderBottomColor: colors.accent }],
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'details' ? colors.accent : colors.textMuted },
                    activeTab === 'details' && styles.activeTabText,
                  ]}
                >
                  Szczegóły
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setUserSelectedTab('trade')}
                style={[
                  styles.tabBtn,
                  activeTab === 'trade' && [styles.activeTabBtn, { borderBottomColor: colors.accent }],
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'trade' ? colors.accent : colors.textMuted },
                    activeTab === 'trade' && styles.activeTabText,
                  ]}
                >
                  Kup / Sprzedaj
                </Text>
              </Pressable>
            </View>

            {/* Zawartość zakładek */}
            <GestureDetector gesture={tabSwipeGesture}>
              <View style={styles.tabContent}>
                <Reanimated.View
                  style={[styles.pager, { width: windowWidth * 2 }, pagerAnimatedStyle]}
                >
                  <View
                    style={styles.pagerPage}
                    pointerEvents={activeTab === 'details' ? 'auto' : 'none'}
                    accessibilityElementsHidden={activeTab !== 'details'}
                    importantForAccessibility={
                      activeTab === 'details' ? 'auto' : 'no-hide-descendants'
                    }
                  >
                    <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottom }]}
                    showsVerticalScrollIndicator={false}
                  >
                    {categoryItems.length > 1 && (
                      <View style={styles.instrumentPicker}>
                        <Pressable
                          onPress={() => setPickerOpen((open) => !open)}
                          onLayout={(event) => setPickerButtonHeight(event.nativeEvent.layout.height)}
                          accessibilityRole="button"
                          accessibilityLabel="Zmień instrument"
                          accessibilityState={{ expanded: pickerOpen }}
                          style={styles.instrumentPickerButton}
                        >
                          <View style={styles.instrumentPickerCopy}>
                            <Text
                              style={[styles.instrumentPickerEyebrow, { color: colors.textMuted }]}
                            >
                              INSTRUMENT
                            </Text>
                            <Text
                              style={[styles.instrumentPickerValue, { color: colors.text }]}
                              numberOfLines={1}
                            >
                              {currentAsset
                                ? `${currentAsset.symbol} · ${currentAsset.name}`
                                : 'Wybierz instrument'}
                            </Text>
                          </View>

                          <Text style={[styles.instrumentPickerCount, { color: colors.textMuted }]}>
                            {selectedAssetIndex + 1}/{categoryItems.length}
                          </Text>
                          <Ionicons
                            name={pickerOpen ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </Pressable>

                        {pickerOpen && (
                          <View
                            style={[
                              styles.instrumentList,
                              {
                                top: pickerButtonHeight + 6,
                                backgroundColor: colors.background,
                              },
                            ]}
                          >
                            {categoryItems.map((item, idx) => {
                              const isSelected = idx === selectedAssetIndex;
                              const itemPositive = item.profitCurrency >= 0;
                              return (
                                <Pressable
                                  key={item.id}
                                  onPress={() => {
                                    setSelectedAssetIndex(idx);
                                    setPickerOpen(false);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected: isSelected }}
                                  style={({ pressed }) => [
                                    styles.instrumentListRow,
                                    idx < categoryItems.length - 1 && {
                                      borderBottomWidth: StyleSheet.hairlineWidth,
                                      borderBottomColor: colors.border,
                                    },
                                    {
                                      backgroundColor: isSelected
                                        ? isDark
                                          ? 'rgba(88, 166, 255, 0.12)'
                                          : 'rgba(9, 105, 218, 0.08)'
                                        : pressed
                                          ? isDark
                                            ? 'rgba(255,255,255,0.04)'
                                            : 'rgba(0,0,0,0.03)'
                                          : 'transparent',
                                    },
                                  ]}
                                >
                                  <View style={styles.instrumentListCopy}>
                                    <Text
                                      style={[styles.instrumentListSymbol, { color: colors.text }]}
                                    >
                                      {item.symbol}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.instrumentListName,
                                        { color: colors.textMuted },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {item.name}
                                    </Text>
                                  </View>

                                  <View style={styles.instrumentListRight}>
                                    <Text style={[styles.instrumentListValue, { color: colors.text }]}>
                                      {formatNumber(item.totalValue)} {item.currency}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.instrumentListChange,
                                        { color: itemPositive ? '#10b981' : '#ef4444' },
                                      ]}
                                    >
                                      {itemPositive ? '+' : '-'}
                                      {Math.abs(item.profitPercent).toFixed(2)}%
                                    </Text>
                                  </View>

                                  <Ionicons
                                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={18}
                                    color={isSelected ? colors.accent : colors.textMuted}
                                    style={styles.instrumentListCheck}
                                  />
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Wykres wybranego instrumentu z kategorii */}
                    {currentAssetForDisplay && (
                      <View style={styles.chartSection}>
                        <StockCandleChart
                          key={`${currentAssetForDisplay.symbol}-${currentAssetForDisplay.exchange}`}
                          stock={currentAssetForDisplay.symbol}
                          title={currentAssetForDisplay.name}
                          currency={currentAssetForDisplay.currency}
                          exchange={currentAssetForDisplay.exchange}
                          variant="embedded"
                        />
                      </View>
                    )}

                    {currentAsset ? (
                      <>
                        {/* Dane liczbowe */}
                        <View style={styles.metricsContainer}>
                          <View style={styles.metricRow}>
                            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                              Wartość pozycji
                            </Text>
                            <Text style={[styles.metricValueLarge, { color: colors.text }]}>
                              {formatNumber(currentAsset.totalValue)} {currentAsset.currency}
                            </Text>
                          </View>

                          <View style={styles.metricRow}>
                            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                              Wynik finansowy
                            </Text>
                            <View style={styles.profitInline}>
                              <Ionicons name={arrowName} size={15} color={arrowColor} />
                              <Text style={[styles.metricValue, { color: colors.text }]}>
                                {formattedProfitVal}
                              </Text>
                              <Text style={[styles.profitPct, { color: colors.textMuted }]}>
                                ({formattedProfitPct})
                              </Text>
                            </View>
                          </View>

                          <View style={[styles.hairline, { backgroundColor: colors.border }]} />

                          <View style={styles.gridRow}>
                            <View style={styles.gridCol}>
                              <Text style={[styles.metricMiniLabel, { color: colors.textMuted }]}>
                                Ilość
                              </Text>
                              <Text style={[styles.gridColVal, { color: colors.text }]}>
                                {currentAsset.ownedQuantity} szt.
                              </Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={[styles.metricMiniLabel, { color: colors.textMuted }]}>
                                Śr. cena kupna
                              </Text>
                              <Text style={[styles.gridColVal, { color: colors.text }]}>
                                {formatNumber(currentAsset.averageBuyPrice)} {currentAsset.currency}
                              </Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={[styles.metricMiniLabel, { color: colors.textMuted }]}>
                                Kurs bieżący
                              </Text>
                              <Text style={[styles.gridColVal, { color: colors.text }]}>
                                {formatNumber(currentAsset.currentPrice)} {currentAsset.currency}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Zyski w okresach */}
                        <View style={styles.periodBlocksSection}>
                          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                            ZYSK W OKRESACH
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.periodBlocksRow}
                          >
                            {periodReturns.map((period, idx) => {
                              const val = period.value ?? 0;
                              const isPeriodPositive = val >= 0;
                              const periodArrow = isPeriodPositive ? 'arrow-up' : 'arrow-down';
                              const periodColor = isPeriodPositive ? '#10b981' : '#ef4444';

                              return (
                                <View
                                  key={idx}
                                  style={[
                                    styles.periodBlock,
                                    {
                                      backgroundColor: isDark
                                        ? 'rgba(255, 255, 255, 0.08)'
                                        : 'rgba(0, 0, 0, 0.04)',
                                      borderColor: colors.border,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.periodBlockLabel, { color: colors.textMuted }]}>
                                    {period.label}
                                  </Text>
                                  {period.available && period.value !== undefined ? (
                                    <View style={styles.periodBlockValRow}>
                                      <Ionicons name={periodArrow} size={13} color={periodColor} />
                                      <Text style={[styles.periodBlockValue, { color: colors.text }]}>
                                        {isPeriodPositive ? '+' : ''}
                                        {period.value.toFixed(2)}%
                                      </Text>
                                    </View>
                                  ) : (
                                    <Text style={[styles.periodBlockUnavailable, { color: colors.textMuted }]}>
                                      -
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                      </ScrollView>
                        </View>

                        {/* Historia transakcji */}
                        <View style={styles.txSection}>
                          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                            TRANSAKCJE
                          </Text>
                          {currentAsset.purchaseHistory.map((tx: TransactionHistoryItem) => (
                            <View
                              key={tx.id}
                              style={[styles.txLine, { borderBottomColor: colors.border }]}
                            >
                              <View style={styles.txLineLeft}>
                                <View style={styles.txDotLabel}>
                                  <View style={[styles.txIndicatorDot, { backgroundColor: '#10b981' }]} />
                                  <Text style={[styles.txName, { color: colors.text }]}>Kupno</Text>
                                </View>
                                <Text style={[styles.txDate, { color: colors.textMuted }]}>{tx.date}</Text>
                              </View>
                              <View style={styles.txLineRight}>
                                <Text style={[styles.txQtyPrice, { color: colors.text }]}>
                                  +{tx.quantity} szt. @ {formatNumber(tx.price)} {currentAsset.currency}
                                </Text>
                                <Text style={[styles.txTotal, { color: colors.textMuted }]}>
                                  {formatNumber(tx.total)} {currentAsset.currency}
                                </Text>
                              </View>
                            </View>
                          ))}

                          {currentAsset.salesHistory.map((tx: TransactionHistoryItem) => (
                            <View
                              key={tx.id}
                              style={[styles.txLine, { borderBottomColor: colors.border }]}
                            >
                              <View style={styles.txLineLeft}>
                                <View style={styles.txDotLabel}>
                                  <View style={[styles.txIndicatorDot, { backgroundColor: '#ef4444' }]} />
                                  <Text style={[styles.txName, { color: colors.text }]}>Sprzedaż</Text>
                                </View>
                                <Text style={[styles.txDate, { color: colors.textMuted }]}>{tx.date}</Text>
                              </View>
                              <View style={styles.txLineRight}>
                                <Text style={[styles.txQtyPrice, { color: colors.text }]}>
                                  -{tx.quantity} szt. @ {formatNumber(tx.price)} {currentAsset.currency}
                                </Text>
                                <Text style={[styles.txTotal, { color: colors.textMuted }]}>
                                  {formatNumber(tx.total)} {currentAsset.currency}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>

                        {/* Informacje o aktywie */}
                        <View style={styles.assetInfoSection}>
                          <Text style={[styles.assetInfoTitle, { color: colors.text }]}>
                            {currentAsset.name}
                          </Text>
                          <Text style={[styles.assetInfoMeta, { color: colors.textMuted }]}>
                            {currentAsset.symbol} · {currentAsset.exchange} ·{' '}
                            {currentAsset.category.toUpperCase()}
                          </Text>

                          <Text style={[styles.assetInfoDescription, { color: colors.textMuted }]}>
                            {currentAsset.description}
                          </Text>

                          {/* Wskaźnik ryzyka: termometr z trójkątem na skali */}
                          <View
                            style={[
                              styles.riskCard,
                              {
                                borderColor: colors.border,
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.04)'
                                  : 'rgba(0,0,0,0.03)',
                              },
                            ]}
                          >
                            <View style={styles.riskHeader}>
                              <Text style={[styles.riskLabel, { color: colors.textMuted }]}>
                                POZIOM RYZYKA
                              </Text>
                              <Text style={[styles.riskValue, { color: riskColor }]}>
                                {currentAsset.riskLevel}
                              </Text>
                            </View>

                            <View style={styles.riskMeter}>
                              <View style={[styles.riskMarker, { left: `${riskPercent}%` }]}>
                                <Ionicons name="caret-down" size={16} color={riskColor} />
                              </View>
                              <View style={styles.riskBar}>
                                {RISK_COLORS.map((color) => (
                                  <View
                                    key={color}
                                    style={[styles.riskSegment, { backgroundColor: color }]}
                                  />
                                ))}
                              </View>
                            </View>

                            <View style={styles.riskScale}>
                              {RISK_LEVELS.map((level, idx) => (
                                <Text
                                  key={level}
                                  style={[
                                    styles.riskScaleLabel,
                                    {
                                      color: idx === riskIndex ? riskColor : colors.textMuted,
                                      fontWeight: idx === riskIndex ? '700' : '400',
                                    },
                                  ]}
                                >
                                  {level}
                                </Text>
                              ))}
                            </View>
                          </View>

                          <Text style={[styles.assetInfoFootnote, { color: colors.textMuted }]}>
                            {currentAsset.assetClassInfo}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.emptyState}>
                        <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                          Brak otwartych pozycji w tej kategorii.
                        </Text>
                      </View>
                    )}
                    </ScrollView>
                  </View>

                  <View
                    style={styles.pagerPage}
                    pointerEvents={activeTab === 'trade' ? 'auto' : 'none'}
                    accessibilityElementsHidden={activeTab !== 'trade'}
                    importantForAccessibility={
                      activeTab === 'trade' ? 'auto' : 'no-hide-descendants'
                    }
                  >
                    <TradeInstrumentView
                      portfolio={portfolio}
                      initialAsset={currentAsset}
                      onMarketClosedAlert={handleMarketClosedAlert}
                    />
                  </View>
                </Reanimated.View>
              </View>
            </GestureDetector>
          </Reanimated.View>
        </View>
      </Modal>

      {/* Powiadomienie modalne o zamkniętym rynku */}
      <MarketClosedNoticeModal
        visible={noticeVisible}
        instrument={noticeData?.instrument ?? null}
        orderType={noticeData?.orderType ?? 'BUY'}
        quantity={noticeData?.quantity ?? 0}
        totalCost={noticeData?.totalCost ?? 0}
        onConfirmPendingOrder={handleConfirmPendingOrder}
        onClose={() => setNoticeVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    height: '91%',
    maxHeight: '91%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  dragArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSymbol: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerExchange: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  headerName: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {},
  tabText: {
    fontSize: 14,
    fontWeight: '400',
  },
  activeTabText: {
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    overflow: 'hidden',
  },
  pager: {
    flex: 1,
    flexDirection: 'row',
  },
  pagerPage: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  instrumentPicker: {
    marginBottom: 18,
    position: 'relative',
    zIndex: 20,
    elevation: 20,
  },
  chartSection: {
    marginBottom: 20,
  },
  instrumentPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  instrumentPickerCopy: {
    flex: 1,
  },
  instrumentPickerEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  instrumentPickerValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  instrumentPickerCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  instrumentList: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 30,
  },
  instrumentListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  instrumentListCopy: {
    flex: 1,
  },
  instrumentListSymbol: {
    fontSize: 13,
    fontWeight: '700',
  },
  instrumentListName: {
    fontSize: 11,
    marginTop: 2,
  },
  instrumentListRight: {
    alignItems: 'flex-end',
  },
  instrumentListValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  instrumentListChange: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  instrumentListCheck: {
    marginLeft: 2,
  },
  metricsContainer: {
    marginBottom: 20,
    gap: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  profitInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profitPct: {
    fontSize: 12,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  gridCol: {
    flex: 1,
  },
  metricMiniLabel: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 2,
  },
  gridColVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodBlocksSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  periodBlocksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodBlock: {
    width: 78,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBlockLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  periodBlockValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  periodBlockValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  periodBlockUnavailable: {
    fontSize: 12,
  },
  txSection: {
    marginBottom: 26,
  },
  txLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txLineLeft: {
    gap: 2,
  },
  txDotLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  txName: {
    fontSize: 13,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 11,
  },
  txLineRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txQtyPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  txTotal: {
    fontSize: 11,
  },
  assetInfoSection: {
    marginTop: 8,
    paddingTop: 16,
    marginBottom: 20,
  },
  assetInfoTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  assetInfoMeta: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 6,
  },
  assetInfoDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  assetInfoFootnote: {
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 18,
    marginTop: 14,
  },
  riskCard: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  riskValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  riskMeter: {
    height: 30,
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  riskMarker: {
    position: 'absolute',
    bottom: 10,
    width: 16,
    alignItems: 'center',
    marginLeft: -8,
  },
  riskBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskSegment: {
    flex: 1,
  },
  riskScale: {
    flexDirection: 'row',
    marginTop: 6,
  },
  riskScaleLabel: {
    flex: 1,
    fontSize: 9,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
  },
});
