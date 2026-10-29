import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { StockFinancialData } from '../api/marketService';
import { useTheme } from '../theme';
import { InstrumentDetails, useInstrumentFinancialData } from './InstrumentDetails';
import { StockCandleChart } from './StockCandleChart';

interface ModalChartViewProps {
  instrument: {
    stock: string;
    title: string;
    currency: string;
    symbol: string;
    exchange: string;
    financialData?: StockFinancialData;
  };
  financialData?: StockFinancialData;
  onClose: () => void;
}

// Komponent wyświetlający widok wykresu w formie modala
export function ModalChartView({ instrument, financialData: propFinancialData, onClose }: ModalChartViewProps) {
  const theme = useTheme();
  const { financialData, loading } = useInstrumentFinancialData(instrument, propFinancialData);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favScale] = useState(() => new Animated.Value(1));
  
  // Przeciąganie i animacja modala
  const { height: windowHeight } = useWindowDimensions();
  // Wartość przesunięcia arkusza w dół
  const translateY = useSharedValue(windowHeight);
  // Pozycja arkusza w chwili rozpoczęcia gestu
  const dragStart = useSharedValue(0);
  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Próg przesunięcia, po którym modal zostanie zamknięty
  const closeThreshold = Math.max(windowHeight * 0.12, 96);

  // Wyjazd arkusza poza ekran - używany przez gest, tło i przycisk zamknięcia
  const animateClose = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(
      windowHeight,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [finishClose, translateY, windowHeight]);

  // Animacja wejścia
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [translateY]);

  const createDragGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .onStart(() => {
          // Przerwanie animacji wejścia
          cancelAnimation(translateY);
          dragStart.value = translateY.value;
        })
        .onUpdate((event) => {
          const dy = event.translationY;
          const offset = dy > 0 ? dy : Math.max(dy * 0.15, -14);
          translateY.value = Math.max(dragStart.value + offset, -14);
        })
        .onEnd((event) => {
          const shouldClose =
            translateY.value > closeThreshold || (event.translationY > 32 && event.velocityY > 800);

          if (shouldClose) {
            const remaining = Math.max(windowHeight - translateY.value, 0);
            const duration = Math.min(Math.max(remaining * 0.35, 120), 260);
            translateY.value = withTiming(
              windowHeight,
              { duration, easing: Easing.out(Easing.cubic) },
              (finished) => {
                'worklet';
                if (finished) {
                  runOnJS(finishClose)();
                }
              },
            );
          } else {
            translateY.value = withSpring(0, {
              damping: 24,
              stiffness: 240,
              mass: 0.9,
              overshootClamping: true,
            });
          }
        }),
    [closeThreshold, finishClose, translateY, dragStart, windowHeight],
  );

  const dragGesture = useMemo(() => createDragGesture(), [createDragGesture]);
  const headerDragGesture = useMemo(() => createDragGesture(), [createDragGesture]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, Math.max(windowHeight * 0.5, 1)],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: interpolate(translateY.value, [0, 80], [1, 1.35], Extrapolation.CLAMP) },
    ],
    backgroundColor: interpolateColor(
      translateY.value,
      [0, 50],
      [theme.colors.border, theme.colors.accent],
    ),
  }));

  const toggleFavorite = () => {
    Animated.sequence([
      Animated.timing(favScale, { toValue: 1.2, duration: 70, useNativeDriver: true }),
      Animated.spring(favScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    setIsFavorite((prev) => !prev);
  };

  // Stylesheet dla komponentu ModalChartView (widok wykresu w formie modala)
  const styles = useMemo(() => ({
    gestureRoot: {
      flex: 1,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end' as const,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    sheet: {
      height: '91%' as const,
      maxHeight: '91%' as const,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderGlass,
      overflow: 'hidden' as const,
    },
    dragArea: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingTop: 10,
      paddingBottom: 10,
    },
    dragHandle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
    },
    header: {
      paddingBottom: 8,
      paddingHorizontal: theme.spacing.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    side: {
      width: 40,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    sideRight: {
      justifyContent: 'flex-end' as const,
    },
    center: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headerTitle: {
      maxWidth: '100%' as const,
      fontSize: 18,
      fontWeight: '700' as const,
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    headerSubtitle: {
      fontSize: theme.fontSize.xs,
      fontWeight: '700' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
    },
    chartContainer: {
      paddingTop: theme.spacing.sm,
    },
  }), [theme]);

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      onRequestClose={animateClose}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.modalRoot}>
          <Reanimated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
            <Pressable
              style={styles.backdrop}
              onPress={animateClose}
              accessibilityLabel="Zamknij okno modalne"
            />
          </Reanimated.View>

          <Reanimated.View style={[styles.sheet, sheetAnimatedStyle]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.borderGlass }]}>
              {/* Górna belka */}
              <GestureDetector gesture={dragGesture}>
                <View
                  style={styles.dragArea}
                  accessibilityHint="Przeciągnij w dół, aby zamknąć okno"
                >
                  <Reanimated.View style={[styles.dragHandle, handleAnimatedStyle]} />
                </View>
              </GestureDetector>

              <View style={styles.headerRow}>
                {/* Lewy skrót: polubienie */}
                <View style={styles.side}>
                  <Pressable
                    onPress={toggleFavorite}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorite ? 'Usuń z polubionych' : 'Dodaj do polubionych'}
                  >
                    <Animated.View style={{ transform: [{ scale: favScale }] }}>
                      <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isFavorite ? theme.colors.negative : theme.colors.textMuted}
                      />
                    </Animated.View>
                  </Pressable>
                </View>

                <GestureDetector gesture={headerDragGesture}>
                  <View style={styles.center}>
                    <Text
                      accessibilityRole="header"
                      numberOfLines={1}
                      style={styles.headerTitle}
                    >
                      {instrument.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.headerSubtitle}>
                      {instrument.stock} · {instrument.exchange}
                    </Text>
                  </View>
                </GestureDetector>

                {/* Prawy skrót: zamknięcie */}
                <View style={[styles.side, styles.sideRight]}>
                  <Pressable
                    onPress={animateClose}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Zamknij"
                  >
                    <Ionicons name="close" size={22} color={theme.colors.accent} />
                  </Pressable>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
              <View style={styles.chartContainer}>
                <StockCandleChart
                  stock={instrument.stock}
                  title={instrument.title}
                  currency={financialData?.currency ?? instrument.currency}
                  exchange={instrument.exchange}
                  variant="embedded"
                />
              </View>

              <InstrumentDetails financialData={financialData} loading={loading} />
            </ScrollView>
          </Reanimated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
