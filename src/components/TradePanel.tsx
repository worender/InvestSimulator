import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MockPortfolio } from "../database/mockPortfolioData";
import { SearchableInstrument } from "../database/mockSearchableInstruments";
import { useDisplayCurrency } from "../displayCurrency";
import { NOTIFICATION_GROUPS, notify } from "../notificationBus";
import { useTheme } from "../theme";
import { useLayoutMode } from "../useLayoutMode";

interface TradePanelProps {
  instrument: SearchableInstrument;
  portfolio: MockPortfolio;
  ownedQuantity: number;
  onMarketClosedAlert: (
    instrument: SearchableInstrument,
    orderType: "BUY" | "SELL",
    quantity: number,
    total: number,
  ) => void;
}

type InputMode = "quantity" | "amount";

/**
 * Panel do kupna i sprzedaży instrumentu
 * @param instrument Instrument, który jest kupowany lub sprzedawany
 * @param portfolio Portfel użytkownika, zawierający dostępne środki
 * @param ownedQuantity Ilość jednostek instrumentu posiadanych przez użytkownika
 * @param onMarketClosedAlert Funkcja wywoływana, gdy rynek jest zamknięty i użytkownik próbuje złożyć zlecenie
 * @returns
 */
export function TradePanel({
  instrument,
  portfolio,
  ownedQuantity,
  onMarketClosedAlert,
}: TradePanelProps) {
  const { colors } = useTheme();
  const display = useDisplayCurrency();
  const sideBySide = useLayoutMode().isDesktop;

  const isCrypto = instrument.category === "CRYPTO";
  const [inputMode, setInputMode] = useState<InputMode>("quantity");
  const [quantityStr, setQuantityStr] = useState("1");
  const [amountStr, setAmountStr] = useState("");

  // Animacja strzałki zmieniającej tryb wprowadzania
  const modeRotation = useSharedValue(0);
  const modeRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${modeRotation.value}deg` }],
  }));

  const parseNumber = (value: string) =>
    parseFloat(value.replace(",", ".")) || 0;

  const parsedAmount = parseNumber(amountStr);
  const amountDerivedQuantity =
    instrument.price > 0
      ? Math.floor((parsedAmount / instrument.price) * 100) / 100
      : 0;
  const parsedQuantity =
    inputMode === "amount" ? amountDerivedQuantity : parseNumber(quantityStr);
  const totalCost = parsedQuantity * instrument.price;

  const hasEnoughCash =
    instrument.price > 0 &&
    totalCost <= portfolio.cashBalance &&
    parsedQuantity > 0;
  const hasEnoughUnits =
    instrument.price > 0 &&
    ownedQuantity >= parsedQuantity &&
    parsedQuantity > 0 &&
    ownedQuantity > 0;

  const formatNumber = (num: number, maxDecimals = 2) =>
    num.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });

  const formatDisplayMoney = (num: number, sourceCurrency: string) =>
    `${formatNumber(display.convertForDisplay(num, sourceCurrency))} ${display.displaySymbol(sourceCurrency)}`;

  const handleStepQuantity = (delta: number) => {
    if (inputMode === "amount") {
      const next = Math.max(0, parsedAmount + delta * 100);
      setAmountStr(next.toFixed(2));
      return;
    }
    const step = isCrypto ? (delta > 0 ? 0.05 : -0.05) : delta;
    const nextVal = Math.max(0, parsedQuantity + step);
    setQuantityStr(
      isCrypto ? nextVal.toFixed(2) : Math.round(nextVal).toString(),
    );
  };

  // Zmiana trybu: za ilość <-> za kwotę
  const handleToggleInputMode = () => {
    modeRotation.value = withTiming(modeRotation.value + 180, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });

    if (inputMode === "quantity") {
      setAmountStr((parsedQuantity * instrument.price).toFixed(2));
      setInputMode("amount");
    } else {
      setQuantityStr(parsedQuantity.toFixed(2));
      setInputMode("quantity");
    }
  };

  const handleSetMaxForBuy = () => {
    if (instrument.price <= 0) return;

    if (inputMode === "amount") {
      setAmountStr(portfolio.cashBalance.toFixed(2));
      return;
    }

    const maxQty = portfolio.cashBalance / instrument.price;
    setQuantityStr(
      isCrypto
        ? (Math.floor(maxQty * 100) / 100).toFixed(2)
        : Math.floor(maxQty).toString(),
    );
  };

  const handleSetMaxForSell = () => {
    if (inputMode === "amount") {
      setAmountStr((ownedQuantity * instrument.price).toFixed(2));
      return;
    }
    setQuantityStr(
      isCrypto ? ownedQuantity.toFixed(3) : ownedQuantity.toString(),
    );
  };

  const handleExecuteBuy = () => {
    if (!hasEnoughCash) {
      notify({
        variant: "warning",
        title: "Brak środków",
        category: NOTIFICATION_GROUPS.transactions,
        message: "Nie posiadasz wystarczających środków na zakup tej ilości.",
      });
      return;
    }

    if (!instrument.isMarketOpen) {
      onMarketClosedAlert(instrument, "BUY", parsedQuantity, totalCost);
      return;
    }

    notify({
      variant: "success",
      title: "Zlecenie zrealizowane",
      category: NOTIFICATION_GROUPS.transactions,
      message: `Pomyślnie kupiono ${parsedQuantity} szt. ${instrument.symbol} za ${formatDisplayMoney(totalCost, instrument.currency)}.`,
    });
  };

  const handleExecuteSell = () => {
    if (!hasEnoughUnits) {
      notify({
        variant: "warning",
        title: "Brak jednostek",
        category: NOTIFICATION_GROUPS.transactions,
        message: "Nie posiadasz wystarczającej liczby jednostek do sprzedaży.",
      });
      return;
    }

    if (!instrument.isMarketOpen) {
      onMarketClosedAlert(instrument, "SELL", parsedQuantity, totalCost);
      return;
    }

    notify({
      variant: "success",
      title: "Zlecenie sprzedaży zrealizowane",
      category: NOTIFICATION_GROUPS.transactions,
      message: `Pomyślnie sprzedano ${parsedQuantity} szt. ${instrument.symbol} za ${formatDisplayMoney(totalCost, instrument.currency)}.`,
    });
  };

  const marketStatusColor = instrument.isMarketOpen
    ? colors.positive
    : colors.negative;

  return (
    <View style={styles.container}>
      <View style={styles.instrumentMetaRow}>
        <View style={styles.instrumentNameCol}>
          <View style={styles.symbolBadgeRow}>
            <Text style={[styles.activeSymbol, { color: colors.text }]}>
              {instrument.symbol}
            </Text>
            <Text style={[styles.categoryBadge, { color: colors.accent }]}>
              {instrument.categoryLabel}
            </Text>
          </View>
          <Text
            style={[styles.activeName, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {instrument.name}
          </Text>
        </View>

        <View style={styles.activePriceCol}>
          <Text style={[styles.activePrice, { color: colors.text }]}>
            {formatDisplayMoney(instrument.price, instrument.currency)}
          </Text>
          <View style={styles.marketStatusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: marketStatusColor }]}
            />
            <Text
              style={[styles.marketStatusText, { color: marketStatusColor }]}
            >
              {instrument.isMarketOpen ? "Otwarty" : "Zamknięty"}
            </Text>
          </View>
        </View>
      </View>

      {/* Informacja o posiadanych jednostkach i wolnych środkach */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Posiadasz
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {ownedQuantity} szt.
          </Text>
        </View>
        <View style={[styles.summaryCell, styles.summaryCellRight]}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Wolne środki
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatDisplayMoney(portfolio.cashBalance, portfolio.currency)}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderGlass }]} />

      <View style={styles.quantitySelectorRow}>
        <Pressable
          onPress={handleToggleInputMode}
          accessibilityRole="button"
          accessibilityLabel={
            inputMode === "quantity"
              ? "Przełącz na kupowanie za kwotę"
              : "Przełącz na kupowanie za ilość"
          }
          hitSlop={8}
          style={({ pressed }) => [
            styles.modeToggle,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Reanimated.View style={modeRotationStyle}>
            <Ionicons name="sync-outline" size={18} color={colors.accent} />
          </Reanimated.View>
        </Pressable>

        <Pressable
          onPress={() => handleStepQuantity(-1)}
          accessibilityRole="button"
          accessibilityLabel="Zmniejsz ilość"
          style={({ pressed }) => [
            styles.stepBtn,
            {
              backgroundColor: colors.surfaceMuted,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>

        <View
          style={[
            styles.quantityInputWrapper,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.accent,
            },
          ]}
        >
          <TextInput
            value={inputMode === "quantity" ? quantityStr : amountStr}
            onChangeText={
              inputMode === "quantity" ? setQuantityStr : setAmountStr
            }
            keyboardType="numeric"
            style={[styles.quantityInput, { color: colors.text }]}
            textAlign="center"
          />
          <Text style={[styles.quantityUnit, { color: colors.textMuted }]}>
            {inputMode === "quantity"
              ? "szt."
              : display.displaySymbol(instrument.currency)}
          </Text>
        </View>

        <Pressable
          onPress={() => handleStepQuantity(1)}
          accessibilityRole="button"
          accessibilityLabel="Zwiększ ilość"
          style={({ pressed }) => [
            styles.stepBtn,
            {
              backgroundColor: colors.surfaceMuted,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>

      {/* Tryb kwoty */}
      {inputMode === "amount" && (
        <Text style={[styles.derivedQuantity, { color: colors.textMuted }]}>
          Otrzymasz:{" "}
          <Text style={{ color: colors.text, fontWeight: "700" }}>
            {parsedQuantity.toFixed(2)} szt.
          </Text>
        </Text>
      )}

      <View style={styles.quickShortcutsRow}>
        <Pressable onPress={handleSetMaxForBuy} hitSlop={6}>
          <Text style={[styles.shortcutBtnText, { color: colors.accent }]}>
            Maks. kupno
          </Text>
        </Pressable>
        {ownedQuantity > 0 && (
          <Pressable onPress={handleSetMaxForSell} hitSlop={6}>
            <Text style={[styles.shortcutBtnText, { color: colors.accent }]}>
              Całość ({ownedQuantity})
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.totalCalcRow}>
        <Text style={[styles.totalCalcLabel, { color: colors.textMuted }]}>
          {inputMode === "quantity" ? "Łącznie" : "Kwota"}
        </Text>
        <Text style={[styles.totalCalcVal, { color: colors.text }]}>
          {formatDisplayMoney(totalCost, instrument.currency)}
        </Text>
      </View>

      {/* Na desktopie przyciski stoją obok siebie, a komunikat jest pod swoim przyciskiem */}
      <View
        style={[styles.actionButtonsCol, sideBySide && styles.actionButtonsRow]}
      >
        <View style={[styles.actionCell, sideBySide && styles.actionCellRow]}>
          <Pressable
            onPress={handleExecuteBuy}
            disabled={!hasEnoughCash}
            accessibilityRole="button"
            accessibilityLabel={`Kup ${parsedQuantity} szt. ${instrument.symbol}`}
            style={({ pressed }) => [
              styles.tradeBtn,
              {
                backgroundColor: hasEnoughCash
                  ? colors.positive
                  : colors.surfaceMuted,
                opacity: !hasEnoughCash ? 0.55 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name="arrow-up-outline"
              size={16}
              color={hasEnoughCash ? "#ffffff" : colors.textMuted}
            />
            <Text
              style={[
                styles.tradeBtnText,
                { color: hasEnoughCash ? "#ffffff" : colors.textMuted },
              ]}
            >
              Kup za {formatDisplayMoney(totalCost, instrument.currency)}
            </Text>
          </Pressable>

          {!hasEnoughCash && parsedQuantity > 0 && instrument.price > 0 && (
            <Text
              style={[styles.validationWarning, { color: colors.negative }]}
            >
              Brak wystarczających środków (
              {formatDisplayMoney(
                Math.max(0, totalCost - portfolio.cashBalance),
                portfolio.currency,
              )}
              ).
            </Text>
          )}
        </View>

        <View style={[styles.actionCell, sideBySide && styles.actionCellRow]}>
          <Pressable
            onPress={handleExecuteSell}
            disabled={!hasEnoughUnits}
            accessibilityRole="button"
            accessibilityLabel={`Sprzedaj ${parsedQuantity} szt. ${instrument.symbol}`}
            style={({ pressed }) => [
              styles.tradeBtn,
              {
                backgroundColor: hasEnoughUnits
                  ? colors.negative
                  : colors.surfaceMuted,
                opacity: !hasEnoughUnits ? 0.55 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name="arrow-down-outline"
              size={16}
              color={hasEnoughUnits ? "#ffffff" : colors.textMuted}
            />
            <Text
              style={[
                styles.tradeBtnText,
                { color: hasEnoughUnits ? "#ffffff" : colors.textMuted },
              ]}
            >
              Sprzedaj za {formatDisplayMoney(totalCost, instrument.currency)}
            </Text>
          </Pressable>

          {!hasEnoughUnits && (
            <Text
              style={[styles.validationWarning, { color: colors.textMuted }]}
            >
              {ownedQuantity === 0
                ? "Brak pozycji w portfelu."
                : `Dostępne do sprzedaży: ${ownedQuantity} szt.`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// StyleSheet dla komponentu TradePanel
const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 18,
  },
  instrumentMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  instrumentNameCol: {
    flex: 1,
  },
  symbolBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  activeSymbol: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  activeName: {
    fontSize: 12,
    marginTop: 4,
  },
  activePriceCol: {
    alignItems: "flex-end",
  },
  activePrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  marketStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  marketStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  summaryCell: {
    flex: 1,
  },
  summaryCellRight: {
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  quantitySelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  modeToggle: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityInputWrapper: {
    flex: 1,
    maxWidth: 200,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  quantityInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 0,
  },
  quantityUnit: {
    fontSize: 11,
    fontWeight: "600",
  },
  derivedQuantity: {
    fontSize: 11,
    textAlign: "center",
    marginTop: -6,
  },
  quickShortcutsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 22,
  },
  shortcutBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalCalcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalCalcLabel: {
    fontSize: 12,
  },
  totalCalcVal: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonsCol: {
    flexDirection: "column",
    gap: 14,
  },
  actionButtonsRow: {
    flexDirection: "row",
  },
  actionCell: {
    flex: 1,
  },
  actionCellRow: {
    flexBasis: 0,
  },
  tradeBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tradeBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  validationWarning: {
    fontSize: 11,
    marginTop: 7,
    lineHeight: 15,
  },
});
