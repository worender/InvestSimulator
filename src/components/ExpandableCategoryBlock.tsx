/**
 * Rozwijany blok kategorii artykułów.
 *
 * @module src/components/ExpandableCategoryBlock
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme";

/**
 * Właściwości {@link ExpandableCategoryBlock}.
 * @inline
 */
type ExpandableCategoryBlockProps = PropsWithChildren<{
  /** Nazwa kategorii w nagłówku. */
  title: string;
  /** Liczba artykułów dopisywana w nawiasie; brak — niewyświetlana. */
  count?: number;
  /** Czy blok jest rozwinięty (komponent kontrolowany). */
  expanded: boolean;
  /** Wywoływane po naciśnięciu nagłówka. */
  onToggle: () => void;
}>;

/**
 * Kategoria artykułów z animowanym rozwijaniem w dół.
 *
 * Wysokość treści jest mierzona i animowana (280 ms), a strzałka obraca się
 * o 180°. Zwinięta treść nie przyjmuje dotyku i jest ukryta przed czytnikami ekranu.
 *
 * @param props Właściwości komponentu.
 */
export function ExpandableCategoryBlock({
  title,
  count,
  expanded,
  onToggle,
  children,
}: ExpandableCategoryBlockProps) {
  const { colors } = useTheme();
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(0);
  const rotation = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(expanded ? contentHeight : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentHeight, expanded, height]);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotation]);

  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setContentHeight((current) =>
      Math.abs(current - nextHeight) < 0.5 ? current : nextHeight,
    );
  };

  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}${count !== undefined ? `, ${count} artykułów` : ""}`}
        style={({ pressed }) => [
          styles.header,
          { opacity: pressed ? 0.62 : 1 },
        ]}
      >
        <Text
          style={[styles.label, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {title}
          {count !== undefined ? ` (${count})` : ""}
        </Text>

        <Reanimated.View style={chevronAnimatedStyle}>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Reanimated.View>
      </Pressable>

      <Reanimated.View
        style={[styles.bodyClip, bodyAnimatedStyle]}
        pointerEvents={expanded ? "auto" : "none"}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
      >
        <View onLayout={handleContentLayout} style={styles.body}>
          {children}
        </View>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  bodyClip: {
    overflow: "hidden",
  },
  body: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 4,
  },
});
