import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Currency } from "../theme";
import { useTheme } from "../theme";
import {
  PORTFOLIO_PILLARS,
  type PortfolioPillarKey,
} from "../portfolio/pillars";
import { SettingsSheet } from "./settings/SettingsSheet";

export interface AddPortfolioInput {
  name: string;
  currency: Currency;
  pillars: PortfolioPillarKey[];
}

interface AddPortfolioSheetProps {
  onClose: () => void;
  onAdd: (input: AddPortfolioInput) => void;
}

const CURRENCIES: Currency[] = ["PLN", "EUR", "USD"];

export function AddPortfolioSheet({ onClose, onAdd }: AddPortfolioSheetProps) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("PLN");
  const [pillars, setPillars] = useState<PortfolioPillarKey[]>([]);

  const togglePillar = (key: PortfolioPillarKey) => {
    setPillars((current) =>
      current.includes(key)
        ? current.filter((pillar) => pillar !== key)
        : [...current, key],
    );
  };

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onAdd({
      name: trimmedName,
      currency,
      pillars,
    });
  };

  const canSubmit = name.trim().length > 0;

  return (
    <SettingsSheet
      title={name.trim() || "Nowy portfel"}
      subtitle="UTWÓRZ PORTFEL"
      height="auto"
      onClose={onClose}
    >
      <Text style={[styles.label, { color: colors.textMuted }]}>NAZWA</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="np. Portfel emerytalny"
        placeholderTextColor={colors.textMuted}
        maxLength={40}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderWidth: 0,
          },
        ]}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>WALUTA</Text>
      <View style={styles.currencyRow}>
        {CURRENCIES.map((option) => {
          const selected = currency === option;
          return (
            <Pressable
              key={option}
              onPress={() => setCurrency(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.currencyOption,
                {
                  borderColor: selected ? colors.accent : "transparent",
                  backgroundColor: selected
                    ? colors.accentGlass
                    : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyText,
                  { color: selected ? colors.accent : colors.text },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>
        FILARY PORTFELA
      </Text>
      <View style={styles.pillarsGrid}>
        {PORTFOLIO_PILLARS.map((pillar) => {
          const selected = pillars.includes(pillar.key);
          return (
            <Pressable
              key={pillar.key}
              onPress={() => togglePillar(pillar.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.pillarOption,
                {
                  borderColor: selected ? colors.accent : "transparent",
                  backgroundColor: selected
                    ? colors.accentGlass
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name={pillar.icon}
                size={16}
                color={selected ? colors.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.pillarText,
                  { color: selected ? colors.accent : colors.text },
                ]}
              >
                {pillar.title}
              </Text>
              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color={colors.accent}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={submit}
        disabled={!canSubmit}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.submit,
          {
            backgroundColor: colors.accent,
            opacity: !canSubmit ? 0.45 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={styles.submitText}>Dodaj portfel</Text>
      </Pressable>
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  currencyRow: { flexDirection: "row", gap: 8 },
  currencyOption: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyText: { fontSize: 13, fontWeight: "700" },
  pillarsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pillarOption: {
    width: "48%",
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  pillarText: { flex: 1, fontSize: 12, fontWeight: "700" },
  submit: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  submitText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
