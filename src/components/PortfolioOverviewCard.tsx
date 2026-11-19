/**
 * Talia kart portfeli w trzech walutach (PLN, EUR, USD) na ekranie głównym.
 *
 * @module src/components/PortfolioOverviewCard
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useDisplayCurrency } from "../displayCurrency";
import { Currency, useTheme } from "../theme";
import { GlassBackground } from "./GlassBackground";
import {
  PortfolioResultChart,
  buildPortfolioSeries,
} from "./PortfolioResultChart";

/** Kolejność walut w talii. */
const currencyOrder: Currency[] = ["PLN", "EUR", "USD"];
/** Dane karty portfela. */
type Portfolio = {
  /** Nazwa portfela. */
  name: string;
  /** Waluta portfela. */
  currency: Currency;
  /** Symbol waluty. */
  symbol: string;
  /** Łączna wartość. */
  totalValue: number;
  /** Wolna gotówka. */
  cashBalance: number;
  /** Wynik kwotowy. */
  profitCurrency: number;
  /** Wynik procentowy. */
  profitPercent: number;
  /** Kolor akcentu karty. */
  accent: string;
  /** Symbol instrumentu pokazywanego na wykresie pod kartą. */
  stock: string;
  /** Nazwa tego instrumentu. */
  stockName: string;
  /** Giełda tego instrumentu. */
  exchange: string;
};
/** Przykładowe (stałe) dane portfela dla każdej waluty. */
const cards: Record<Currency, Portfolio> = {
  PLN: {
    name: "Portfel podstawowy",
    currency: "PLN",
    symbol: "zł",
    totalValue: 10000,
    cashBalance: 2550,
    profitCurrency: 800,
    profitPercent: 8.7,
    accent: "#607a99",
    stock: "PKO",
    stockName: "PKO Bank Polski",
    exchange: "GPW",
  },
  EUR: {
    name: "Portfel europejski",
    currency: "EUR",
    symbol: "€",
    totalValue: 2320,
    cashBalance: 540,
    profitCurrency: 180,
    profitPercent: 8.41,
    accent: "#81779c",
    stock: "MC.PA",
    stockName: "Louis Vuitton / LVMH",
    exchange: "EURONEXT_PARIS",
  },
  USD: {
    name: "Portfel amerykański",
    currency: "USD",
    symbol: "$",
    totalValue: 2520,
    cashBalance: 580,
    profitCurrency: 220,
    profitPercent: 9.57,
    accent: "#648a78",
    stock: "AAPL",
    stockName: "Apple",
    exchange: "NASDAQ",
  },
};

/** Czas (ms) animacji tasowania talii. */
const SHUFFLE_MS = 380;

/**
 * Animuje kartę na wierzch talii (pozycja 0).
 *
 * @param phase Pozycja karty w talii (0 — wierzch, 1 — środek, 2 — spód).
 */
function moveToFront(phase: SharedValue<number>) {
  phase.value = withTiming(0, {
    duration: SHUFFLE_MS,
    easing: Easing.out(Easing.back(1.05)),
  });
}
/**
 * Animuje kartę na środek talii (pozycja 1).
 *
 * @param phase Pozycja karty w talii.
 */
function moveToMiddle(phase: SharedValue<number>) {
  phase.value = withTiming(1, {
    duration: SHUFFLE_MS,
    easing: Easing.out(Easing.cubic),
  });
}
/**
 * Animuje kartę na spód talii (pozycja 2).
 *
 * @param phase Pozycja karty w talii.
 * @param onDone Wywoływane (w wątku JS) po zakończeniu animacji.
 */
function moveToBack(phase: SharedValue<number>, onDone: () => void) {
  phase.value = withTiming(
    2,
    { duration: SHUFFLE_MS, easing: Easing.inOut(Easing.quad) },
    (finished) => {
      "worklet";
      if (finished) {
        runOnJS(onDone)();
      }
    },
  );
}
/**
 * Wygasza kartę (po 40 ms opóźnienia) — używane dla karty zjeżdżającej z wierzchu.
 *
 * @param opacity Krycie karty.
 */
function fadeCardOut(opacity: SharedValue<number>) {
  opacity.value = withDelay(
    40,
    withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
  );
}
/**
 * Przywraca pełne krycie karty.
 *
 * @param opacity Krycie karty.
 */
function fadeCardIn(opacity: SharedValue<number>) {
  opacity.value = withTiming(1, { duration: 200 });
}

/** Właściwości karty `PortfolioCard`. */
type PortfolioCardProps = {
  /** Dane portfela. */
  data: Portfolio;
  /** Pozycja w talii po ostatnim tasowaniu. */
  index: number;
  /** Czy karta jest na wierzchu. */
  isFront: boolean;
  /** Animowana pozycja karty w talii. */
  phase: SharedValue<number>;
  /** Animowane krycie karty. */
  opacity: SharedValue<number>;
  /** Wywoływane po naciśnięciu karty. */
  onPress: () => void;
};

/**
 * Pojedyncza karta portfela w talii: wartość, wynik i wykres z ostatnich 3 miesięcy.
 *
 * @param props Właściwości karty.
 */
function PortfolioCard({
  data,
  index,
  isFront,
  phase,
  opacity,
  onPress,
}: PortfolioCardProps) {
  const { colors } = useTheme();
  const display = useDisplayCurrency();
  const animatedStyle = useAnimatedStyle(() => {
    const pos = phase.value;
    return {
      opacity: opacity.value,
      transform: [{ translateY: pos * 16 }, { scale: 1 - pos * 0.045 }],
    };
  });
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  const formatNumber = (val: number) =>
    Math.abs(val).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const isPositive = data.profitCurrency >= 0;
  const arrowColor = isPositive ? "#10b981" : "#ef4444";
  const arrowIcon = isPositive ? "arrow-up" : "arrow-down";
  const sign = isPositive ? "+" : "-";

  const symbol = display.displaySymbol(data.currency);
  const totalFormatted = `${formatNumber(display.convertForDisplay(data.totalValue, data.currency))} ${symbol}`;
  const activeFormatted = `${formatNumber(display.convertForDisplay(Math.max(0, data.totalValue - data.cashBalance), data.currency))} ${symbol}`;
  const inactiveFormatted = `${formatNumber(display.convertForDisplay(data.cashBalance, data.currency))} ${symbol}`;
  const profitFormatted = `${sign}${formatNumber(display.convertForDisplay(data.profitCurrency, data.currency))} ${symbol}`;
  const profitPctFormatted = `${sign}${Math.abs(data.profitPercent).toFixed(2)}%`;

  // Punkty wykresu dla 3 miesięcy
  const chartData = useMemo(() => {
    const baseVal = data.totalValue - data.profitCurrency;
    const midVal = baseVal + data.profitCurrency * 0.45;
    const endVal = data.totalValue;
    return buildPortfolioSeries([baseVal, midVal, endVal], 90).map((point) => ({
      ...point,
      value: display.convertForDisplay(point.value, data.currency),
    }));
  }, [data, display]);

  const cardAccent = data.accent;

  return (
    <Reanimated.View
      pointerEvents={isFront ? "auto" : "none"}
      style={[
        isFront ? styles.frontSlot : styles.backSlot,
        { zIndex: 30 - index * 10, elevation: isFront ? 6 : 0 },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={isFront ? onPress : undefined}
        style={[
          styles.card,
          // Android rysuje cień na podstawie tła - konieczna poprawka dla Androida
          Platform.OS === "android"
            ? { backgroundColor: colors.surface, elevation: isFront ? 3 : 0 }
            : null,
        ]}
      >
        <View style={styles.cardClip}>
          <GlassBackground intensity={45} tintColor={cardAccent + "15"} />

          <Reanimated.View
            pointerEvents="none"
            style={[styles.cardContent, contentStyle]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text
                  style={[styles.stockText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {data.name} · {data.currency}
                </Text>
                <Text style={[styles.total, { color: colors.text }]}>
                  {totalFormatted}
                </Text>
                <View style={styles.returnProfit}>
                  <Ionicons name={arrowIcon} size={13} color={arrowColor} />
                  <Text style={[styles.returnText, { color: colors.text }]}>
                    {profitFormatted} ({profitPctFormatted})
                  </Text>
                </View>
              </View>
              <Ionicons name="wallet-outline" size={24} color={cardAccent} />
            </View>

            {/* Breakdown: Aktywne / Nieaktywne */}
            <View style={[styles.breakdown, { marginBottom: 16 }]}>
              <Text style={[styles.breakdownText, { color: cardAccent }]}>
                Aktywne:{" "}
                <Text style={{ color: colors.text }}>{activeFormatted}</Text>
              </Text>
              <Text style={[styles.breakdownText, { color: colors.textMuted }]}>
                Nieaktywne:{" "}
                <Text style={{ color: colors.text }}>{inactiveFormatted}</Text>
              </Text>
            </View>

            {/* Wykres wyników portfela z pionową legendą i zakresem dat */}
            <PortfolioResultChart
              data={chartData}
              currencySymbol={symbol}
              periodLabel="3 miesiące"
              height={110}
            />
          </Reanimated.View>
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

/**
 * Talia kart portfeli w walutach PLN, EUR i USD (dane przykładowe).
 *
 * W trybie „Wiele walut” widoczne są wszystkie trzy karty; podwójne dotknięcie
 * (na webie pojedyncze kliknięcie) przekłada wierzchnią kartę na spód. W trybie
 * jednej waluty widoczna jest tylko karta waluty rozliczeniowej. Na starcie na
 * wierzchu jest waluta rozliczeniowa.
 *
 * @param props Właściwości komponentu.
 * @param props.onStockChange Wywoływane przy zmianie wierzchniej karty z instrumentem,
 * który rodzic ma pokazać na wykresie (symbol, nazwa, waluta, giełda).
 */
export function PortfolioOverviewCard({
  onStockChange,
}: {
  onStockChange?: (
    stock: string,
    title: string,
    currency: Currency,
    exchange?: string,
  ) => void;
}) {
  const { defaultCurrency, multiCurrency } = useTheme();
  // Kolejność talii: [wierzch, środek, spód]. Zmieniana dopiero po zakończeniu animacji
  const [deckOrder, setDeckOrder] = useState<Currency[]>(() => {
    const selected = currencyOrder.filter((item) => item !== defaultCurrency);
    return [defaultCurrency, ...selected];
  });

  const phasePLN = useSharedValue(deckOrder.indexOf("PLN"));
  const phaseEUR = useSharedValue(deckOrder.indexOf("EUR"));
  const phaseUSD = useSharedValue(deckOrder.indexOf("USD"));
  const opacityPLN = useSharedValue(1);
  const opacityEUR = useSharedValue(1);
  const opacityUSD = useSharedValue(1);
  const phases = useMemo<Record<Currency, SharedValue<number>>>(
    () => ({ PLN: phasePLN, EUR: phaseEUR, USD: phaseUSD }),
    [phasePLN, phaseEUR, phaseUSD],
  );
  const opacities = useMemo<Record<Currency, SharedValue<number>>>(
    () => ({ PLN: opacityPLN, EUR: opacityEUR, USD: opacityUSD }),
    [opacityPLN, opacityEUR, opacityUSD],
  );

  const lastTap = useRef(0);
  const animating = useRef(false);

  const currency = multiCurrency ? deckOrder[0] : defaultCurrency;
  const data = cards[currency];
  useEffect(() => {
    onStockChange?.(data.stock, data.stockName, currency, data.exchange);
  }, [currency, data.stock, data.stockName, data.exchange, onStockChange]);

  const commitShuffle = useCallback(
    (nextOrder: Currency[], departed: Currency) => {
      setDeckOrder(nextOrder);
      fadeCardIn(opacities[departed]);
      animating.current = false;
    },
    [opacities],
  );

  const changeCurrency = useCallback(() => {
    if (animating.current || !multiCurrency) return;
    animating.current = true;
    const [front, middle, back] = deckOrder;

    // Środek wjeżdża na wierzch, spód na środek, wierzch zjeżdża na spód
    moveToFront(phases[middle]);
    moveToMiddle(phases[back]);
    fadeCardOut(opacities[front]);
    moveToBack(phases[front], () =>
      commitShuffle([middle, back, front], front),
    );
  }, [commitShuffle, deckOrder, multiCurrency, opacities, phases]);

  // Funkcja obsługująca naciśnięcie karty portfela: na webie zmienia walutę jedno kliknięcie, na mobile podwójne dotknięcie
  const handleCardPress = () => {
    if (Platform.OS === "web") {
      changeCurrency();
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      changeCurrency();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <View style={styles.deck}>
      {(multiCurrency ? currencyOrder : [defaultCurrency]).map((item) => (
        <PortfolioCard
          key={item}
          data={cards[item]}
          index={deckOrder.indexOf(item)}
          isFront={deckOrder[0] === item}
          phase={phases[item]}
          opacity={opacities[item]}
          onPress={handleCardPress}
        />
      ))}
    </View>
  );
}

// Stylesheet dla komponentu PortfolioOverviewCard (karta portfela)
const styles = StyleSheet.create({
  deck: { position: "relative", marginBottom: 12 },
  frontSlot: { position: "relative" },
  backSlot: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    borderRadius: 18,
    // Kliknięcia karty na webie nie zaznaczają jej tekstu
    userSelect: "none",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardClip: {
    borderRadius: 18,
    minHeight: 260,
    overflow: "hidden",
    padding: 18,
  },
  cardContent: {
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  total: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 7,
  },
  stockText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  breakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  breakdownText: {
    fontSize: 12,
  },
  returnProfit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  returnText: {
    fontWeight: "700",
    fontSize: 11,
  },
});
