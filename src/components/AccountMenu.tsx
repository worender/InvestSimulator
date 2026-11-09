import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { PANEL_HEADER_HEIGHT } from "./PanelHeader";
import { AccountAvatar } from "./settings/AccountAvatar";

type AccountMenuProps = {
  onClose: () => void;
};

type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "default" | "negative";
  last?: boolean;
};

function MenuRow({
  icon,
  label,
  onPress,
  tone = "default",
  last = false,
}: MenuRowProps) {
  const { colors } = useTheme();
  const tint = tone === "negative" ? colors.negative : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.borderGlass,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={19} color={tint} />
      <Text
        style={[
          styles.rowLabel,
          { color: tone === "negative" ? colors.negative : colors.text },
        ]}
      >
        {label}
      </Text>
      {tone === "negative" ? null : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

export function AccountMenu({ onClose }: AccountMenuProps) {
  const { colors, mode, accounts, activeAccount, switchAccount, logout } =
    useTheme();
  const { top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const progress = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const openSettings = (params: {
    section?: string;
    openAccounts?: string;
  }) => {
    router.navigate({ pathname: "/settings", params });
    close();
  };

  const cardWidth = Math.min(width - 40, 320);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: progress },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Zamknij menu konta"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            top: top + PANEL_HEADER_HEIGHT + 6,
            right: 20,
            width: cardWidth,
            backgroundColor:
              mode === "dark"
                ? "rgba(22, 27, 34, 0.98)"
                : "rgba(255, 255, 255, 0.99)",
            borderColor: colors.borderGlass,
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.profile}>
          <AccountAvatar
            uri={activeAccount?.avatar_uri}
            name={activeAccount?.username ?? "Inwestor"}
            size={64}
            accentBorder
          />
          <Text
            numberOfLines={1}
            style={[styles.profileName, { color: colors.text }]}
          >
            {activeAccount?.username ?? "Inwestor"}
          </Text>
        </View>

        <MenuRow
          icon="person-outline"
          label="Dane konta i hasło"
          onPress={() => openSettings({ section: "account" })}
        />

        <View style={styles.sectionLabelWrap}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            KONTA
          </Text>
        </View>

        {accounts.map((account) => {
          const isActive = account.id === activeAccount?.id;
          return (
            <Pressable
              key={account.id}
              onPress={() => {
                if (!isActive) void switchAccount(account.id);
                close();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.accountRow,
                {
                  borderBottomColor: colors.borderGlass,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <AccountAvatar
                uri={account.avatar_uri}
                name={account.username}
                size={30}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.accountName,
                  { color: isActive ? colors.text : colors.textMuted },
                ]}
              >
                {account.username}
              </Text>
              {isActive ? (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.accent}
                />
              ) : null}
            </Pressable>
          );
        })}

        <MenuRow
          icon="add-circle-outline"
          label="Dodaj konto"
          onPress={() => openSettings({ openAccounts: "1" })}
        />

        <MenuRow
          icon="log-out-outline"
          label="Wyloguj"
          tone="negative"
          last
          onPress={() => {
            void logout();
            close();
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.16)",
  },
  card: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 16,
    zIndex: 30,
  },
  profile: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 6,
    textAlign: "center",
  },
  profileMeta: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  portfolioList: {
    alignItems: "center",
    gap: 1,
    marginTop: 2,
  },
  portfolioName: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  sectionLabelWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  accountName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "700",
  },
});
