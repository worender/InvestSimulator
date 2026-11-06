import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
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
import { useTheme } from "../../theme";

type SettingsCategoryProps = PropsWithChildren<{
  title: string;
}>;

export function SettingsCategory({ title, children }: SettingsCategoryProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.category}>
      <Text style={[styles.categoryLabel, { color: colors.accent }]}>
        {title}
      </Text>
      <View
        style={[
          styles.group,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderGlass,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

type SettingsNestedProps = PropsWithChildren<{
  expanded: boolean;
}>;

/**
 * Zagnieżdżona, wcięta sekcja ustawień
 */
export function SettingsNested({ expanded, children }: SettingsNestedProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(0);

  useEffect(() => {
    height.value = withTiming(expanded ? contentHeight : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentHeight, expanded, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setContentHeight((current) =>
      Math.abs(current - nextHeight) < 0.5 ? current : nextHeight,
    );
  };

  return (
    <Reanimated.View
      style={[styles.nestedClip, animatedStyle]}
      pointerEvents={expanded ? "auto" : "none"}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
    >
      <View onLayout={handleContentLayout} style={styles.nestedBody}>
        <View style={styles.nestedIndent}>{children}</View>
      </View>
    </Reanimated.View>
  );
}

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  disabled?: boolean;
  danger?: boolean;
};

export function SettingsRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  last = false,
  disabled = false,
  danger = false,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const tint = danger ? colors.negative : colors.accent;
  const content = (
    <>
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>

      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            { color: danger ? colors.negative : colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ?? null}
    </>
  );

  const rowStyle = [
    styles.row,
    {
      borderBottomColor: colors.borderGlass,
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      opacity: disabled ? 0.5 : 1,
    },
  ];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ...rowStyle,
        { backgroundColor: pressed ? colors.surfaceMutedGlass : "transparent" },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  category: {
    marginTop: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 2,
  },
  group: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  nestedClip: {
    overflow: "hidden",
  },
  nestedBody: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  nestedIndent: {
    marginLeft: 26,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 58,
  },
  iconBadge: {
    width: 24,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
});
