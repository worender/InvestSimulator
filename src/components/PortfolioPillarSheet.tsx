import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AssetCategoryKey } from "../database/mockPortfolioData";
import { useTheme } from "../theme";
import { SettingsSheet } from "./settings/SettingsSheet";

export type PortfolioPillarKey = "stocks" | "bonds" | "cfd" | "crypto" | "etf";

interface PortfolioPillarSheetProps {
  selectedKeys: PortfolioPillarKey[];
  onClose: () => void;
  onSelect: (key: PortfolioPillarKey) => void;
}

interface PillarOption {
  key: PortfolioPillarKey;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  pastelLight: string;
  pastelDark: string;
}

export const PORTFOLIO_PILLARS: PillarOption[] = [
  {
    key: "stocks",
    title: "Akcje",
    description: "Udziały w spółkach notowanych na giełdach.",
    icon: "trending-up-outline",
    color: "#3b82f6",
    pastelLight: "rgba(219, 234, 254, 0.75)",
    pastelDark: "rgba(30, 58, 138, 0.40)",
  },
  {
    key: "bonds",
    title: "Obligacje",
    description: "Papiery dłużne emitowane przez państwa i firmy.",
    icon: "shield-checkmark-outline",
    color: "#f59e0b",
    pastelLight: "rgba(254, 243, 199, 0.75)",
    pastelDark: "rgba(146, 64, 14, 0.35)",
  },
  {
    key: "cfd",
    title: "CFD",
    description: "Kontrakty na różnicę kursu instrumentów bazowych.",
    icon: "swap-horizontal-outline",
    color: "#8b5cf6",
    pastelLight: "rgba(237, 233, 254, 0.80)",
    pastelDark: "rgba(91, 33, 182, 0.38)",
  },
  {
    key: "crypto",
    title: "Krypto",
    description: "Cyfrowe aktywa oparte na technologii blockchain.",
    icon: "logo-bitcoin",
    color: "#f97316",
    pastelLight: "rgba(255, 237, 213, 0.80)",
    pastelDark: "rgba(194, 65, 12, 0.38)",
  },
  {
    key: "etf",
    title: "ETF",
    description: "Fundusze ETF odwzorowujące indeksy i koszyki aktywów.",
    icon: "pie-chart-outline",
    color: "#10b981",
    pastelLight: "rgba(209, 250, 229, 0.75)",
    pastelDark: "rgba(6, 78, 59, 0.40)",
  },
];

export function PortfolioPillarSheet({
  selectedKeys,
  onClose,
  onSelect,
}: PortfolioPillarSheetProps) {
  const { colors } = useTheme();

  return (
    <SettingsSheet
      title="Dodaj filar portfela"
      subtitle="KATEGORIA AKTYWÓW"
      height="78%"
      onClose={onClose}
    >
      <View style={styles.list}>
        {PORTFOLIO_PILLARS.map((option) => {
          const selected = selectedKeys.includes(option.key);
          return (
            <Pressable
              key={option.key}
              onPress={() => onSelect(option.key)}
              disabled={selected}
              accessibilityRole="button"
              accessibilityLabel={`${option.title}${selected ? ", już dodano" : ""}`}
              accessibilityState={{ disabled: selected, selected }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: colors.background,
                  borderColor: option.color + "99",
                  opacity: selected ? 0.45 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: option.color + "25",
                    borderColor: option.color + "55",
                  },
                ]}
              >
                <Ionicons name={option.icon} size={20} color={option.color} />
              </View>

              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {option.title}
                </Text>
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {option.description}
                </Text>
                <Text style={[styles.autoText, { color: colors.textMuted }]}>
                  Instrumenty trafiają do tego filaru automatycznie.
                </Text>
              </View>

              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={option.color}
                />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </SettingsSheet>
  );
}

export function pillarKeyToAssetCategoryKey(
  key: PortfolioPillarKey,
): AssetCategoryKey {
  return key;
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  description: { fontSize: 12, lineHeight: 17 },
  autoText: { fontSize: 11, lineHeight: 16, marginTop: 4, fontWeight: "600" },
});
