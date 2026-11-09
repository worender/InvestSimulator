import Ionicons from "@expo/vector-icons/Ionicons";
import { type ComponentRef, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme";

type CategoryOption<T extends string> = {
  key: T;
  label: string;
};

type CategorySelectorProps<T extends string> = {
  options: readonly CategoryOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function CategorySelector<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: CategorySelectorProps<T>) {
  const { colors, mode } = useTheme();
  const pillRef = useRef<ComponentRef<typeof View>>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const progress = useState(() => new Animated.Value(0))[0];

  const [activeSlots, setActiveSlots] = useState<{
    first: T;
    second: T | null;
  }>(() => {
    const valIndex = options.findIndex((o) => o.key === value);
    const first = valIndex > 1 ? value : (options[0]?.key ?? value);
    const second =
      options.length >= 2
        ? valIndex > 1
          ? options[0].key
          : (options[1]?.key ?? null)
        : null;
    return { first, second };
  });

  const [prevValue, setPrevValue] = useState(value);
  const [prevOptions, setPrevOptions] = useState(options);

  if (prevValue !== value || prevOptions !== options) {
    setPrevValue(value);
    setPrevOptions(options);

    const keys = options.map((o) => o.key);
    let nextFirst = activeSlots.first;
    let nextSecond = activeSlots.second;

    if (!keys.includes(nextFirst)) {
      nextFirst = keys[0] ?? value;
    }
    if (value !== nextFirst && value !== nextSecond) {
      nextFirst = value;
    }

    if (keys.length >= 2) {
      if (
        !nextSecond ||
        !keys.includes(nextSecond) ||
        nextSecond === nextFirst
      ) {
        nextSecond = keys.find((k) => k !== nextFirst) ?? keys[1] ?? null;
      }
    } else {
      nextSecond = null;
    }

    setActiveSlots({ first: nextFirst, second: nextSecond });
  }

  if (options.length === 0) {
    return null;
  }

  const firstOption =
    options.find((o) => o.key === activeSlots.first) ?? options[0];
  const secondOption = activeSlots.second
    ? (options.find((o) => o.key === activeSlots.second) ?? null)
    : null;
  const hasMoreOptions = options.length > 2;

  const firstActive = firstOption.key === value;
  const secondActive = secondOption ? secondOption.key === value : false;

  const openMenu = () => {
    pillRef.current?.measureInWindow((x, y, pillWidth, pillHeight) => {
      const windowWidth = Dimensions.get("window").width;
      const windowHeight = Dimensions.get("window").height;

      const measuredWidth = pillWidth && pillWidth > 0 ? pillWidth : 200;
      const cardWidth = Math.min(
        windowWidth - 32,
        Math.max(190, measuredWidth),
      );

      let left = typeof x === "number" ? x : 16;
      if (left + cardWidth > windowWidth - 16) {
        left = windowWidth - cardWidth - 16;
      }
      if (left < 16) left = 16;

      const estimatedHeight = Math.min(options.length * 44 + 40, 300);
      const measuredY = typeof y === "number" ? y : 100;
      const measuredHeight = pillHeight && pillHeight > 0 ? pillHeight : 34;

      let top = measuredY + measuredHeight + 6;
      if (top + estimatedHeight > windowHeight - 20) {
        top = Math.max(20, measuredY - estimatedHeight - 6);
      }

      setCoords({ top, left, width: cardWidth });
      setIsMenuOpen(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const closeMenu = (onFinished?: () => void) => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMenuOpen(false);
        onFinished?.();
      }
    });
  };

  const handleSelectOption = (key: T) => {
    closeMenu(() => {
      if (key !== value) {
        onChange(key);
      }

      // Zamiana miejscami w activeSlots, jeśli wybrana opcja nie jest już w pierwszej ani drugiej pozycji
      if (key !== activeSlots.first && key !== activeSlots.second) {
        setActiveSlots((prev) => ({
          first: key,
          second: prev.first,
        }));
      }
    });
  };

  const chevronRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <>
      <View
        ref={pillRef}
        collapsable={false}
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
        <View style={styles.track}>
          {/* Pozycja 1 */}
          <Pressable
            onPress={() => onChange(firstOption.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: firstActive }}
            style={({ pressed }) => [
              styles.option,
              firstActive && { backgroundColor: colors.accentGlass },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: firstActive ? colors.accent : colors.textMuted },
              ]}
            >
              {firstOption.label}
            </Text>
          </Pressable>

          {/* Pozycja 2 */}
          {secondOption ? (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.borderGlass },
                ]}
              />
              <Pressable
                onPress={() => onChange(secondOption.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: secondActive }}
                style={({ pressed }) => [
                  styles.option,
                  secondActive && { backgroundColor: colors.accentGlass },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { color: secondActive ? colors.accent : colors.textMuted },
                  ]}
                >
                  {secondOption.label}
                </Text>
              </Pressable>
            </>
          ) : null}

          {hasMoreOptions ? (
            <View style={styles.chevronWrap}>
              <Pressable
                onPress={isMenuOpen ? () => closeMenu() : openMenu}
                accessibilityRole="button"
                accessibilityLabel="Pokaż wszystkie kategorie"
                accessibilityState={{ expanded: isMenuOpen }}
                style={({ pressed }) => [
                  styles.chevronButton,
                  isMenuOpen && { backgroundColor: colors.accentGlass },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [{ rotate: chevronRotate }],
                  }}
                >
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={isMenuOpen ? colors.accent : colors.textMuted}
                  />
                </Animated.View>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {isMenuOpen && coords ? (
        <Modal
          visible={isMenuOpen}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => closeMenu()}
        >
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
                onPress={() => closeMenu()}
                accessibilityLabel="Zamknij listę kategorii"
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                {
                  top: coords.top,
                  left: coords.left,
                  width: coords.width,
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
                        outputRange: [-8, 0],
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
              {accessibilityLabel ? (
                <View style={styles.sectionLabelWrap}>
                  <Text
                    style={[styles.sectionLabel, { color: colors.textMuted }]}
                  >
                    {accessibilityLabel.toUpperCase()}
                  </Text>
                </View>
              ) : null}

              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                style={styles.cardScroll}
                contentContainerStyle={styles.cardScrollContent}
              >
                {options.map((option, index) => {
                  const isActive = option.key === value;
                  const isLast = index === options.length - 1;

                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => handleSelectOption(option.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      style={({ pressed }) => [
                        styles.dropdownRow,
                        {
                          borderBottomColor: colors.borderGlass,
                          borderBottomWidth: isLast
                            ? 0
                            : StyleSheet.hairlineWidth,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.dropdownRowLabel,
                          { color: isActive ? colors.text : colors.textMuted },
                          isActive && styles.dropdownRowLabelActive,
                        ]}
                      >
                        {option.label}
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
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </>
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
  track: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    marginHorizontal: 7,
  },
  option: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  chevronWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  chevronButton: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
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
    zIndex: 9999,
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
  cardScroll: {
    maxHeight: 280,
  },
  cardScrollContent: {
    paddingVertical: 2,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownRowLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownRowLabelActive: {
    fontWeight: "700",
  },
});
