import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDisplayCurrency } from "../displayCurrency";
import { useTheme } from "../theme";
import { Skeleton } from "./Skeleton";

type InstrumentRowProps = {
  symbol: string;
  name: string;
  exchangeName?: string;
  price?: number;
  changePercent?: number;
  currency?: string;
  onPress: () => void;
  divider?: boolean;
  loading?: boolean;
  secondary?: ReactNode;
};

export function InstrumentRow({
  symbol,
  name,
  exchangeName,
  price,
  changePercent,
  currency,
  onPress,
  divider = true,
  loading = false,
  secondary,
}: InstrumentRowProps) {
  const { colors } = useTheme();
  const display = useDisplayCurrency();
  const hasPrice = price !== undefined && price !== null;
  const isPositive = (changePercent ?? 0) >= 0;
  const priceLabel = hasPrice
    ? `${display.convertForDisplay(price, currency).toLocaleString("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${display.displaySymbol(currency)}`
    : "";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        divider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderGlass,
        },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.meta}>
        <View style={styles.symbolRow}>
          <Text style={[styles.symbol, { color: colors.text }]}>
            {symbol.replace(/\.PA$/, "")}
          </Text>
          {exchangeName ? (
            <Text style={[styles.exchange, { color: colors.textMuted }]}>
              · {exchangeName}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.name, { color: colors.textMuted }]} numberOfLines={1}>
          {name}
        </Text>
        {secondary}
      </View>

      <View style={styles.right}>
        {loading ? (
          <Skeleton width={72} height={16} />
        ) : hasPrice ? (
          <>
            <Text style={[styles.price, { color: colors.text }]}>{priceLabel}</Text>
            <Text
              style={[
                styles.change,
                { color: isPositive ? colors.positive : colors.negative },
              ]}
            >
              {isPositive ? "+" : ""}
              {(changePercent ?? 0).toFixed(2)}%
            </Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  meta: {
    flex: 1,
    paddingRight: 14,
  },
  symbolRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  symbol: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  exchange: {
    fontSize: 11,
    fontWeight: "600",
  },
  name: {
    fontSize: 12,
    marginTop: 3,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
  },
  change: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
});
