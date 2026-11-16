import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import type { CustomAccentColor } from "../../database/database";
import { MAX_CUSTOM_ACCENTS } from "../../settings/color";
import {
  ACCENT_PRESETS,
  accentSwatchColor,
  resolveAccentColor,
  type ThemeAccent,
  useTheme,
} from "../../theme";

type AccentColorPickerProps = {
  accent: ThemeAccent;
  customAccents: CustomAccentColor[];
  onChange: (accent: ThemeAccent) => void;
  onAddCustom: () => void;
  onEditCustom: (custom: CustomAccentColor) => void;
};

export function AccentColorPicker({
  accent,
  customAccents,
  onChange,
  onAddCustom,
  onEditCustom,
}: AccentColorPickerProps) {
  const { colors, mode } = useTheme();
  const canAddCustom = customAccents.length < MAX_CUSTOM_ACCENTS;

  return (
    <View style={styles.wrap}>
      {ACCENT_PRESETS.map((preset) => {
        const selected = accent === preset.key;
        return (
          <Pressable
            key={preset.key}
            onPress={() => onChange(preset.key)}
            accessibilityRole="button"
            accessibilityLabel={`Kolor akcentu: ${preset.label}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.swatchHit,
              { opacity: pressed ? 0.68 : 1 },
            ]}
          >
            <View
              style={[
                styles.swatchRing,
                {
                  borderColor: selected ? colors.text : "transparent",
                },
              ]}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: accentSwatchColor(preset, mode),
                  },
                ]}
              />
            </View>
          </Pressable>
        );
      })}

      {customAccents.map((custom) => {
        const selected = accent.toUpperCase() === custom.color.toUpperCase();
        return (
          <View key={custom.id} style={styles.customItem}>
            <Pressable
              onPress={() => onChange(custom.color)}
              accessibilityRole="button"
              accessibilityLabel={`Własny kolor akcentu: ${custom.color}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.swatchHit,
                { opacity: pressed ? 0.68 : 1 },
              ]}
            >
              <View
                style={[
                  styles.swatchRing,
                  {
                    borderColor: selected ? colors.text : "transparent",
                  },
                ]}
              >
                <View
                  style={[styles.swatch, { backgroundColor: custom.color }]}
                />
              </View>
            </Pressable>

            <Pressable
              onPress={() => onEditCustom(custom)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Edytuj własny kolor: ${custom.color}`}
              style={({ pressed }) => [
                styles.editBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="pencil" size={10} color={colors.text} />
            </Pressable>
          </View>
        );
      })}

      {canAddCustom ? (
        <Pressable
          onPress={onAddCustom}
          accessibilityRole="button"
          accessibilityLabel="Dodaj własny kolor akcentu"
          style={({ pressed }) => [
            styles.swatchHit,
            { opacity: pressed ? 0.68 : 1 },
          ]}
        >
          <View
            style={[
              styles.addSwatch,
              {
                borderColor: colors.accent,
                backgroundColor: colors.accentGlass,
              },
            ]}
          >
            <Ionicons name="add" size={19} color={colors.accent} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export function accentPreviewColor(
  accent: ThemeAccent,
  mode: "dark" | "light",
): string {
  return resolveAccentColor(accent, mode);
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  swatchHit: { paddingVertical: 2 },
  customItem: { position: "relative" },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
