import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../theme";

type GlassBackgroundProps = {
  intensity?: number;
  tintColor?: string;
  tintOpacity?: number;
};

/**
 * Wspólne tło "liquid glass" dla kafelków
 */
export function GlassBackground({
  intensity = 45,
  tintColor,
  tintOpacity,
}: GlassBackgroundProps) {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";
  const overlayOpacity = tintOpacity ?? (isDark ? 0.78 : 0.65);

  return (
    <>
      {Platform.OS === "android" ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.surfaceGlass },
          ]}
        />
      ) : (
        <BlurView
          pointerEvents="none"
          intensity={intensity}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      {tintColor ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: tintColor, opacity: overlayOpacity },
          ]}
        />
      ) : null}
    </>
  );
}
