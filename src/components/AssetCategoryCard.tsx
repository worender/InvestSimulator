import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AssetCategoryKey,
  PortfolioCategory,
} from "../database/mockPortfolioData";
import {
  convertForDisplay,
  displaySymbol,
} from "../displayCurrency";
import { useTheme } from "../theme";
import { GlassBackground } from "./GlassBackground";

interface AssetCategoryCardProps {
  category: PortfolioCategory;
  currency: string;
  onPress: () => void;
}

const CATEGORY_ICONS: Record<AssetCategoryKey, keyof typeof Ionicons.glyphMap> =
  {
    stocks: "trending-up-outline",
    bonds: "shield-checkmark-outline",
    cfd_crypto: "logo-bitcoin",
    etf_funds: "pie-chart-outline",
  };

export function AssetCategoryCard({
  category,
  currency,
  onPress,
}: AssetCategoryCardProps) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  const isPositive = category.profitCurrency >= 0;
  const arrowColor = isPositive ? "#10b981" : "#ef4444";
  const arrowName = isPositive ? "arrow-up" : "arrow-down";

  const formatNumber = (num: number, maxDecimals = 2) =>
    Math.abs(num).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });

  const sign = isPositive ? "+" : "-";
  const displayedProfit = convertForDisplay(category.profitCurrency, currency);
  const displayedTotal = convertForDisplay(category.totalValue, currency);
  const symbol = displaySymbol(currency);
  const formattedProfitVal = `${sign}${formatNumber(displayedProfit)} ${symbol}`;
  const formattedProfitPct = `${sign}${Math.abs(category.profitPercent).toFixed(2)}%`;
  const formattedTotal = `${formatNumber(displayedTotal)} ${symbol}`;

  const pastelBg = isDark ? category.pastelBgDark : category.pastelBgLight;
  const iconName = CATEGORY_ICONS[category.id] ?? "cube-outline";

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Kategoria ${category.title}`}
      style={({ pressed }) => [
        styles.cardOuter,
        // Na Androidzie cień potrzebuje tła, inaczej ignoruje zaokrąglone rogi i rysuje prostokąt
        Platform.OS === "android" && { backgroundColor: colors.surface },
        {
          borderColor: category.accentColor + "55",
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.cardClip}>
        {/* Efekt Liquid Glass z pastelowym rozmyciem */}
        <GlassBackground intensity={isDark ? 40 : 55} tintColor={pastelBg} />

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
            <Text
              style={[styles.totalAmount, { color: colors.text }]}
              numberOfLines={1}
            >
              {formattedTotal}
            </Text>

            <View style={styles.profitRow}>
              <Ionicons name={arrowName} size={14} color={arrowColor} />
              <Text
                style={[styles.profitAmount, { color: colors.text }]}
                numberOfLines={1}
              >
                {formattedProfitVal}
              </Text>
              <Text style={[styles.profitPct, { color: colors.textMuted }]}>
                ({formattedProfitPct})
              </Text>
            </View>
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
  valuesBlock: {
    gap: 3,
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  profitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexWrap: "nowrap",
  },
  profitAmount: {
    fontSize: 12,
    fontWeight: "400",
  },
  profitPct: {
    fontSize: 11,
    fontWeight: "400",
  },
});
