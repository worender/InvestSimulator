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

type ExpandableCategoryBlockProps = PropsWithChildren<{
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
}>;

/**
 * Karta kategorii z animowanym rozwijaniem w dół
 */
export function ExpandableCategoryBlock({
  title,
  icon = "newspaper-outline",
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
    <View
      style={[
        styles.block,
        { backgroundColor: colors.surface, borderColor: colors.borderGlass },
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}${count !== undefined ? `, ${count} artykułów` : ""}`}
        style={({ pressed }) => [
          styles.header,
          {
            borderBottomColor: colors.borderGlass,
            borderBottomWidth: expanded ? StyleSheet.hairlineWidth : 0,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>

        {count !== undefined && (
          <View
            style={[styles.countBadge, { backgroundColor: colors.accentGlass }]}
          >
            <Text style={[styles.countText, { color: colors.accent }]}>
              {count}
            </Text>
          </View>
        )}

        <Reanimated.View style={chevronAnimatedStyle}>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
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
  block: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  countBadge: {
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  bodyClip: {
    overflow: "hidden",
  },
  body: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
