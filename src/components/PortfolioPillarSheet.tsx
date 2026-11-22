import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  PORTFOLIO_PILLARS,
  type PortfolioPillarKey,
} from "../portfolio/pillars";
import { useTheme } from "../theme";
import { SettingsSheet } from "./settings/SettingsSheet";

export type { PortfolioPillarKey };
export { PORTFOLIO_PILLARS };

interface PortfolioPillarSheetProps {
  selectedKeys: PortfolioPillarKey[];
  onClose: () => void;
  onSelect: (key: PortfolioPillarKey) => void;
}

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
