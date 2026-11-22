import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  currencySymbol,
  formatAmountInput,
  FX_FEE_PERCENT,
  parseAmountInput,
} from "../currency";
import type { Currency } from "../theme";
import { useTheme } from "../theme";
import { SettingsSheet } from "./settings/SettingsSheet";

type CashOperation = "deposit" | "withdraw" | "transfer";

interface CashPortfolio {
  id: string;
  name: string;
  currency: string;
  cashBalance: number;
}

interface PortfolioCashSheetProps {
  portfolioId: string;
  portfolioName: string;
  portfolioCurrency: string;
  cashBalance: number;
  portfolios: CashPortfolio[];
  onClose: () => void;
  onConfirm: (input: {
    operation: CashOperation;
    amount: number;
    sourceCurrency: Currency;
    targetPortfolioId?: string;
    targetAmount?: number;
  }) => Promise<boolean>;
}

const CURRENCIES: Currency[] = ["PLN", "EUR", "USD"];

export function PortfolioCashSheet({
  portfolioId,
  portfolioName,
  portfolioCurrency,
  cashBalance,
  portfolios,
  onClose,
  onConfirm,
}: PortfolioCashSheetProps) {
  const { colors, mode, rates } = useTheme();
  const [operation, setOperation] = useState<CashOperation>("deposit");
  const [amount, setAmount] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState<Currency>("PLN");
  const [targetPortfolioId, setTargetPortfolioId] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const numericAmount = parseAmountInput(amount);
  const activeCurrency = portfolioCurrency.toUpperCase() as Currency;
  const effectiveSourceCurrency =
    operation === "transfer" ? activeCurrency : sourceCurrency;
  const targetPortfolio = portfolios.find(
    (portfolio) => portfolio.id === targetPortfolioId,
  );
  const targetCurrency =
    operation === "transfer"
      ? ((targetPortfolio?.currency || activeCurrency).toUpperCase() as Currency)
      : activeCurrency;

  const calculated = useMemo(() => {
    const sourceRate = rates[effectiveSourceCurrency] || 1;
    const targetRate = rates[targetCurrency] || 1;
    const converted = numericAmount * sourceRate / targetRate;
    const feeFactor = effectiveSourceCurrency === targetCurrency
      ? 1
      : 1 - FX_FEE_PERCENT / 100;
    return {
      converted,
      net: converted * feeFactor,
      feeFactor,
    };
  }, [effectiveSourceCurrency, numericAmount, rates, targetCurrency]);

  const sourceRate = rates[effectiveSourceCurrency] || 1;
  const activeRate = rates[activeCurrency] || 1;
  const availableInSourceCurrency =
    (cashBalance * activeRate) / sourceRate;

  const hasEnoughFunds =
    operation === "deposit" ||
    numericAmount <= availableInSourceCurrency + 0.000001;
  const hasTransferTarget =
    operation !== "transfer" || Boolean(targetPortfolio);
  const canContinue =
    numericAmount > 0 && hasEnoughFunds && hasTransferTarget;

  const format = (value: number, currency: Currency) =>
    `${value.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currencySymbol(currency)}`;

  const confirmOperation = async () => {
    if (busy) return;
    setBusy(true);
    const succeeded = await onConfirm({
      operation,
      amount:
        operation === "deposit"
          ? calculated.net
          : operation === "withdraw"
            ? (numericAmount * sourceRate) / activeRate
            : (numericAmount * sourceRate) / activeRate,
      sourceCurrency: effectiveSourceCurrency,
      targetPortfolioId:
        operation === "transfer" ? targetPortfolioId : undefined,
      targetAmount:
        operation === "transfer" ? calculated.net : undefined,
    });
    setBusy(false);
    return succeeded;
  };

  const openConfirmation = () => {
    setConfirmationOpen(true);
  };

  const mismatch = effectiveSourceCurrency !== targetCurrency;

  const operationOptions: {
    key: CashOperation;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "deposit", label: "Wpłata", icon: "arrow-down-outline" },
    { key: "withdraw", label: "Wypłata", icon: "arrow-up-outline" },
    { key: "transfer", label: "Transfer", icon: "swap-horizontal-outline" },
  ];

  return (
    <>
      <SettingsSheet
        title="Środki portfela"
        subtitle={portfolioName}
        height="auto"
        onClose={onClose}
      >
        <View style={styles.segment}>
          {operationOptions.map((option) => {
            const selected = operation === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setOperation(option.key)}
                style={[
                  styles.segmentOption,
                  {
                    borderColor: selected ? colors.accent : "transparent",
                    backgroundColor: selected
                      ? colors.accentGlass
                      : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={selected ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.segmentText,
                    { color: selected ? colors.accent : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {operation === "transfer" ? (
          <View style={styles.transferSection}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Możliwi odbiorcy
            </Text>
            <View style={styles.transferTargets}>
            {portfolios
              .filter((portfolio) => portfolio.id !== portfolioId)
              .map((portfolio) => {
                const selected = targetPortfolioId === portfolio.id;
                return (
                  <Pressable
                    key={portfolio.id}
                    onPress={() => setTargetPortfolioId(portfolio.id)}
                    style={[
                      styles.targetOption,
                      {
                        borderColor: selected ? colors.accent : "transparent",
                        backgroundColor: selected
                          ? colors.accentGlass
                          : "transparent",
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.targetName,
                          { color: selected ? colors.accent : colors.text },
                        ]}
                      >
                        {portfolio.name}
                      </Text>
                    </View>
                    <Text style={[styles.targetCurrency, { color: colors.textMuted }]}>
                      {portfolio.currency}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.amountRow}>
          <View style={styles.amountValue}>
            <TextInput
              value={amount}
              onChangeText={(value) => setAmount(formatAmountInput(value))}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.amountInput,
                {
                  color: colors.text,
                  backgroundColor: "transparent",
                },
              ]}
            />
            <Text
              style={[
                styles.amountCurrency,
                { color: amount ? colors.text : colors.textMuted },
              ]}
            >
              {currencySymbol(effectiveSourceCurrency)}
            </Text>
          </View>
        </View>

        {operation !== "deposit" ? (
          <Text style={[styles.available, { color: colors.textMuted }]}>
            Dostępne: {format(availableInSourceCurrency, effectiveSourceCurrency)}
          </Text>
        ) : null}

        {operation !== "transfer" ? (
          <View style={styles.currencyRow}>
            {CURRENCIES.map((currency) => {
              const selected = sourceCurrency === currency;
              return (
                <Pressable
                  key={currency}
                  onPress={() => setSourceCurrency(currency)}
                  style={[
                    styles.currencyIcon,
                    {
                      backgroundColor: selected ? colors.accent : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyIconText,
                      { color: selected ? "#ffffff" : colors.textMuted },
                    ]}
                  >
                    {currency}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {mismatch && numericAmount > 0 ? (
          <Text style={[styles.fxNote, { color: colors.textMuted }]}>
            {numericAmount.toLocaleString("pl-PL", {
              maximumFractionDigits: 2,
            })} {effectiveSourceCurrency} × {(
              (rates[effectiveSourceCurrency] || 1) /
              (rates[targetCurrency] || 1)
            ).toLocaleString("pl-PL", { maximumFractionDigits: 4 })} × 98,56% ={" "}
            {calculated.net.toLocaleString("pl-PL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} {targetCurrency}
          </Text>
        ) : null}

        {!hasEnoughFunds ? (
          <Text style={[styles.error, { color: colors.negative }]}>
            Niewystarczające środki w aktywnym portfelu.
          </Text>
        ) : null}
        {operation === "transfer" && !hasTransferTarget ? (
          <Text style={[styles.error, { color: colors.negative }]}>
            Wybierz jeden portfel docelowy.
          </Text>
        ) : null}

        <Pressable
          onPress={() => void openConfirmation()}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.submit,
            {
              backgroundColor: colors.accent,
              opacity: !canContinue ? 0.45 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.submitText}>Potwierdź operację</Text>
        </Pressable>
      </SettingsSheet>

      <Modal
        visible={confirmationOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        navigationBarTranslucent
        onRequestClose={() => setConfirmationOpen(false)}
      >
        <View
          style={[
            styles.confirmBackdrop,
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
              styles.confirmCard,
              {
                backgroundColor: colors.surface,
                shadowColor: "#000",
              },
            ]}
          >
            <View style={styles.confirmHeader}>
              <View
                style={[
                  styles.confirmIcon,
                  {
                    backgroundColor:
                      operation === "deposit"
                        ? colors.positiveGlass
                        : colors.accentGlass,
                  },
                ]}
              >
              <Ionicons
                name={
                  operation === "deposit"
                    ? "arrow-down-outline"
                    : operation === "withdraw"
                      ? "arrow-up-outline"
                      : "swap-horizontal-outline"
                }
                size={28}
                color={colors.accent}
              />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.text }]}>
                {operation === "deposit"
                  ? "Potwierdź wpłatę"
                  : operation === "withdraw"
                    ? "Potwierdź wypłatę"
                    : "Potwierdź transfer"}
              </Text>
            </View>

            <View style={styles.confirmMetaRow}>
              <View style={styles.confirmMetaColumn}>
                <Text style={[styles.confirmMetaLabel, { color: colors.textMuted }]}>
                  PORTFEL
                </Text>
                <Text style={[styles.confirmMetaValue, { color: colors.text }]}>
                  {portfolioName}
                </Text>
              </View>
              <View style={styles.confirmMetaColumn}>
                <Text style={[styles.confirmMetaLabel, { color: colors.textMuted }]}>
                  {operation === "transfer" ? "CEL" : "WALUTA"}
                </Text>
                <Text style={[styles.confirmMetaValue, { color: colors.text }]}>
                  {operation === "transfer"
                    ? targetPortfolio?.name ?? "-"
                    : effectiveSourceCurrency}
                </Text>
              </View>
            </View>

            {mismatch ? (
              <View style={styles.confirmMetaRow}>
                <View style={styles.confirmMetaColumn}>
                  <Text style={[styles.confirmMetaLabel, { color: colors.textMuted }]}>
                    PRZEWALUTOWANIE
                  </Text>
                  <Text style={[styles.confirmMetaValue, { color: colors.text }]}>
                    {effectiveSourceCurrency} → {targetCurrency}
                  </Text>
                </View>
                <View style={styles.confirmMetaColumn}>
                  <Text style={[styles.confirmMetaLabel, { color: colors.textMuted }]}>
                    OPŁATA
                  </Text>
                  <Text style={[styles.confirmMetaValue, { color: colors.text }]}>
                    {FX_FEE_PERCENT.toLocaleString("pl-PL")}%
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.confirmResultRow}>
              <View style={styles.confirmResultColumn}>
                <Text style={[styles.confirmMetaLabel, { color: colors.textMuted }]}>
                  {operation === "deposit"
                    ? "WPŁATA"
                    : operation === "withdraw"
                      ? "WYPŁATA"
                      : "KWOTA"}
                </Text>
                <Text style={[styles.confirmAmount, { color: colors.text }]}>
                  {format(numericAmount, effectiveSourceCurrency)}
                </Text>
              </View>
              <View style={styles.confirmResultColumn}>
                <Text style={[styles.confirmMetaLabel, { color: colors.textMuted }]}>
                  {operation === "deposit"
                    ? "WPŁYW"
                    : operation === "withdraw"
                      ? "WYPŁYW"
                      : "NA KONCIE CELU"}
                </Text>
                <Text
                  style={[
                    styles.confirmAmount,
                    {
                      color:
                        operation === "withdraw"
                          ? colors.negative
                          : colors.positive,
                      textAlign: "right",
                    },
                  ]}
                >
                  {operation === "transfer"
                    ? format(calculated.net, targetCurrency)
                    : operation === "deposit"
                      ? format(calculated.net, targetCurrency)
                      : format(numericAmount, effectiveSourceCurrency)}
                </Text>
              </View>
            </View>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setConfirmationOpen(false)}
                style={[
                  styles.confirmAction,
                  {
                    backgroundColor: "transparent",
                    borderColor: colors.textMuted + "55",
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.confirmActionText, { color: colors.textMuted }]}>
                  Odrzuć
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmOperation()}
                disabled={busy}
                style={[
                  styles.confirmAction,
                  {
                    backgroundColor: colors.accent,
                    opacity: busy ? 0.7 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmActionTextWhite}>Potwierdź</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", gap: 6, marginBottom: 18 },
  segmentOption: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  segmentText: { fontSize: 12 },
  transferSection: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11,
    marginBottom: 8,
  },
  transferTargets: { gap: 8 },
  targetOption: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  targetName: { fontSize: 13, fontWeight: "600" },
  targetCurrency: { fontSize: 12 },
  amountRow: {
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  amountValue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  amountInput: {
    height: 72,
    minWidth: 120,
    maxWidth: 220,
    textAlign: "right",
    fontSize: 38,
    fontWeight: "700",
  },
  amountCurrency: {
    fontSize: 38,
    marginLeft: 8,
  },
  currencyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
  },
  currencyIcon: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyIconText: { fontSize: 11, fontWeight: "700" },
  available: { textAlign: "center", fontSize: 11, marginTop: 12, marginBottom: 8 },
  fxNote: {
    textAlign: "center",
    fontSize: 10,
    fontStyle: "italic",
    lineHeight: 15,
    marginTop: 8,
  },
  error: { fontSize: 12, marginTop: 8, textAlign: "center" },
  submit: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  submitText: { color: "#ffffff", fontSize: 14 },
  confirmBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: "center",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  confirmHeader: {
    width: "100%",
    alignItems: "center",
    marginBottom: 18,
  },
  confirmIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  confirmMetaRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  confirmMetaColumn: {
    flex: 1,
  },
  confirmMetaLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  confirmMetaValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  confirmResultRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
    marginBottom: 18,
  },
  confirmResultColumn: {
    flex: 1,
  },
  confirmAmount: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  confirmActions: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  confirmAction: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmActionText: { fontSize: 13, fontWeight: "600" },
  confirmActionTextWhite: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
});
