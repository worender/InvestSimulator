import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import {
  ACCENT_PRESETS,
  accentSwatchColor,
  resolveAccentColor,
  type ThemeAccent,
  useTheme,
} from "../../theme";

type AccentColorPickerProps = {
  accent: ThemeAccent;
  onChange: (accent: ThemeAccent) => void;
  onAddCustom: () => void;
};

const RAINBOW = [
  "#ff3b30",
  "#ff9500",
  "#ffcc00",
  "#34c759",
  "#007aff",
  "#af52de",
];

function RainbowDot({ size = 30 }: { size?: number }) {
  return (
    <View
      style={[
        styles.rainbow,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {RAINBOW.map((color) => (
        <View key={color} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </View>
  );
}

export function AccentColorPicker({
  accent,
  onChange,
  onAddCustom,
}: AccentColorPickerProps) {
  const { colors, mode } = useTheme();
  const isCustom = /^#[0-9a-f]{6}$/i.test(accent);
  const customColor = isCustom ? accent : null;

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
              {preset.rainbow ? (
                <RainbowDot />
              ) : (
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: accentSwatchColor(preset, mode),
                    },
                  ]}
                />
              )}
            </View>
          </Pressable>
        );
      })}

      {customColor ? (
        <Pressable
          onPress={() => onChange(customColor)}
          accessibilityRole="button"
          accessibilityLabel="Własny kolor akcentu"
          accessibilityState={{ selected: accent === customColor }}
          style={({ pressed }) => [
            styles.swatchHit,
            { opacity: pressed ? 0.68 : 1 },
          ]}
        >
          <View
            style={[
              styles.swatchRing,
              {
                borderColor:
                  accent === customColor ? colors.text : "transparent",
              },
            ]}
          >
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: customColor,
                },
              ]}
            />
          </View>
        </Pressable>
      ) : null}

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
    </View>
  );
}

export function RainbowPreview() {
  return <RainbowDot size={22} />;
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
  rainbow: {
    flexDirection: "row",
    overflow: "hidden",
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
