/**
 * Podstawowe elementy ekranu ustawień: kategoria, sekcja zagnieżdżona i wiersz.
 *
 * @module src/components/settings/SettingsPrimitives
 */

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

/**
 * Właściwości {@link SettingsCategory}.
 * @inline
 */
type SettingsCategoryProps = PropsWithChildren<{
  /** Nagłówek kategorii. */
  title: string;
}>;

/**
 * Kategoria ustawień: nagłówek i zawartość (wiersze).
 *
 * @param props Właściwości komponentu.
 */
export function SettingsCategory({ title, children }: SettingsCategoryProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.category}>
      <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Właściwości {@link SettingsNested}.
 * @inline
 */
type SettingsNestedProps = PropsWithChildren<{
  /** Czy sekcja jest rozwinięta (animowana wysokość). */
  expanded: boolean;
}>;

/**
 * Zagnieżdżona, wcięta sekcja ustawień, rozwijana z animacją
 * (np. kategorie powiadomień pod głównym przełącznikiem).
 *
 * @param props Właściwości komponentu.
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

/**
 * Właściwości {@link SettingsRow}.
 * @inline
 */
type SettingsRowProps = {
  /** Ikona Ionicons. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Tytuł. */
  title: string;
  /** Opis pod tytułem. */
  subtitle?: string;
  /** Element po prawej (np. przełącznik lub wartość). */
  right?: ReactNode;
  /** Akcja po naciśnięciu; brak — wiersz nie jest klikalny. */
  onPress?: () => void;
  /** Ostatni wiersz — bez linii oddzielającej. */
  last?: boolean;
  /** Wyłączony (wyszarzony, bez reakcji). */
  disabled?: boolean;
  /** Akcja niebezpieczna — kolor czerwony. */
  danger?: boolean;
};

/**
 * Wiersz ustawień: ikona, tytuł, opcjonalny opis i element po prawej.
 *
 * @param props Właściwości komponentu.
 */
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

  const baseOpacity = disabled ? 0.5 : 1;
  const rowStyle = [
    styles.row,
    {
      borderBottomColor: colors.borderGlass,
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      opacity: baseOpacity,
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
        styles.row,
        {
          borderBottomColor: colors.borderGlass,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.65 : baseOpacity,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  category: {
    marginTop: 24,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 12,
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
    marginLeft: 36,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    minHeight: 58,
  },
  iconBadge: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
