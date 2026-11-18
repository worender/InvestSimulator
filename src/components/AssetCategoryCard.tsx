import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AssetCategoryKey,
  PortfolioCategory,
} from "../database/mockPortfolioData";
import { useDisplayCurrency } from "../displayCurrency";
import { useTheme } from "../theme";

interface AssetCategoryCardProps {
  category: PortfolioCategory;
  currency: string;
  onPress: () => void;
}

const CATEGORY_ICONS: Record<AssetCategoryKey, keyof typeof Ionicons.glyphMap> =
  {
    stocks: "trending-up-outline",
    bonds: "shield-checkmark-outline",
    cfd: "swap-horizontal-outline",
    crypto: "logo-bitcoin",
    etf: "pie-chart-outline",
    cfd_crypto: "logo-bitcoin",
    etf_funds: "pie-chart-outline",
  };

export function AssetCategoryCard({
  category,
  currency,
  onPress,
}: AssetCategoryCardProps) {
  const { colors } = useTheme();
  const display = useDisplayCurrency();

  const isPositive = category.profitPercent >= 0;
  const arrowColor = isPositive ? colors.positive : colors.negative;
  const arrowName = isPositive ? "arrow-up" : "arrow-down";

  const formatNumber = (num: number, maxDecimals = 2) =>
    Math.abs(num).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });

  const displayedTotal = display.convertForDisplay(
    category.totalValue,
    currency,
  );
  const symbol = display.displaySymbol(currency);
  const sign = isPositive ? "+" : "-";
  const formattedProfitPct = `${sign}${Math.abs(category.profitPercent).toFixed(2)}%`;
  const formattedTotal = `${formatNumber(displayedTotal)} ${symbol}`;

  const iconName = CATEGORY_ICONS[category.id] ?? "cube-outline";

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Kategoria ${category.title}`}
      style={({ pressed }) => [
        styles.cardOuter,
        {
          backgroundColor: colors.background,
          borderColor: category.accentColor + "99",
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.cardClip}>
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: category.accentColor + "25",
                  borderColor: category.accentColor + "45",
                },
              ]}
            >
              <Ionicons
                name={iconName}
                size={16}
                color={category.accentColor}
              />
            </View>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {category.title}
            </Text>
          </View>

          <View style={styles.valuesBlock}>
            <View style={styles.profitPctRow}>
              <Ionicons name={arrowName} size={11} color={arrowColor} />
              <Text style={[styles.profitPct, { color: colors.textMuted }]}>
                {formattedProfitPct}
              </Text>
            </View>
            <Text
              style={[styles.totalAmount, { color: colors.text }]}
              numberOfLines={1}
            >
              {formattedTotal}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: "48%",
    borderRadius: 20,
    borderWidth: 1.2,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardClip: {
    borderRadius: 20,
    overflow: "hidden",
  },
  cardContent: {
    padding: 14,
    justifyContent: "space-between",
    minHeight: 110,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "400",
    flexShrink: 1,
  },
  profitPctRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
  },
  profitPct: {
    fontSize: 12,
    fontWeight: "700",
  },
  valuesBlock: {
    gap: 3,
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
});
