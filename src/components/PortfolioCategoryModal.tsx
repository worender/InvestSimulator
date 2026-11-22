import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  type Portfolio,
  type PortfolioAssetItem,
  type PortfolioCategory,
  type TransactionHistoryItem,
} from "../portfolio/types";
import { useDisplayCurrency } from "../displayCurrency";
import { useTheme } from "../theme";
import { SettingsSheet } from "./settings/SettingsSheet";

interface PortfolioCategoryModalProps {
  portfolio: Portfolio;
  category: PortfolioCategory;
  onClose: () => void;
  onOpenAsset: (asset: PortfolioAssetItem) => void;
}

/**
 * Formatuje liczbę do postaci z określoną liczbą miejsc po przecinku i lokalizacją "pl-PL".
 * @param value Liczba do sformatowania.
 * @param decimals Liczba miejsc po przecinku (domyślnie 2).
 * @returns Sformatowany ciąg znaków reprezentujący liczbę.
 */
function formatNumber(value: number, decimals = 2) {
  return Math.abs(value).toLocaleString("pl-PL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Komponent wyświetlający pojedynczą metrykę w wierszu.
 * @param label Etykieta metryki.
 * @param value Wartość metryki.
 * @param subValue Opcjonalna dodatkowa wartość metryki.
 * @param align Wyrównanie metryki ("left", "center" lub "right").
 * @param profit Opcjonalna wartość zysku/straty, która wpływa na kolor tekstu.
 * @returns JSX.Element reprezentujący metrykę.
 */
function Metric({
  label,
  value,
  subValue,
  align,
  profit,
}: {
  label: string;
  value: string;
  subValue?: string;
  align: "left" | "center" | "right";
  profit?: number;
}) {
  const { colors } = useTheme();
  const profitColor =
    profit === undefined
      ? colors.text
      : profit > 0
        ? colors.positive
        : profit < 0
          ? colors.negative
          : colors.textMuted;

  return (
    <View style={[styles.metric, styles[`${align}Metric`]]}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: profitColor }]}>{value}</Text>
      {subValue && (
        <Text style={[styles.metricSubValue, { color: profitColor }]}>
          {subValue}
        </Text>
      )}
    </View>
  );
}

/**
 * Komponent wyświetlający historię transakcji zakupu dla danego instrumentu.
 * @param transaction Obiekt reprezentujący pojedynczą transakcję zakupu.
 * @param currentPrice Aktualna cena instrumentu.
 * @param currency Waluta, w której wyrażona jest cena.
 * @param formatCurrency Funkcja formatująca wartość liczbową do postaci walutowej.
 * @returns JSX.Element reprezentujący wiersz historii transakcji.
 */
function PurchaseHistoryRow({
  transaction,
  currentPrice,
  currency,
  formatCurrency,
}: {
  transaction: TransactionHistoryItem;
  currentPrice: number;
  currency: string;
  formatCurrency: (value: number, sourceCurrency: string) => string;
}) {
  const { colors } = useTheme();
  const currentValue = transaction.quantity * currentPrice;
  const profit = currentValue - transaction.total;
  const profitPercent =
    transaction.total > 0 ? (profit / transaction.total) * 100 : 0;

  return (
    <View style={[styles.historyRow, { borderTopColor: colors.borderGlass }]}>
      <Metric
        align="left"
        label={transaction.date}
        value={`${formatNumber(transaction.quantity, transaction.quantity < 1 ? 3 : 2)}`}
        subValue={`@ ${formatCurrency(transaction.price, currency)}`}
      />
      <Metric
        align="center"
        label="Obecna wartość"
        value={formatCurrency(currentValue, currency)}
        subValue={`Zakup: ${formatCurrency(transaction.total, currency)}`}
      />
      <Metric
        align="right"
        label="Zysk"
        value={formatCurrency(profit, currency)}
        subValue={`${profitPercent >= 0 ? "+" : ""}${profitPercent.toFixed(2)}%`}
        profit={profit}
      />
    </View>
  );
}

/**
 * Komponent wyświetlający modal z informacjami o kategorii portfela.
 * @param portfolio Obiekt reprezentujący portfel użytkownika.
 * @param category Obiekt reprezentujący kategorię portfela.
 * @param onClose Funkcja wywoływana po zamknięciu modalu.
 * @param onOpenAsset Funkcja wywoływana po kliknięciu w instrument, otwierająca szczegóły instrumentu.
 * @returns JSX.Element reprezentujący modal kategorii portfela.
 */
function AssetRow({
  asset,
  showSeparator,
  expanded,
  onToggle,
  onDetails,
  formatCurrency,
}: {
  asset: PortfolioAssetItem;
  showSeparator: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDetails: () => void;
  formatCurrency: (value: number, sourceCurrency: string) => string;
}) {
  const { colors } = useTheme();
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(0);
  const rotation = useSharedValue(expanded ? 1 : 0);
  const canExpand = asset.purchaseHistory.length > 1;

  useEffect(() => {
    height.value = withTiming(expanded ? contentHeight : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentHeight, expanded, height]);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotation]);

  const bodyStyle = useAnimatedStyle(() => ({ height: height.value }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setContentHeight((current) =>
      Math.abs(current - nextHeight) < 0.5 ? current : nextHeight,
    );
  };

  return (
    <View
      style={[
        styles.assetRow,
        showSeparator && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderGlass,
        },
      ]}
    >
      <View style={styles.assetHeader}>
        <Pressable
          onPress={canExpand ? onToggle : undefined}
          disabled={!canExpand}
          accessibilityRole={canExpand ? "button" : undefined}
          accessibilityState={canExpand ? { expanded } : undefined}
          style={({ pressed }) => [
            styles.assetIdentity,
            canExpand && pressed && { opacity: 0.62 },
          ]}
        >
          <View style={styles.assetTitleRow}>
            <Text style={[styles.assetSymbol, { color: colors.text }]}>
              {asset.symbol}
            </Text>
            <Text style={[styles.assetType, { color: colors.textMuted }]}>
              {asset.exchange}
            </Text>
            {canExpand && (
              <Reanimated.View style={chevronStyle}>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={colors.textMuted}
                />
              </Reanimated.View>
            )}
          </View>
          <Text
            style={[styles.assetFullName, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {asset.name}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDetails}
          accessibilityRole="button"
          accessibilityLabel={`Pokaż szczegóły ${asset.name}`}
          hitSlop={8}
          style={({ pressed }) => [
            styles.detailsButton,
            {
              opacity: pressed ? 0.62 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {!expanded && (
        <View style={styles.metricsRow}>
          <Metric
            align="left"
            label="Ilość / cena"
            value={`${formatNumber(asset.ownedQuantity, asset.ownedQuantity < 1 ? 3 : 2)}`}
            subValue={`@ ${formatCurrency(asset.averageBuyPrice, asset.currency)}`}
          />
          <Metric
            align="center"
            label="Wartość zakupu"
            value={formatCurrency(
              asset.ownedQuantity * asset.averageBuyPrice,
              asset.currency,
            )}
          />
          <Metric
            align="right"
            label="Zysk"
            value={formatCurrency(asset.profitCurrency, asset.currency)}
            subValue={`${asset.profitPercent >= 0 ? "+" : ""}${asset.profitPercent.toFixed(2)}%`}
            profit={asset.profitCurrency}
          />
        </View>
      )}

      {canExpand && (
        <Reanimated.View
          style={[styles.historyClip, bodyStyle]}
          pointerEvents={expanded ? "auto" : "none"}
          accessibilityElementsHidden={!expanded}
          importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
        >
          <View onLayout={handleLayout} style={styles.historyBody}>
            {asset.purchaseHistory.map((transaction) => (
              <PurchaseHistoryRow
                key={transaction.id}
                transaction={transaction}
                currentPrice={asset.currentPrice}
                currency={asset.currency}
                formatCurrency={formatCurrency}
              />
            ))}
          </View>
        </Reanimated.View>
      )}
    </View>
  );
}

export function PortfolioCategoryModal({
  portfolio,
  category,
  onClose,
  onOpenAsset,
}: PortfolioCategoryModalProps) {
  const { colors } = useTheme();
  const display = useDisplayCurrency();
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  const pressInstrument = (asset: PortfolioAssetItem) => {
    onOpenAsset(asset);
  };

  const formatCurrency = (value: number, sourceCurrency: string) => {
    const converted = display.convertForDisplay(value, sourceCurrency);
    const symbol = display.displaySymbol(sourceCurrency);
    return `${converted.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`;
  };

  const investedValue = Math.max(
    0,
    category.totalValue - category.profitCurrency,
  );

  return (
    <SettingsSheet
      title={category.title}
      onClose={onClose}
      height="91%"
      contentBottomPadding={0}
      contentHorizontalPadding={0}
    >
      <View
        style={[styles.summaryRow, { borderBottomColor: colors.borderGlass }]}
      >
        <View>
          <Text style={[styles.investedLabel, { color: colors.textMuted }]}>
            Wartość filaru
          </Text>
          <Text style={[styles.investedValue, { color: colors.text }]}>
            {formatCurrency(investedValue, portfolio.currency)}
          </Text>
        </View>
        <View style={styles.headerProfit}>
          <Text
            style={[
              styles.investedLabel,
              {
                color:
                  category.profitCurrency > 0
                    ? colors.positive
                    : category.profitCurrency < 0
                      ? colors.negative
                      : colors.textMuted,
              },
            ]}
          >
            {category.profitPercent >= 0 ? "+" : ""}
            {category.profitPercent.toFixed(2)}%
          </Text>
          <View style={styles.headerProfitRow}>
            <Text
              style={[
                styles.headerProfitValue,
                {
                  color:
                    category.profitCurrency > 0
                      ? colors.positive
                      : category.profitCurrency < 0
                        ? colors.negative
                        : colors.textMuted,
                },
              ]}
            >
              {formatCurrency(category.profitCurrency, portfolio.currency)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.listContent}>
        {category.items.length > 0 ? (
          category.items.map((asset, index) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              showSeparator={index > 0}
              expanded={expandedAssetId === asset.id}
              onToggle={() =>
                setExpandedAssetId((current) =>
                  current === asset.id ? null : asset.id,
                )
              }
              onDetails={() => pressInstrument(asset)}
              formatCurrency={formatCurrency}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="albums-outline"
              size={28}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Brak instrumentów w tej kategorii.
            </Text>
          </View>
        )}
      </View>
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  investedLabel: { fontSize: 12, fontWeight: "600" },
  investedValue: { fontSize: 26, fontWeight: "700", marginTop: 2 },
  headerProfit: { alignItems: "flex-end" },
  headerProfitRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  headerProfitValue: { fontSize: 22, fontWeight: "700" },
  listContent: { paddingBottom: 24 },
  assetRow: {
    paddingHorizontal: 16,
  },
  assetHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 12,
  },
  assetIdentity: { flex: 1, paddingRight: 8 },
  assetTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  assetSymbol: { fontSize: 15, fontWeight: "700" },
  assetType: { fontSize: 11, marginTop: 2 },
  assetFullName: { fontSize: 11, marginTop: 3 },
  detailsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    paddingBottom: 12,
  },
  metric: { flex: 1 },
  leftMetric: { alignItems: "flex-start" },
  centerMetric: { alignItems: "center" },
  rightMetric: { alignItems: "flex-end" },
  metricLabel: { fontSize: 10, marginBottom: 3 },
  metricValue: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  metricSubValue: { fontSize: 10, marginTop: 2, textAlign: "center" },
  historyClip: { overflow: "hidden" },
  historyBody: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  historyRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { marginTop: 8, fontSize: 13 },
});
