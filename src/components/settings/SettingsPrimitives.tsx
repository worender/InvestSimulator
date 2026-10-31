import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: danger ? colors.negativeGlass : colors.accentGlass,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={tint} />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 58,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
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
