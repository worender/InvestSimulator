import Ionicons from "@expo/vector-icons/Ionicons";
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
import type { UserProfile } from "../../database/database";
import { useTheme } from "../../theme";
import { AccountAvatar } from "./AccountAvatar";

type AccountSwitcherProps = {
  accounts: UserProfile[];
  activeAccountId?: number;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (account: UserProfile) => void;
  onAdd: () => void;
};

export function AccountSwitcher({
  accounts,
  activeAccountId,
  expanded,
  onToggle,
  onSelect,
  onAdd,
}: AccountSwitcherProps) {
  const { colors } = useTheme();
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(0);
  const rotation = useSharedValue(expanded ? 1 : 0);
  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

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

  if (!activeAccount) return null;

  return (
    <View style={styles.area}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Konto ${activeAccount.username}. Rozwiń listę kont`}
        style={({ pressed }) => [
          styles.accountBox,
          {
            backgroundColor: colors.surface,
            borderColor: expanded ? colors.accent : colors.borderGlass,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <AccountAvatar
          uri={activeAccount.avatar_uri}
          name={activeAccount.username}
          size={48}
          accentBorder={expanded}
        />

        <View style={styles.accountCopy}>
          <Text
            numberOfLines={1}
            style={[styles.accountName, { color: colors.text }]}
          >
            {activeAccount.username}
          </Text>
          <Text style={[styles.accountHint, { color: colors.textMuted }]}>
            Konto aktywne · dotknij, aby zmienić
          </Text>
        </View>

        <Reanimated.View style={chevronAnimatedStyle}>
          <Ionicons name="chevron-down" size={19} color={colors.textMuted} />
        </Reanimated.View>
      </Pressable>

      <Reanimated.View
        style={[styles.dropdownClip, bodyAnimatedStyle]}
        pointerEvents={expanded ? "auto" : "none"}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
      >
        <View onLayout={handleContentLayout} style={styles.dropdownBody}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderGlass,
              },
            ]}
          >
            {accounts.map((account, index) => {
              const isActive = account.id === activeAccount.id;
              return (
                <Pressable
                  key={account.id}
                  onPress={() => onSelect(account)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed }) => [
                    styles.accountRow,
                    {
                      borderBottomColor: colors.borderGlass,
                      borderBottomWidth:
                        index < accounts.length - 1
                          ? StyleSheet.hairlineWidth
                          : 0,
                      opacity: pressed ? 0.68 : 1,
                    },
                  ]}
                >
                  <AccountAvatar
                    uri={account.avatar_uri}
                    name={account.username}
                    size={34}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rowName,
                      { color: isActive ? colors.text : colors.textMuted },
                    ]}
                  >
                    {account.username}
                  </Text>
                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={colors.accent}
                    />
                  ) : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={onAdd}
              accessibilityRole="button"
              accessibilityLabel="Dodaj nowe konto"
              style={({ pressed }) => [
                styles.addRow,
                {
                  borderTopColor: colors.borderGlass,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.68 : 1,
                },
              ]}
            >
              <View style={[styles.addBadge, { borderColor: "#22c55e" }]}>
                <Ionicons name="add" size={19} color="#22c55e" />
              </View>
              <Text style={[styles.addText, { color: colors.text }]}>
                Dodaj nowe konto
              </Text>
            </Pressable>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    width: "100%",
    alignSelf: "center",
    marginTop: 10,
  },
  accountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountCopy: { flex: 1, minWidth: 0 },
  accountName: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  accountHint: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
    letterSpacing: 0.2,
  },
  dropdownClip: {
    overflow: "hidden",
  },
  dropdownBody: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
  },
  dropdown: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
