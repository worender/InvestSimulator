import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationVisibility } from '../../navigationVisibility';
import { useTheme } from '../../theme';

// Stałe określające dostępne zakładki w aplikacji
const TAB_ROUTES = ['index', 'market', 'portfolio', 'about', 'settings'] as const;

// Komponent obsługujący układ zakładek w aplikacji, z możliwością przełączania między nimi gestami przesuwania
export default function TabLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { setVisible } = useNavigationVisibility();

  const currentTab = useMemo(() => {
    if (pathname === '/' || pathname === '/index') return 'index';
    if (pathname.includes('market')) return 'market';
    if (pathname.includes('portfolio')) return 'portfolio';
    if (pathname.includes('about')) return 'about';
    if (pathname.includes('settings')) return 'settings';
    return 'index';
  }, [pathname]);

  // Każda zmiana zakładki startuje z widocznym navbar'em
  useEffect(() => {
    setVisible(true);
  }, [pathname, setVisible]);

  const currentIndex = TAB_ROUTES.indexOf(currentTab as (typeof TAB_ROUTES)[number]);
  const swipeThreshold = Math.min(Math.max(width * 0.2, 64), 128);

  // Pełnoekranowy suwak między zakładkami (zamiast dotychczasowego braku animacji).
  const sceneStyleInterpolator = useMemo(
    () =>
      ({ current }: { current: { progress: Animated.Value } }) => ({
        sceneStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-width, 0, width],
              }),
            },
          ],
        },
      }),
    [width],
  );

  const transitionSpec = useMemo(
    () => ({
      animation: 'timing' as const,
      config: { duration: 260, easing: Easing.out(Easing.cubic) },
    }),
    [],
  );

  // PanResponder do obsługi gestów przesuwania między zakładkami swipe'owych
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 22 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.6;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (currentIndex === -1) return;
          const dir = gestureState.dx < 0 ? 'next' : 'prev';
          const targetIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
          const targetExists = targetIndex >= 0 && targetIndex < TAB_ROUTES.length;
          const passedThreshold =
            Math.abs(gestureState.dx) >= swipeThreshold ||
            (Math.abs(gestureState.dx) > 24 && Math.abs(gestureState.vx) > 0.45);

          if (targetExists && passedThreshold) {
            const nextRoute = TAB_ROUTES[targetIndex];
            router.navigate(nextRoute === 'index' ? '/' : `/${nextRoute}`);
          }
        },
      }),
    [currentIndex, router, swipeThreshold],
  );

  return (
    <View style={styles.tabLayoutRoot} {...panResponder.panHandlers}>
      <Tabs
        backBehavior="history"
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          sceneStyle: { backgroundColor: colors.background },
          animation: 'shift',
          sceneStyleInterpolator,
          transitionSpec,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Start',
            headerTitle: 'Panel inwestora',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="market"
          options={{
            title: 'Rynek',
            headerTitle: 'Rynek giełdowy',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'trending-up' : 'trending-up-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{
            title: 'Portfolio',
            headerTitle: 'Moje portfolio',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: 'Nauka',
            headerTitle: 'O inwestowaniu',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'book' : 'book-outline'} size={21} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ustawienia',
            headerTitle: 'Ustawienia',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={21} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

type FloatingTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};


// Komponent obsługujący pasek zakładek, który jest wyświetlany na dole ekranu i umożliwia przełączanie między zakładkami
function FloatingTabBar({ state, navigation }: FloatingTabBarProps) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { visible } = useNavigationVisibility();
  const [hideProgress] = useState(() => new Animated.Value(0));
  const [selectionX] = useState(() => new Animated.Value(0));
  const [barWidth, setBarWidth] = useState(0);

  // Animacja ukrywania i pokazywania paska zakładek w zależności od stanu widoczności
  useEffect(() => {
    Animated.timing(hideProgress, {
      toValue: visible ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hideProgress, visible]);

  // Animacja przesuwania wskaźnika zakładki w zależności od aktualnie wybranej zakładki
  useEffect(() => {
    if (barWidth > 0 && state.routes.length > 0) {
      const singleItemWidth = (barWidth - 12) / state.routes.length;
      Animated.spring(selectionX, {
        toValue: singleItemWidth * state.index,
        useNativeDriver: true,
        damping: 18,
        stiffness: 190,
      }).start();
    }
  }, [barWidth, selectionX, state.index, state.routes.length]);

  const handleBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const itemWidth = barWidth > 0 ? (barWidth - 12) / state.routes.length : 0;

  return (
    <View style={[styles.wrapper, { bottom: Math.max(Math.ceil(bottom / 2), 4) }]}>
      <Animated.View
        onLayout={handleBarLayout}
        style={[
          styles.bar,
          {
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.borderGlass,
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
                width: itemWidth,
                borderColor: colors.accent,
                backgroundColor: colors.accentGlass,
                transform: [{ translateX: selectionX }],
              },
            ]}
          />
        )}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: focused ? 'analytics' : 'analytics-outline',
            market: focused ? 'trending-up' : 'trending-up-outline',
            portfolio: focused ? 'briefcase' : 'briefcase-outline',
            about: focused ? 'book' : 'book-outline',
            settings: focused ? 'settings' : 'settings-outline',
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => navigation.navigate(route.name)}
              style={styles.item}
            >
              <Ionicons
                name={icons[route.name] || 'ellipse-outline'}
                size={22}
                color={focused ? colors.accent : colors.textMuted}
              />
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

// Stylesheet dla komponentu TabLayout i FloatingTabBar
const styles = StyleSheet.create({
  tabLayoutRoot: {
    flex: 1,
  },
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  bar: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    position: 'relative',
    zIndex: 2,
  },
  selection: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 6,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 22,
    zIndex: 1,
  },
  hiddenBar: {
    width: 86,
    height: 5,
    borderRadius: 5,
    position: 'absolute',
    bottom: -6,
  },
});
