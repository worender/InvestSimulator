import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWallet, type Wallet } from '../database/database';
import { useTheme } from '../theme';
import { formatCurrency } from './ModalChartView';

type SidebarTabBarProps = Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigateToTab'> & {
  // Wąska wersja (tablet): same ikony, bez etykiet i salda
  compact?: boolean;
  tabIcon: (routeName: string, focused: boolean) => keyof typeof Ionicons.glyphMap;
};

export const SIDEBAR_WIDTH = 232;
export const SIDEBAR_COMPACT_WIDTH = 72;

// Boczny pasek nawigacji dla szerokich ekranów webowych (wzorowany na xStation)
export function SidebarTabBar({ state, descriptors, navigateToTab, compact = false, tabIcon }: SidebarTabBarProps) {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    let active = true;
    getWallet()
      .then((result) => {
        if (active) setWallet(result);
      })
      .catch((error) => console.error('Nie udało się wczytać portfela:', error));
    return () => {
      active = false;
    };
  }, []);

  return (
    <View
      style={[
        styles.sidebar,
        {
          width: compact ? SIDEBAR_COMPACT_WIDTH : SIDEBAR_WIDTH,
          paddingTop: top + 16,
          paddingBottom: bottom + 16,
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
        },
      ]}
    >
      <View style={[styles.brand, compact && styles.centered]}>
        <View style={[styles.logo, { backgroundColor: colors.accent }]}>
          <Ionicons name="trending-up" size={18} color={colors.background} />
        </View>
        {!compact && <Text style={[styles.brandText, { color: colors.text }]}>InvestSimulator</Text>}
      </View>

      {!compact && (
        <View style={[styles.account, { borderColor: colors.border }]}>
          <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Konto demo</Text>
          <Text style={[styles.accountBalance, { color: colors.text }]}>
            {wallet ? formatCurrency(wallet.balance, wallet.currency) : '—'}
          </Text>
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.items}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const title = descriptors[route.key]?.options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={title}
              accessibilityState={{ selected: focused }}
              onPress={() => navigateToTab(route.key)}
              style={[
                styles.item,
                compact && styles.centered,
                focused && { backgroundColor: colors.accentGlass },
              ]}
            >
              <Ionicons name={tabIcon(route.name, focused)} size={20} color={focused ? colors.accent : colors.textMuted} />
              {!compact && (
                <Text style={[styles.itemText, { color: focused ? colors.text : colors.textMuted }, focused && styles.itemTextActive]}>
                  {title}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: 12,
  },
  centered: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    marginBottom: 20,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
  },
  account: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  accountLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  items: {
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemTextActive: {
    fontWeight: '700',
  },
});
