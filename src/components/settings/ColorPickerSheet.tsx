import { useMemo, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { hexToHsv, hsvToHex, readableTextColor } from "../../settings/color";
import { useTheme } from "../../theme";
import { SettingsSheet } from "./SettingsSheet";

type ColorPickerSheetProps = {
  initialColor: string;
  onClose: () => void;
  onSelect: (color: string) => void;
};

type ColorSliderProps = {
  value: number;
  min: number;
  max: number;
  colors: string[];
  label: string;
  onChange: (value: number) => void;
};

const HUE_STOPS = Array.from({ length: 36 }, (_, index) =>
  hsvToHex((index / 36) * 360, 1, 1),
);

function ColorSlider({
  value,
  min,
  max,
  colors,
  label,
  onChange,
}: ColorSliderProps) {
  const [width, setWidth] = useState(0);
  const progress = Math.min(
    Math.max((value - min) / Math.max(max - min, 1), 0),
    1,
  );

  const updateFromX = (x: number) => {
    if (width <= 0) return;
    const next = min + (Math.min(Math.max(x, 0), width) / width) * (max - min);
    onChange(Math.round(next * 100) / 100);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) =>
          updateFromX(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateFromX(event.nativeEvent.locationX),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, min, max],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.sliderBlock}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View
        {...panResponder.panHandlers}
        onLayout={handleLayout}
        style={styles.sliderTrack}
      >
        {colors.map((color, index) => (
          <View
            key={`${color}-${index}`}
            style={{ flex: 1, backgroundColor: color }}
          />
        ))}
        <View
          pointerEvents="none"
          style={[
            styles.sliderThumb,
            {
              left: `${progress * 100}%`,
              borderColor: colors[Math.round(progress * (colors.length - 1))],
            },
          ]}
        />
      </View>
    </View>
  );
}

export function ColorPickerSheet({
  initialColor,
  onClose,
  onSelect,
}: ColorPickerSheetProps) {
  const { colors } = useTheme();
  const [hsv, setHsv] = useState(() => hexToHsv(initialColor));
  const color = hsvToHex(hsv.h, hsv.s, hsv.v);
  const fullHue = hsvToHex(hsv.h, 1, 1);
  const saturationStops = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) =>
        hsvToHex(hsv.h, index / 23, hsv.v),
      ),
    [hsv.h, hsv.v],
  );
  const valueStops = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) =>
        hsvToHex(hsv.h, hsv.s, index / 23),
      ),
    [hsv.h, hsv.s],
  );

  return (
    <SettingsSheet
      title="Własny kolor akcentu"
      subtitle="Color picker"
      height="78%"
      onClose={onClose}
    >
      <View style={styles.previewBlock}>
        <View
          style={[
            styles.previewCircle,
            { backgroundColor: color, borderColor: colors.borderGlass },
          ]}
        />
        <Text style={[styles.previewHex, { color: colors.text }]}>{color}</Text>
        <Text style={[styles.previewHint, { color: colors.textMuted }]}>
          Przesuń suwaki, aby dobrać odcień.
        </Text>
      </View>

      <ColorSlider
        label={`Odcień · ${Math.round(hsv.h)}°`}
        colors={HUE_STOPS}
        value={hsv.h}
        min={0}
        max={360}
        onChange={(h) => setHsv((current) => ({ ...current, h }))}
      />
      <ColorSlider
        label={`Nasycenie · ${Math.round(hsv.s * 100)}%`}
        colors={saturationStops}
        value={hsv.s * 100}
        min={0}
        max={100}
        onChange={(s) => setHsv((current) => ({ ...current, s: s / 100 }))}
      />
      <ColorSlider
        label={`Jasność · ${Math.round(hsv.v * 100)}%`}
        colors={valueStops}
        value={hsv.v * 100}
        min={0}
        max={100}
        onChange={(v) => setHsv((current) => ({ ...current, v: v / 100 }))}
      />

      <View style={styles.actions}>
        <View
          style={[
            styles.smallPreview,
            {
              backgroundColor: fullHue,
              borderColor: colors.borderGlass,
            },
          ]}
        />
        <Pressable
          onPress={() => onSelect(color)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: color, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <Text style={[styles.addText, { color: readableTextColor(color) }]}>
            Dodaj ten kolor
          </Text>
        </Pressable>
      </View>
    </SettingsSheet>
  );
}

const styles = StyleSheet.create({
  previewBlock: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 18,
  },
  previewCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.2,
    marginBottom: 10,
  },
  previewHex: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.6,
    fontVariant: ["tabular-nums"],
  },
  previewHint: {
    fontSize: 11,
    marginTop: 4,
  },
  sliderBlock: {
    marginBottom: 20,
  },
  sliderLabel: {
    color: "#8b949e",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sliderTrack: {
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    position: "relative",
  },
  sliderThumb: {
    position: "absolute",
    top: 4,
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    borderWidth: 2.5,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  smallPreview: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
  },
  addButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
