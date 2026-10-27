import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

type HeaderSearch = {
  open: boolean;
  value: string;
  onChangeText: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
};

type PanelHeaderProps = {
  title: string;
  /** Ikony/skróty po lewej stronie nagłówka. */
  left?: ReactNode;
  /** Ikony/skróty po prawej stronie nagłówka. */
  right?: ReactNode;
  /** Pole wyszukiwania rozwijane w miejscu tytułu. */
  search?: HeaderSearch;
};

const SEARCH_ANIMATION_MS = 180;
const SIDE_WIDTH = 84;

/**
 * Nagłówek panelu z tytułem wyśrodkowanym względem ekranu.
 * Renderowany poza ScrollView, więc zawsze pozostaje przyklejony do góry.
 * Wyszukiwanie rozwija się w miejscu tytułu, a ikony skrótów znikają.
 */
export function PanelHeader({ title, left, right, search }: PanelHeaderProps) {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const inputRef = useRef<TextInputInstance>(null);
  const pressHandledRef = useRef(false);
  const searchOpen = search?.open ?? false;
  const hasValue = (search?.value ?? '').length > 0;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: searchOpen ? 1 : 0,
      duration: SEARCH_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      inputRef.current?.blur();
      return;
    }
    const timeout = setTimeout(() => inputRef.current?.focus(), SEARCH_ANIMATION_MS - 40);
    return () => clearTimeout(timeout);
  }, [searchOpen]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  // Funkcja obsługująca akcję wyszukiwania lub zamykania wyszukiwania
  const runSearchAction = () => {
    if (hasValue) {
      search?.onChangeText('');
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    search?.onClose();
  };

  // Funkcje obsługujące zdarzenia naciśnięcia przycisku wyszukiwania
  const handlePressIn = () => {
    pressHandledRef.current = false;
    runSearchAction();
    pressHandledRef.current = true;
  };
  
  const handlePress = () => {
    if (pressHandledRef.current) {
      pressHandledRef.current = false;
      return;
    }
    runSearchAction();
  };

  // Interpolacje animacji dla tytułu, ikon i pola wyszukiwania
  const titleOpacity = progress.interpolate({
    inputRange: [0, 0.45],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const iconsOpacity = progress.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const searchOpacity = progress.interpolate({
    inputRange: [0.25, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const searchWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(width - 40, 0)],
  });

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          paddingTop: top + 6,
          backgroundColor: colors.background,
          borderBottomColor: colors.borderGlass,
        },
      ]}
    >
      <View style={styles.row}>
        <Animated.View style={[styles.side, { opacity: iconsOpacity }]}>{left}</Animated.View>

        <View style={styles.center}>
          <Animated.View
            pointerEvents="none"
            style={[styles.titleWrap, { opacity: titleOpacity }]}
          >
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.side, styles.sideRight, { opacity: iconsOpacity }]}>
          {right}
        </Animated.View>
      </View>

      <Animated.View
        pointerEvents={searchOpen ? 'box-none' : 'none'}
        style={[styles.searchLayer, { top: top + 6, bottom: 8 }]}
      >
        <Animated.View
          style={[
            styles.search,
            {
              width: searchWidth,
              opacity: searchOpacity,
              borderColor: colors.borderGlass,
              backgroundColor: colors.surfaceMutedGlass,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.accent} />
          <TextInput
            ref={inputRef}
            value={search?.value ?? ''}
            onChangeText={search?.onChangeText}
            placeholder={search?.placeholder ?? 'Szukaj...'}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <Pressable
            onPressIn={handlePressIn}
            onPress={handlePress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hasValue ? 'Wyczyść wyszukiwanie' : 'Zamknij wyszukiwanie'}
          >
            <Ionicons name={hasValue ? 'close-circle' : 'close'} size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// Stylesheet dla komponentu PanelHeader
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: SIDE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  center: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  searchLayer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  search: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 36,
    fontSize: 14,
    paddingVertical: 0,
  },
});
