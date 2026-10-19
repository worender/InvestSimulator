import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationVisibility } from '../../navigationVisibility';
import { useTheme } from '../../theme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rynki',
          headerTitle: 'Rynki',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'trending-up' : 'trending-up-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          headerTitle: 'Moje portfolio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'Nauka',
          headerTitle: 'O inwestowaniu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ustawienia',
          headerTitle: 'Ustawienia',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

type FloatingTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { navigate: (name: string) => void };
};

function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { visible } = useNavigationVisibility();
  const [hideProgress] = useState(() => new Animated.Value(0));
  const [selectionX] = useState(() => new Animated.Value(0));
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    Animated.timing(hideProgress, {
      toValue: visible ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hideProgress, visible]);

  useEffect(() => {
    if (barWidth > 0) {
      Animated.spring(selectionX, {
        toValue: (barWidth - 12) / state.routes.length * state.index,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }).start();
    }
  }, [barWidth, selectionX, state.index, state.routes.length]);

  const handleBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.wrapper, { bottom: Math.max(Math.ceil(bottom / 2), 2) }]}>
      <Animated.View
        onLayout={handleBarLayout}
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: hideProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              { translateY: hideProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 90] }) },
              { scale: hideProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) },
            ],
          },
        ]}
      >
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selection,
              {
                width: (barWidth - 12) / state.routes.length,
                borderColor: colors.accent,
                transform: [{ translateX: selectionX }],
              },
            ]}
          />
        )}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: focused ? 'trending-up' : 'trending-up-outline',
            portfolio: focused ? 'briefcase' : 'briefcase-outline',
            about: focused ? 'book' : 'book-outline',
            settings: focused ? 'settings' : 'settings-outline',
          };
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }}
              onPress={() => navigation.navigate(route.name)} style={styles.item}>
              <Ionicons name={icons[route.name]} size={21} color={focused ? colors.accent : colors.textMuted} />
              <Text style={{ color: focused ? colors.accent : colors.textMuted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
      <Animated.View
        style={[
          styles.hiddenBar,
          {
            backgroundColor: colors.accent,
            opacity: hideProgress,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 32, right: 32, alignItems: 'center', zIndex: 10 },
  bar: { width: '100%', height: 54, borderWidth: 1, borderRadius: 27, paddingHorizontal: 6, paddingVertical: 4, flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', borderRadius: 16 },
  selection: { position: 'absolute', top: 3, left: 6, height: 48, borderWidth: 1.5, borderRadius: 23 },
  hiddenBar: { width: 64, height: 7, borderRadius: 5, position: 'absolute', bottom: -5 },
});
