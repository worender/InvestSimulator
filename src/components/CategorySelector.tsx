import Ionicons from "@expo/vector-icons/Ionicons";
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme";

export type CategoryOption<T extends string> = {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap | null;
};

export type CategorySelectorProps<T extends string> = {
  options: readonly CategoryOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  accessibilityLabel?: string;
};

const DEFAULT_CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  watchlist: "star-outline",
  obserwowane: "star-outline",
  pl: "flag-outline",
  polska: "flag-outline",
  world: "globe-outline",
  liderzy: "globe-outline",
  cfd: "swap-vertical-outline",
  crypto: "logo-bitcoin",
  krypto: "logo-bitcoin",
  gainers: "trending-up-outline",
  zyskujące: "trending-up-outline",
  active: "flame-outline",
  najaktywniejsze: "flame-outline",
  zaskakujące: "flash-outline",
  technology: "hardware-chip-outline",
  bigtech: "hardware-chip-outline",
  currencies: "cash-outline",
  waluty: "cash-outline",
  details: "information-circle-outline",
  szczegóły: "information-circle-outline",
  trade: "swap-horizontal-outline",
  handel: "swap-horizontal-outline",
  all: "apps-outline",
  wszystko: "apps-outline",
  stocks: "bar-chart-outline",
  akcje: "bar-chart-outline",
  etf: "pie-chart-outline",
  funds: "briefcase-outline",
  bonds: "document-text-outline",
  obligacje: "document-text-outline",
  news: "newspaper-outline",
  wiadomości: "newspaper-outline",
  settings: "settings-outline",
  ustawienia: "settings-outline",
};

export function resolveCategoryIcon<T extends string>(
  option: CategoryOption<T>,
): keyof typeof Ionicons.glyphMap | null {
  if (option.icon !== undefined) {
    return option.icon;
  }
  const keyStr = String(option.key).trim().toLowerCase();
  const labelStr = option.label.trim().toLowerCase();

  // Brak ikon dla kategorii zaczynających się od cyfr (np. "1M", "3M", "5Y")
  if (/^\d/i.test(keyStr) || /^\d/i.test(labelStr)) {
    return null;
  }

  if (DEFAULT_CATEGORY_ICONS[keyStr]) {
    return DEFAULT_CATEGORY_ICONS[keyStr];
  }
  if (DEFAULT_CATEGORY_ICONS[labelStr]) {
    return DEFAULT_CATEGORY_ICONS[labelStr];
  }
  for (const [matchKey, iconName] of Object.entries(DEFAULT_CATEGORY_ICONS)) {
    if (keyStr.includes(matchKey) || labelStr.includes(matchKey)) {
      return iconName;
    }
  }
  return "shapes-outline";
}

const COLLAPSED_WIDTH = 38;
const HORIZONTAL_PADDING = 14;

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type CategoryItemProps<T extends string> = {
  option: CategoryOption<T>;
  isSelected: boolean;
  onSelect: (key: T) => void;
  onItemLayout?: (key: string, event: LayoutChangeEvent) => void;
  colors: ReturnType<typeof useTheme>["colors"];
};

function CategoryItem<T extends string>({
  option,
  isSelected,
  onSelect,
  onItemLayout,
  colors,
}: CategoryItemProps<T>) {
  const iconName = resolveCategoryIcon(option);
  const hasIcon = iconName !== null;

  const initialEstimatedWidth = Math.max(
    COLLAPSED_WIDTH,
    Math.ceil(option.label.length * 8.5) + HORIZONTAL_PADDING * 2,
  );

  const [measuredTextWidth, setMeasuredTextWidth] = useState<number | null>(
    null,
  );
  const expandedWidthShared = useSharedValue(initialEstimatedWidth);
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    if (measuredTextWidth !== null) {
      expandedWidthShared.value = Math.max(
        COLLAPSED_WIDTH,
        measuredTextWidth + HORIZONTAL_PADDING * 2,
      );
    }
  }, [measuredTextWidth, expandedWidthShared]);

  useEffect(() => {
    progress.value = withTiming(isSelected ? 1 : 0, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isSelected, progress]);

  const containerAnimStyle = useAnimatedStyle(() => {
    const width = hasIcon
      ? interpolate(
          progress.value,
          [0, 1],
          [COLLAPSED_WIDTH, expandedWidthShared.value],
          Extrapolation.CLAMP,
        )
      : expandedWidthShared.value;

    return {
      width,
    };
  });

  const bubbleAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const iconAnimStyle = useAnimatedStyle(() => {
    if (!hasIcon) {
      return { opacity: 0, transform: [{ scale: 0 }] };
    }
    const opacity = interpolate(
      progress.value,
      [0, 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      progress.value,
      [0, 0.45],
      [1, 0.55],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const textAnimStyle = useAnimatedStyle(() => {
    if (!hasIcon) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }],
      };
    }

    const opacity = interpolate(
      progress.value,
      [0.35, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      progress.value,
      [0.35, 1],
      [0.85, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const textColorStyle = useAnimatedStyle(() => {
    if (!hasIcon) {
      const color = interpolateColor(
        progress.value,
        [0, 1],
        [colors.textMuted, colors.accent],
      );
      return { color };
    }
    return { color: colors.accent };
  });

  const onTextLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    if (w > 0) {
      setMeasuredTextWidth(w);
    }
  }, []);

  return (
    <AnimatedPressable
      onPress={() => onSelect(option.key)}
      onLayout={(e) => onItemLayout?.(option.key, e)}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={option.label}
      style={[styles.itemBubble, containerAnimStyle]}
    >
      <Reanimated.View
        style={[
          StyleSheet.absoluteFill,
          styles.bubbleHighlight,
          {
            backgroundColor: colors.accentGlass,
            borderColor: colors.borderGlass,
          },
          bubbleAnimStyle,
        ]}
        pointerEvents="none"
      />

      <View
        style={styles.hiddenMeasurer}
        pointerEvents="none"
        onLayout={onTextLayout}
      >
        <Text style={styles.label} numberOfLines={1}>
          {option.label}
        </Text>
      </View>

      {hasIcon ? (
        <Reanimated.View
          style={[styles.iconWrap, iconAnimStyle]}
          pointerEvents="none"
        >
          <Ionicons name={iconName} size={18} color={colors.textMuted} />
        </Reanimated.View>
      ) : null}

      <Reanimated.View
        style={[styles.textWrap, textAnimStyle]}
        pointerEvents="none"
      >
        <Reanimated.Text
          numberOfLines={1}
          style={[styles.label, textColorStyle]}
        >
          {option.label}
        </Reanimated.Text>
      </Reanimated.View>
    </AnimatedPressable>
  );
}

export function CategorySelector<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: CategorySelectorProps<T>) {
  const { colors } = useTheme();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const itemCoords = useRef<Record<string, { x: number; width: number }>>({});

  // Domyślnie pierwszy klucz jest wybrany
  const defaultKey = options[0]?.key;
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultKey);

  const activeKey = useMemo(() => {
    const candidate = value !== undefined ? value : internalValue;
    const exists = options.some((opt) => opt.key === candidate);
    return exists ? (candidate as T) : (options[0]?.key as T);
  }, [value, internalValue, options]);

  const handleSelect = useCallback(
    (key: T) => {
      setInternalValue(key);
      if (onChange && key !== value) {
        onChange(key);
      }
    },
    [onChange, value],
  );

  const onItemLayout = useCallback((key: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    itemCoords.current[key] = { x, width };
  }, []);

  useEffect(() => {
    if (!activeKey) return;
    const coord = itemCoords.current[activeKey];
    if (coord && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: Math.max(0, coord.x - 24),
        animated: true,
      });
    }
  }, [activeKey]);

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.surfaceMutedGlass,
          borderColor: colors.borderGlass,
        },
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.track}
        style={styles.scrollView}
      >
        {options.map((option) => (
          <CategoryItem
            key={option.key}
            option={option}
            isSelected={option.key === activeKey}
            onSelect={handleSelect}
            onItemLayout={onItemLayout}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  scrollView: {
    flexGrow: 0,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    padding: 3,
    gap: 4,
  },
  itemBubble: {
    height: 34,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  bubbleHighlight: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  hiddenMeasurer: {
    position: "absolute",
    opacity: 0,
    zIndex: -99,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
