import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  convertCurrency,
  currencySymbol,
  formatAmountInput,
  FX_FEE_PERCENT,
  parseAmountInput,
} from "../currency";
import { createCategory, createTransaction } from "../database/database";
import { getStockQuoteDetails } from "../api/marketService";
import { useDisplayCurrency } from "../displayCurrency";
import { NOTIFICATION_GROUPS, notify } from "../notificationBus";
import { NotificationHost } from "../notifications";
import { getPillarOption, type PortfolioPillarKey } from "../portfolio/pillars";
import { usePortfolios } from "../portfolio/PortfolioProvider";
import type { TradeInstrument } from "../portfolio/types";
import { useTheme } from "../theme";
import { useLayoutMode } from "../useLayoutMode";

interface TradePanelProps {
  instrument: TradeInstrument;
  ownedQuantity: number;
}

type InputMode = "quantity" | "amount";
type OrderType = "BUY" | "SELL";

interface OrderDraft {
  type: OrderType;
  quantity: number;
  price: number;
  total: number;
  pillarKey: PortfolioPillarKey;
  categoryId?: number;
}

export function TradePanel({
  instrument,
  ownedQuantity,
}: TradePanelProps) {
  const { colors, mode, rates } = useTheme();
  const display = useDisplayCurrency();
  const sideBySide = useLayoutMode().isDesktop;
  const { activePortfolio, reload } = usePortfolios();

  const isCrypto = instrument.pillarKey === "crypto";
  const [inputMode, setInputMode] = useState<InputMode>("quantity");
  const [quantityStr, setQuantityStr] = useState("1");
  const [amountStr, setAmountStr] = useState("");
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [tradeModal, setTradeModal] = useState<"missing-pillar" | "confirmation" | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveInstrumentPrice, setLiveInstrumentPrice] = useState<number | null>(null);

  const modeRotation = useSharedValue(0);
  const modeRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${modeRotation.value}deg` }],
  }));

  const parseNumber = (value: string) =>
    parseFloat(value.replace(",", ".")) || 0;

  const portfolioCurrency = activePortfolio?.currency ?? "PLN";
  const effectiveInstrumentPrice = liveInstrumentPrice ?? instrument.price;
  const parsedAmount = parseAmountInput(amountStr);
  const unitCostWallet =
    effectiveInstrumentPrice *
    convertCurrency(1, instrument.currency, portfolioCurrency, rates) *
    (instrument.currency.trim().toUpperCase() ===
    portfolioCurrency.trim().toUpperCase()
      ? 1
      : 1 - FX_FEE_PERCENT / 100);
  const amountDerivedQuantity =
    unitCostWallet > 0
      ? Math.floor((parsedAmount / unitCostWallet) * 100) / 100
      : 0;
  const parsedQuantity =
    inputMode === "amount" ? amountDerivedQuantity : parseNumber(quantityStr);
  const totalCost = parsedQuantity * effectiveInstrumentPrice;

  const mismatch =
    instrument.currency.trim().toUpperCase() !==
    portfolioCurrency.trim().toUpperCase();
  const fxRate = convertCurrency(1, instrument.currency, portfolioCurrency, rates);
  const grossWallet = totalCost * fxRate;
  const feeWallet = mismatch ? grossWallet * (FX_FEE_PERCENT / 100) : 0;
  const netWallet = grossWallet - feeWallet;
  const cashBalance = activePortfolio?.cashBalance ?? 0;
  const hasEnoughCash =
    effectiveInstrumentPrice > 0 &&
    parsedQuantity > 0 &&
    netWallet <= cashBalance + 0.000001;
  const hasEnoughUnits =
    effectiveInstrumentPrice > 0 &&
    ownedQuantity >= parsedQuantity &&
    parsedQuantity > 0 &&
    ownedQuantity > 0;
  const orderDraftNetWallet = orderDraft
    ? orderDraft.quantity *
      orderDraft.price *
      fxRate *
      (mismatch ? 1 - FX_FEE_PERCENT / 100 : 1)
    : netWallet;

  const formatNumber = (num: number, maxDecimals = 2) =>
    num.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });

  const formatDisplayMoney = (num: number, sourceCurrency: string) =>
    `${formatNumber(display.convertForDisplay(num, sourceCurrency))} ${display.displaySymbol(sourceCurrency)}`;

  const formatNativeMoney = (num: number, currency: string) =>
    `${formatNumber(num)} ${currencySymbol(currency)}`;

  const handleStepQuantity = (delta: number) => {
    if (inputMode === "amount") {
      const next = Math.max(0, parsedAmount + delta * 100);
      setAmountStr(formatAmountInput(next.toFixed(2)));
      return;
    }
    const step = isCrypto ? (delta > 0 ? 0.05 : -0.05) : delta;
    const nextVal = Math.max(0, parsedQuantity + step);
    setQuantityStr(
      isCrypto ? nextVal.toFixed(2) : Math.round(nextVal).toString(),
    );
  };

  const handleToggleInputMode = () => {
    modeRotation.value = withTiming(modeRotation.value + 180, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });

    if (inputMode === "quantity") {
      setAmountStr(
        formatAmountInput((parsedQuantity * unitCostWallet).toFixed(2)),
      );
      setInputMode("amount");
    } else {
      setQuantityStr(parsedQuantity.toFixed(2));
      setInputMode("quantity");
    }
  };

  const handleSetMaxForBuy = () => {
    if (unitCostWallet <= 0) return;

    if (inputMode === "amount") {
      setAmountStr(formatAmountInput(cashBalance.toFixed(2)));
      return;
    }

    const maxQty = cashBalance / unitCostWallet;
    setQuantityStr(
      isCrypto
        ? (Math.floor(maxQty * 100) / 100).toFixed(2)
        : Math.floor(maxQty).toString(),
    );
  };

  const handleSetMaxForSell = () => {
    if (inputMode === "amount") {
      setAmountStr(
        formatAmountInput((ownedQuantity * unitCostWallet).toFixed(2)),
      );
      return;
    }
    setQuantityStr(
      isCrypto ? ownedQuantity.toFixed(3) : ownedQuantity.toString(),
    );
  };

  const openConfirmation = (draft: OrderDraft) => {
    setOrderDraft(draft);
    setTradeModal("confirmation");
  };

  const fetchLatestPrice = async (): Promise<number | null> => {
    setBusy(true);
    try {
      const quote = await getStockQuoteDetails(
        instrument.symbol,
        instrument.exchange,
        { forceRefresh: true },
      );
      if (!quote || quote.price <= 0) {
        throw new Error("Nie udało się pobrać aktualnego kursu instrumentu");
      }
      setLiveInstrumentPrice(quote.price);
      return quote.price;
    } catch (error) {
      notify({
        variant: "error",
        title: "Brak aktualnego kursu",
        category: NOTIFICATION_GROUPS.transactions,
        message:
          error instanceof Error
            ? error.message
            : "Nie można potwierdzić transakcji bez świeżego kursu.",
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteBuy = async () => {
    if (!activePortfolio) {
      notify({
        variant: "warning",
        title: "Brak portfela",
        category: NOTIFICATION_GROUPS.transactions,
        message: "Najpierw utwórz portfel, aby kupować instrumenty.",
      });
      return;
    }

    const latestPrice = await fetchLatestPrice();
    if (latestPrice === null) return;

    const latestUnitCost =
      latestPrice *
      convertCurrency(1, instrument.currency, portfolioCurrency, rates) *
      (mismatch ? 1 - FX_FEE_PERCENT / 100 : 1);
    const latestQuantity =
      inputMode === "amount"
        ? Math.floor((parsedAmount / latestUnitCost) * 100) / 100
        : parsedQuantity;
    const latestTotal = latestQuantity * latestPrice;
    const latestGross = latestTotal * fxRate;
    const latestNet =
      latestGross *
      (mismatch ? 1 - FX_FEE_PERCENT / 100 : 1);

    if (latestPrice <= 0 || latestQuantity <= 0 || latestNet > cashBalance + 0.000001) {
      notify({
        variant: "warning",
        title: "Brak środków",
        category: NOTIFICATION_GROUPS.transactions,
        message: "Nie posiadasz wystarczających środków na zakup tej ilości.",
      });
      return;
    }

    const draft: OrderDraft = {
      type: "BUY",
      quantity: latestQuantity,
      price: latestPrice,
      total: latestTotal,
      pillarKey: instrument.pillarKey,
    };

    const existing = activePortfolio.categories.find(
      (category) => category.kind === instrument.pillarKey,
    );

    if (existing) {
      openConfirmation({ ...draft, categoryId: existing.categoryId });
      return;
    }

    setOrderDraft(draft);
    setTradeModal("missing-pillar");
  };

  const handleExecuteSell = async () => {
    if (!activePortfolio) {
      notify({
        variant: "warning",
        title: "Brak portfela",
        category: NOTIFICATION_GROUPS.transactions,
        message: "Najpierw utwórz portfel, aby sprzedawać instrumenty.",
      });
      return;
    }

    if (!hasEnoughUnits) {
      notify({
        variant: "warning",
        title: "Brak jednostek",
        category: NOTIFICATION_GROUPS.transactions,
        message: "Nie posiadasz wystarczającej liczby jednostek do sprzedaży.",
      });
      return;
    }

    const latestPrice = await fetchLatestPrice();
    if (latestPrice === null) return;
    const latestTotal = parsedQuantity * latestPrice;

    openConfirmation({
      type: "SELL",
      quantity: parsedQuantity,
      price: latestPrice,
      total: latestTotal,
      pillarKey: instrument.pillarKey,
    });
  };

  const handleConfirmMissingPillar = async () => {
    if (!activePortfolio || !orderDraft) return;

    const pillar = getPillarOption(orderDraft.pillarKey);
    setBusy(true);

    try {
      const category = await createCategory(activePortfolio.walletId, {
        name: pillar.title,
        kind: orderDraft.pillarKey,
      });
      await reload();
      setTradeModal("confirmation");
      setOrderDraft({ ...orderDraft, categoryId: category.id });
      notify({
        variant: "success",
        title: "Dodano filar",
        category: NOTIFICATION_GROUPS.portfolio,
        message: `${pillar.title} został dodany do portfela ${activePortfolio.name}.`,
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
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!activePortfolio || !orderDraft) return;

    if (orderDraft.type === "BUY" && orderDraft.categoryId === undefined) {
      notify({
        variant: "error",
        title: "Brak filaru",
        category: NOTIFICATION_GROUPS.transactions,
        message: "Nie można przypisać zakupu do filaru portfela.",
      });
      return;
    }

    setBusy(true);

    try {
      await createTransaction({
        symbol: instrument.symbol,
        type: orderDraft.type,
        quantity: orderDraft.quantity,
        price: orderDraft.price,
        id_wallet: activePortfolio.walletId,
        category_id:
          orderDraft.type === "BUY" ? orderDraft.categoryId : undefined,
        name: instrument.name,
        exchange: instrument.exchange,
        currency: instrument.currency,
        fxRate,
      });
      await reload();
      setTradeModal(null);
      setOrderDraft(null);
      notify({
        variant: "success",
        title:
          orderDraft.type === "BUY"
            ? "Zlecenie kupna zrealizowane"
            : "Zlecenie sprzedaży zrealizowane",
        category: NOTIFICATION_GROUPS.transactions,
        message:
          orderDraft.type === "BUY"
            ? `Kupiono ${orderDraft.quantity} szt. ${instrument.symbol} za ${formatNativeMoney(orderDraftNetWallet, portfolioCurrency)}.`
            : `Sprzedano ${orderDraft.quantity} szt. ${instrument.symbol} za ${formatNativeMoney(orderDraftNetWallet, portfolioCurrency)}.`,
      });
    } catch (error) {
      notify({
        variant: "error",
        title: "Transakcja nie została zrealizowana",
        category: NOTIFICATION_GROUPS.transactions,
        message:
          error instanceof Error
            ? error.message
            : "Spróbuj ponownie za chwilę.",
      });
    } finally {
      setBusy(false);
    }
  };

  const marketStatusColor = instrument.isMarketOpen
    ? colors.positive
    : colors.negative;
  const pillar = getPillarOption(instrument.pillarKey);

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
            {formatDisplayMoney(effectiveInstrumentPrice, instrument.currency)}
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
            {formatDisplayMoney(cashBalance, portfolioCurrency)}
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
              inputMode === "quantity"
                ? setQuantityStr
                : (value) => setAmountStr(formatAmountInput(value))
            }
            keyboardType="numeric"
            style={[styles.quantityInput, { color: colors.text }]}
            textAlign="center"
          />
          <Text style={[styles.quantityUnit, { color: colors.textMuted }]}>
            {inputMode === "quantity"
              ? "szt."
              : currencySymbol(portfolioCurrency)}
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
          {inputMode === "amount"
            ? formatNativeMoney(netWallet, portfolioCurrency)
            : formatDisplayMoney(totalCost, instrument.currency)}
        </Text>
      </View>

      {mismatch && parsedQuantity > 0 && (
        <Text style={[styles.fxPreview, { color: colors.textMuted }]}>
          Przewalutowanie {instrument.currency} → {portfolioCurrency}:{" "}
          {formatNativeMoney(netWallet, portfolioCurrency)} po opłacie{" "}
          {FX_FEE_PERCENT.toLocaleString("pl-PL")}%
        </Text>
      )}

      <View
        style={[styles.actionButtonsCol, sideBySide && styles.actionButtonsRow]}
      >
        <View style={[styles.actionCell, sideBySide && styles.actionCellRow]}>
          <Pressable
            onPress={handleExecuteBuy}
            disabled={!hasEnoughCash || busy}
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
              Kup za {formatNativeMoney(netWallet, portfolioCurrency)}
            </Text>
          </Pressable>

          {!hasEnoughCash && parsedQuantity > 0 && instrument.price > 0 && (
            <Text
              style={[styles.validationWarning, { color: colors.negative }]}
            >
              Brak wystarczających środków (
              {formatNativeMoney(
                Math.max(0, netWallet - cashBalance),
                portfolioCurrency,
              )}
              ).
            </Text>
          )}
        </View>

        <View style={[styles.actionCell, sideBySide && styles.actionCellRow]}>
          <Pressable
            onPress={handleExecuteSell}
            disabled={!hasEnoughUnits || busy}
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
              Sprzedaj za {formatNativeMoney(netWallet, portfolioCurrency)}
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

      <Modal
        visible={tradeModal !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        navigationBarTranslucent
        onRequestClose={() => {
          if (!busy) setTradeModal(null);
        }}
      >
        <NotificationHost />
        <View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor:
                mode === "dark"
                  ? "rgba(13, 17, 23, 0.82)"
                  : "rgba(31, 35, 40, 0.58)",
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
              },
            ]}
          >
            {tradeModal === "missing-pillar" ? (
              <>
                <View
                  style={[
                    styles.modalIcon,
                    { backgroundColor: pillar.color + "22" },
                  ]}
                >
                  <Ionicons name={pillar.icon} size={28} color={pillar.color} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Brak filaru {pillar.title}
                </Text>
                <Text style={[styles.modalText, { color: colors.textMuted }]}>
                  Instrument {instrument.symbol} trafia automatycznie do filaru{" "}
                  {pillar.title}, którego nie ma jeszcze w portfelu{" "}
                  {activePortfolio?.name ?? ""}.
                </Text>
                <Text style={[styles.modalText, { color: colors.textMuted }]}>
                  Czy chcesz dodać ten filar i kontynuować zakup?
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setTradeModal(null)}
                    disabled={busy}
                    style={[
                      styles.modalAction,
                      {
                        backgroundColor: "transparent",
                        borderColor: colors.textMuted + "55",
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Text style={[styles.modalActionText, { color: colors.textMuted }]}>
                      Anuluj
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmMissingPillar}
                    disabled={busy}
                    style={[styles.modalAction, { backgroundColor: colors.accent }]}
                  >
                    {busy ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.modalActionTextWhite}>Dodaj i kontynuuj</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.modalIcon,
                    {
                      backgroundColor:
                        orderDraft?.type === "BUY"
                          ? colors.positiveGlass
                          : colors.negativeGlass,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      orderDraft?.type === "BUY"
                        ? "arrow-up-outline"
                        : "arrow-down-outline"
                    }
                    size={28}
                    color={
                      orderDraft?.type === "BUY"
                        ? colors.positive
                        : colors.negative
                    }
                  />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Potwierdź {orderDraft?.type === "BUY" ? "kupno" : "sprzedaż"}
                </Text>

            <View style={styles.summaryMetaRow}>
              <View style={styles.summaryMetaColumn}>
                <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                  INSTRUMENT
                </Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>
                  {instrument.symbol}
                </Text>
              </View>
              <View style={styles.summaryMetaColumn}>
                <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                  PORTFEL
                </Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>
                  {activePortfolio?.name ?? "-"}
                </Text>
              </View>
            </View>

            {orderDraft?.type === "BUY" ||
            mismatch ? (
              <View style={styles.summaryMetaRow}>
                {orderDraft?.type === "BUY" ? (
                  <View style={styles.summaryMetaColumn}>
                    <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                      FILAR
                    </Text>
                    <Text style={[styles.summaryVal, { color: colors.text }]}>
                      {pillar.title}
                    </Text>
                  </View>
                ) : null}
                {mismatch ? (
                  <View style={styles.summaryMetaColumn}>
                    <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                      PRZEWALUTOWANIE
                    </Text>
                    <Text style={[styles.summaryVal, { color: colors.text }]}>
                      {instrument.currency} → {portfolioCurrency} · {FX_FEE_PERCENT.toLocaleString("pl-PL")}%
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.summaryMetaRow}>
              <View style={styles.summaryMetaColumn}>
                <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                  CENA
                </Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>
                  {formatNativeMoney(orderDraft?.price ?? effectiveInstrumentPrice, instrument.currency)}
                </Text>
              </View>
              <View style={styles.summaryMetaColumn}>
                <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                  WARTOŚĆ
                </Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>
                  {formatNativeMoney(orderDraft?.total ?? totalCost, instrument.currency)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryHighlightRow}>
              <View style={styles.summaryHighlightColumn}>
                <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                  ILOŚĆ
                </Text>
                <Text style={[styles.summaryHighlight, { color: colors.text }]}>
                  {orderDraft?.quantity ?? 0} szt.
                </Text>
              </View>
              <View style={styles.summaryHighlightColumn}>
                <Text style={[styles.summaryKey, { color: colors.textMuted }]}>
                  {orderDraft?.type === "BUY"
                    ? "OBCIĄŻENIE"
                    : "WPŁYW"}
                </Text>
                <Text
                  style={[
                    styles.summaryHighlight,
                    {
                      color:
                        orderDraft?.type === "BUY"
                          ? colors.negative
                          : colors.positive,
                    },
                  ]}
                >
                  {formatNativeMoney(orderDraftNetWallet, portfolioCurrency)}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setTradeModal(null)}
                disabled={busy}
                style={[
                  styles.modalAction,
                  {
                    backgroundColor: "transparent",
                    borderColor: colors.textMuted + "55",
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.modalActionText, { color: colors.textMuted }]}>
                  Odrzuć
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmOrder}
                disabled={busy}
                style={[
                  styles.modalAction,
                  {
                    backgroundColor:
                      orderDraft?.type === "BUY"
                        ? colors.positive
                        : colors.negative,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalActionTextWhite}>Potwierdź</Text>
                )}
              </Pressable>
            </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  fxPreview: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
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
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 8,
  },
  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  modalAction: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalActionTextWhite: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  summaryMetaRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryMetaColumn: {
    flex: 1,
  },
  summaryHighlightRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  summaryHighlightColumn: {
    flex: 1,
  },
  summaryKey: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryHighlight: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
});
