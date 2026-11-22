import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
import { CandlestickChart } from "react-native-wagmi-charts";
import { CandleData, getStockCandles } from "../api/marketService";
import { useDisplayCurrency } from "../displayCurrency";
import { useLockScreenWhileActive } from "../interactionLock";
import { NotificationHost } from "../notifications";
import { useTheme } from "../theme";
import {
  ChartCrosshair,
  renderCandleLine,
  renderCandleRect,
} from "./CandleHoverCrosshair";

/**
 * Pełnoekranowy wykres świecowy oraz wspólne definicje zakresów i interwałów wykresów.
 *
 * @module src/components/ChartFullscreenModal
 */
/** Interwał świecy (zgodny z Yahoo Finance). */
export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "1d" | "1wk";

/** Zakres czasu wykresu: etykieta przycisku i liczba dni wstecz. */
export type ChartRange = {
  /** Etykieta przycisku, np. `"7D"`. */
  label: string;
  /** Liczba dni wstecz. */
  days: number;
};

/** Zakresy wykresu: 1 dzień, 7 dni, 1 miesiąc, 3 miesiące, 1 rok. Wspólne dla każdego wykresu świecowego w aplikacji. */
export const CHART_RANGES: ChartRange[] = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1R", days: 365 },
];

/** Interwały świec do wyboru (bez 1 min). */
export const CHART_INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "5 min", value: "5m" },
  { label: "15 min", value: "15m" },
  { label: "1 godz.", value: "1h" },
  { label: "1 dzień", value: "1d" },
  { label: "1 tydz.", value: "1wk" },
];

/** Domyślny zakres — indeks w {@link CHART_RANGES} (7 dni). */
export const DEFAULT_CHART_RANGE_INDEX = 1;
/** Domyślny interwał świecy (1 godzina). */
export const DEFAULT_CHART_INTERVAL: ChartInterval = "1h";

/**
 * Sprawdza, czy interwał jest śróddzienny (krótszy niż dzień).
 *
 * @param value Interwał.
 * @returns `true` dla `1m`, `5m`, `15m` i `1h`.
 */
export const isIntradayInterval = (value: ChartInterval) =>
  ["1m", "5m", "15m", "1h"].includes(value);

/**
 * Formatuje czas świecy na osi wykresu w zależności od interwału.
 *
 * @param timestamp Czas w ms od epoki.
 * @param interval Interwał świec.
 * @returns Dla interwałów śróddziennych dzień, miesiąc i godzina (np. `"15.08, 14:30"`),
 * dla pozostałych pełna data (np. `"15.08.2023"`).
 */
export function formatCandleTime(timestamp: number, interval: ChartInterval) {
  const options: Intl.DateTimeFormatOptions = isIntradayInterval(interval)
    ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" };
  return new Date(timestamp).toLocaleString("pl-PL", options);
}

/**
 * Formatuje datę świecy w panelu OHLC (z dniem tygodnia i skróconą nazwą miesiąca).
 *
 * @param timestamp Czas w ms od epoki.
 * @param interval Interwał świec (śróddzienny dodaje godzinę).
 * @returns Data z krótką nazwą dnia tygodnia i miesiąca (oraz godziną dla interwałów śróddziennych).
 */
function formatCandleDate(timestamp: number, interval: ChartInterval) {
  const options: Intl.DateTimeFormatOptions = isIntradayInterval(interval)
    ? {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    : { weekday: "short", day: "2-digit", month: "short", year: "numeric" };
  return new Date(timestamp).toLocaleString("pl-PL", options);
}

/** Szerokość (px) osi cen po prawej stronie wykresu. */
const AXIS_WIDTH = 54;
/** Poziome linie siatki jako ułamek wysokości (od góry). */
const GRID_STEPS = [1, 0.75, 0.5, 0.25, 0];
/** Pionowe linie siatki jako ułamek szerokości. */
const VERTICAL_LINES = [0.25, 0.5, 0.75];

/** Właściwości {@link ChartFullscreenModal}. */
export type ChartFullscreenModalProps = {
  /** Czy modal jest otwarty. */
  visible: boolean;
  /** Wywoływane przy zamknięciu. */
  onClose: () => void;
  /** Symbol instrumentu (domyślnie `"PKO"`). */
  stock?: string;
  /** Tytuł w nagłówku (domyślnie `"PKO BANK POLSKI"`). */
  title?: string;
  /** Giełda notowań (domyślnie `"GPW"`). */
  exchange?: string;
  /** Waluta lub jej symbol (domyślnie `"zł"`). */
  currency?: string;
  /** Zakres ustawiany przy każdym otwarciu — indeks w {@link CHART_RANGES}. */
  initialRangeIndex?: number;
  /** Interwał ustawiany przy każdym otwarciu. */
  initialInterval?: ChartInterval;
  /** Pozwala ukryć selektory, gdy rodzic już je pokazuje (np. w modalach). */
  showRangeControls?: boolean;
};

/**
 * Pełnoekranowy, wielokrotnego użytku widok wykresu świecowego
 *
 * Zawiera gęstą siatkę z osią cen, crosshair z tooltipem, przełączanie zakresów
 * i interwałów, panel OHLC (otwarcie / maksimum / minimum / zamknięcie)
 * oraz legendę pod wykresem.
 *
 * Przy każdym otwarciu przywraca `initialRangeIndex` i `initialInterval`.
 * Świece są pobierane (`getStockCandles`) przy otwarciu i każdej zmianie zakresu
 * lub interwału; błąd daje pusty wykres. Dla zakresów dłuższych niż 60 dni
 * interwały śróddzienne są wyłączone i pobierane są świece dzienne. Panel OHLC
 * pokazuje świecę pod kursorem, a bez kursora — ostatnią. Gdy modal jest
 * otwarty, gesty ekranu pod spodem są zablokowane.
 *
 * @param props Właściwości komponentu (patrz {@link ChartFullscreenModalProps}).
 */
export function ChartFullscreenModal({
  visible,
  onClose,
  stock = "PKO",
  title = "PKO BANK POLSKI",
  exchange = "GPW",
  currency = "zł",
  initialRangeIndex = DEFAULT_CHART_RANGE_INDEX,
  initialInterval = DEFAULT_CHART_INTERVAL,
  showRangeControls = true,
}: ChartFullscreenModalProps) {
  const { colors, mode } = useTheme();
  const display = useDisplayCurrency();
  const { bottom } = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isDark = mode === "dark";
  const unit = display.displaySymbol(currency);

  // Blokuje gesty ekranu pod modalem
  useLockScreenWhileActive(visible);

  const translateY = useSharedValue(height);
  const dragStart = useSharedValue(0);
  const closeThreshold = Math.max(height * 0.12, 96);

  const animateClose = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(
      height,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        "worklet";
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  }, [height, onClose, translateY]);

  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
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
            const remaining = Math.max(height - translateY.value, 0);
            const duration = Math.min(Math.max(remaining * 0.35, 120), 260);
            translateY.value = withTiming(
              height,
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
    [closeThreshold, dragStart, height, onClose, translateY],
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
      [0, Math.max(height * 0.5, 1)],
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

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [rangeIndex, setRangeIndex] = useState(initialRangeIndex);
  const [interval, setInterval] = useState<ChartInterval>(initialInterval);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setRangeIndex(initialRangeIndex);
      setInterval(initialInterval);
      setActiveIndex(-1);
    }
  }

  const safeRangeIndex = Math.min(
    Math.max(rangeIndex, 0),
    CHART_RANGES.length - 1,
  );
  const range = CHART_RANGES[safeRangeIndex];
  const intradayDisabled = range.days > 60;

  useEffect(() => {
    if (!visible) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const requestedInterval =
          intradayDisabled && isIntradayInterval(interval) ? "1d" : interval;
        const data = await getStockCandles(
          stock,
          requestedInterval,
          range.days,
          exchange,
        );
        if (!active) return;
        setCandles(data ?? []);
      } catch {
        if (!active) return;
        setCandles([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [visible, stock, exchange, range.days, interval, intradayDisabled]);

  const latest = candles[candles.length - 1];

  const activeCandle =
    activeIndex >= 0 && activeIndex < candles.length
      ? candles[activeIndex]
      : latest;
  const activeChange = activeCandle
    ? activeCandle.close - activeCandle.open
    : 0;

  const formatPrice = (value?: number) =>
    value === undefined
      ? "--"
      : display.convertForDisplay(value, currency).toLocaleString("pl-PL", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  // Zakres cen do narysowania siatki i etykiet osi Y
  const domain = useMemo(() => {
    if (candles.length === 0) return null;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const candle of candles) {
      if (candle.low < min) min = candle.low;
      if (candle.high > max) max = candle.high;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (max - min < 0.0001) {
      const pad = Math.max(Math.abs(max) * 0.01, 0.01);
      min -= pad;
      max += pad;
    }
    return { min, max };
  }, [candles]);

  const chartHeight = Math.min(Math.max(height * 0.32, 200), 320);
  const chartWidth = Math.max(width - 32 - AXIS_WIDTH, 160);

  const axis = useMemo(() => {
    if (candles.length < 3) return candles;
    return [
      candles[0],
      candles[Math.floor(candles.length / 2)],
      candles[candles.length - 1],
    ];
  }, [candles]);

  const gridPrices = useMemo(() => {
    if (!domain) return [];
    return GRID_STEPS.map((step) => ({
      key: step,
      price: domain.min + (domain.max - domain.min) * step,
      offset: (1 - step) * chartHeight,
    }));
  }, [domain, chartHeight]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      <NotificationHost />
      <View style={styles.modalRoot}>
        <Reanimated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
        </Reanimated.View>

        <Reanimated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.background },
            sheetAnimatedStyle,
          ]}
        >
          <GestureDetector gesture={dragGesture}>
            <View style={styles.dragArea}>
              <Reanimated.View
                style={[styles.dragHandle, handleAnimatedStyle]}
              />
            </View>
          </GestureDetector>

          {/* Nagłówek przeciągany razem z arkuszem */}
          <GestureDetector gesture={headerDragGesture}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerCopy}>
                <Text
                  style={[styles.headerTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <View style={styles.headerMeta}>
                  <Text style={[styles.headerSymbol, { color: colors.accent }]}>
                    {stock}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: colors.surfaceMutedGlass,
                        borderColor: colors.borderGlass,
                      },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={11}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[styles.badgeText, { color: colors.textMuted }]}
                    >
                      {exchange}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={animateClose}
                accessibilityRole="button"
                accessibilityLabel="Zamknij wykres"
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 28 + bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Podsumowanie ceny */}
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text }]}>
                {formatPrice(activeCandle?.close)} {unit}
              </Text>
              <Text
                style={[
                  styles.change,
                  {
                    color:
                      activeChange >= 0 ? colors.positive : colors.negative,
                  },
                ]}
              >
                {activeChange >= 0 ? "+" : ""}
                {formatPrice(activeChange)} {unit} (
                {activeChange >= 0 ? "+" : ""}
                {activeCandle?.open
                  ? ((activeChange / activeCandle.open) * 100).toFixed(2)
                  : "0.00"}
                %)
              </Text>
              {activeCandle && (
                <Text style={[styles.candleDate, { color: colors.textMuted }]}>
                  {activeIndex >= 0
                    ? formatCandleDate(activeCandle.timestamp, interval)
                    : `Ostatnia świeca · ${formatCandleDate(activeCandle.timestamp, interval)}`}
                </Text>
              )}
            </View>

            {showRangeControls && (
              <>
                <Text
                  style={[styles.controlLabel, { color: colors.textMuted }]}
                >
                  ZAKRES
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.controls}
                >
                  {CHART_RANGES.map((item, index) => (
                    <ChartButton
                      key={item.label}
                      label={item.label}
                      active={index === safeRangeIndex}
                      onPress={() => {
                        setRangeIndex(index);
                        if (item.days > 60 && isIntradayInterval(interval))
                          setInterval("1d");
                      }}
                      colors={colors}
                    />
                  ))}
                </ScrollView>

                <Text
                  style={[styles.controlLabel, { color: colors.textMuted }]}
                >
                  INTERWAŁ
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.controls}
                >
                  {CHART_INTERVALS.map((item) => (
                    <ChartButton
                      key={item.value}
                      label={item.label}
                      active={item.value === interval}
                      disabled={
                        intradayDisabled && isIntradayInterval(item.value)
                      }
                      onPress={() => setInterval(item.value)}
                      colors={colors}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Wykres + siatka + oś cen */}
            <View
              style={[styles.chartWrap, { height: chartHeight, marginTop: 14 }]}
            >
              {loading ? (
                <View style={styles.placeholder}>
                  <ActivityIndicator color={colors.accent} />
                  <Text
                    style={[
                      styles.placeholderText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Pobieranie danych...
                  </Text>
                </View>
              ) : candles.length === 0 ? (
                <View style={styles.placeholder}>
                  <Ionicons
                    name="calendar-outline"
                    size={36}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.placeholderText,
                      { color: colors.textMuted },
                    ]}
                  >
                    Brak notowań dla tego zakresu.
                  </Text>
                </View>
              ) : (
                <View style={styles.chartRow}>
                  <View style={{ width: chartWidth, height: chartHeight }}>
                    {/* Siatka pozioma */}
                    {gridPrices.map((line) => (
                      <View
                        key={`h-${line.key}`}
                        pointerEvents="none"
                        style={[
                          styles.gridLine,
                          {
                            top: Math.min(
                              Math.max(line.offset, 0),
                              chartHeight - 1,
                            ),
                            backgroundColor: colors.borderGlass,
                          },
                        ]}
                      />
                    ))}
                    {/* Siatka pionowa */}
                    {VERTICAL_LINES.map((ratio) => (
                      <View
                        key={`v-${ratio}`}
                        pointerEvents="none"
                        style={[
                          styles.gridLineVertical,
                          {
                            left: chartWidth * ratio,
                            height: chartHeight,
                            backgroundColor: colors.borderGlass,
                          },
                        ]}
                      />
                    ))}

                    <CandlestickChart.Provider
                      data={candles}
                      onCurrentIndexChange={setActiveIndex}
                    >
                      <CandlestickChart width={chartWidth} height={chartHeight}>
                        <CandlestickChart.Candles
                          useAnimations={false}
                          positiveColor={colors.positive}
                          negativeColor={colors.negative}
                          renderLine={renderCandleLine}
                          renderRect={renderCandleRect}
                        />
                        <ChartCrosshair
                          color={colors.textMuted}
                          minDurationMs={240}
                        >
                          <CandlestickChart.Tooltip
                            style={[
                              styles.tooltip,
                              {
                                backgroundColor: isDark
                                  ? "rgba(22, 27, 34, 0.96)"
                                  : "rgba(255, 255, 255, 0.96)",
                                borderColor: colors.border,
                              },
                            ]}
                            tooltipTextProps={{
                              precision: 2,
                              style: {
                                color: colors.text,
                                fontSize: 12,
                                fontWeight: "700",
                              },
                            }}
                          />
                        </ChartCrosshair>
                      </CandlestickChart>
                    </CandlestickChart.Provider>
                  </View>

                  {/* Oś cen po prawej stronie */}
                  <View style={[styles.axisColumn, { height: chartHeight }]}>
                    {gridPrices.map((line) => (
                      <Text
                        key={`label-${line.key}`}
                        style={[
                          styles.axisLabel,
                          {
                            top: Math.min(
                              Math.max(line.offset - 7, -4),
                              chartHeight - 12,
                            ),
                            color: colors.textMuted,
                          },
                        ]}
                      >
                        {formatPrice(line.price)}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Oś czasu */}
            {!loading && candles.length > 0 && (
              <View style={[styles.timeAxis, { width: chartWidth }]}>
                {axis.map((item, index) => (
                  <Text
                    key={`${item.timestamp}-${index}`}
                    style={[styles.timeAxisText, { color: colors.textMuted }]}
                  >
                    {formatCandleTime(item.timestamp, interval)}
                  </Text>
                ))}
              </View>
            )}

            {/* Panel OHLC */}
            {!loading && activeCandle && (
              <View
                style={[
                  styles.ohlcPanel,
                  {
                    backgroundColor: colors.surfaceMutedGlass,
                    borderColor: colors.borderGlass,
                  },
                ]}
              >
                <OhlcCell
                  label="O"
                  caption="otwarcie"
                  value={display.convertForDisplay(activeCandle.open, currency)}
                  unit={unit}
                  colors={colors}
                />
                <OhlcCell
                  label="H"
                  caption="maks."
                  value={display.convertForDisplay(activeCandle.high, currency)}
                  unit={unit}
                  colors={colors}
                />
                <OhlcCell
                  label="L"
                  caption="min."
                  value={display.convertForDisplay(activeCandle.low, currency)}
                  unit={unit}
                  colors={colors}
                />
                <OhlcCell
                  label="C"
                  caption="zamknięcie"
                  value={activeCandle.close}
                  unit={unit}
                  colors={colors}
                  highlight={
                    activeChange >= 0 ? colors.positive : colors.negative
                  }
                />
              </View>
            )}

            {/* Legenda pod wykresem */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.positive },
                  ]}
                />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>
                  świeca wzrostowa
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.negative },
                  ]}
                />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>
                  świeca spadkowa
                </Text>
              </View>
            </View>
            <Text style={[styles.legendHint, { color: colors.textMuted }]}>
              O — otwarcie · H — maksimum · L — minimum · C — zamknięcie.
              Przytrzymaj wykres, aby odczytać wartości pojedynczej świecy.
            </Text>
          </ScrollView>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

/** Kolory motywu. */
type ThemeColors = ReturnType<typeof useTheme>["colors"];

/**
 * Przycisk wyboru zakresu lub interwału.
 *
 * @param props Właściwości przycisku.
 * @param props.label Etykieta.
 * @param props.active Czy opcja jest wybrana.
 * @param props.disabled Czy przycisk jest wyłączony (np. interwał śróddzienny dla długiego zakresu).
 * @param props.onPress Akcja po naciśnięciu.
 * @param props.colors Kolory motywu.
 */

function ChartButton({
  label,
  active,
  disabled = false,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={[
        styles.button,
        {
          backgroundColor: active ? colors.accent : colors.surfaceMutedGlass,
          borderColor: active ? colors.accent : colors.borderGlass,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? "#ffffff" : colors.textMuted,
          fontSize: 12,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Komórka panelu OHLC (otwarcie, maksimum, minimum lub zamknięcie).
 *
 * @param props Właściwości komórki.
 * @param props.label Skrót, np. `"O"`.
 * @param props.caption Pełna nazwa, np. `"Otwarcie"`.
 * @param props.value Cena.
 * @param props.unit Symbol waluty.
 * @param props.colors Kolory motywu.
 * @param props.highlight Opcjonalny kolor wartości (np. zielony/czerwony dla zamknięcia).
 */
function OhlcCell({
  label,
  caption,
  value,
  unit,
  colors,
  highlight,
}: {
  label: string;
  caption: string;
  value: number;
  unit: string;
  colors: ThemeColors;
  highlight?: string;
}) {
  return (
    <View style={styles.ohlcCell}>
      <Text style={[styles.ohlcLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.ohlcValue, { color: highlight ?? colors.text }]}>
        {value.toLocaleString("pl-PL", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>
      <Text style={[styles.ohlcCaption, { color: colors.textMuted }]}>
        {caption}
      </Text>
      <Text style={[styles.ohlcUnit, { color: colors.textMuted }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  headerSymbol: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  priceRow: {
    gap: 2,
  },
  price: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  change: {
    fontSize: 13,
    fontWeight: "700",
  },
  candleDate: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  controls: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },
  button: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chartWrap: {
    width: "100%",
  },
  chartRow: {
    flexDirection: "row",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.9,
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    width: StyleSheet.hairlineWidth,
    opacity: 0.45,
  },
  axisColumn: {
    width: AXIS_WIDTH,
    position: "relative",
  },
  axisLabel: {
    position: "absolute",
    right: 0,
    fontSize: 10,
    fontWeight: "600",
  },
  tooltip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeAxisText: {
    fontSize: 10,
    fontWeight: "500",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  placeholderText: {
    fontSize: 13,
    textAlign: "center",
  },
  ohlcPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ohlcCell: {
    flex: 1,
    alignItems: "flex-start",
  },
  ohlcLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  ohlcValue: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  ohlcCaption: {
    fontSize: 9,
    marginTop: 1,
  },
  ohlcUnit: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  legendHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
});
