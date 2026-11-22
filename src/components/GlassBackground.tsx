/**
 * Wspólne tło „liquid glass”.
 *
 * @module src/components/GlassBackground
 */

import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../theme";

/**
 * Właściwości {@link GlassBackground}.
 * @inline
 */
type GlassBackgroundProps = {
  /** Siła rozmycia (domyślnie 45; na Androidzie nieużywana). */
  intensity?: number;
  /** Opcjonalny kolor nakładki barwiącej. */
  tintColor?: string;
  /** Krycie nakładki; domyślnie 0.78 w trybie ciemnym i 0.65 w jasnym. */
  tintOpacity?: number;
};

/**
 * Wspólne tło "liquid glass" dla kafelków.
 *
 * Wypełnia rodzica (`absoluteFill`) i nie przechwytuje dotyku. Na iOS i webie
 * rysuje `BlurView` z `expo-blur`, a na Androidzie (gdzie rozmycie jest
 * kosztowne) półprzezroczyste tło `surfaceGlass` z motywu. Rodzic powinien
 * mieć `overflow: "hidden"`, żeby zachować zaokrąglone rogi.
 *
 * @param props Właściwości komponentu.
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
