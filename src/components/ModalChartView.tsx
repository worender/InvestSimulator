import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
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
import {
  buildFallbackFinancialData,
  enrichFinancialData,
  getStockData,
  StockFinancialData,
} from '../api/marketService';
import { currencySymbol } from '../currency';
import { useLockScreenWhileActive } from '../interactionLock';
import { notify } from '../notificationBus';
import { useTheme } from '../theme';
import { Section } from './Section';
import { Skeleton } from './Skeleton';
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

// Funkcja formatująca wartość pieniężną zgodnie z ustawieniami regionalnymi i symbolem waluty
export const formatCurrency = (value?: number, currencyCode?: string): string => {
  if (value === undefined || currencyCode === undefined) return '-';
  const symbol = currencySymbol(currencyCode);
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
};

// Funkcja formatująca wartość procentową z dwoma miejscami po przecinku
export const formatPercent = (value?: number): string => {
  if (value === undefined) return '-';
  return `${value.toFixed(2)}%`;
};

// Funkcja formatująca wartość liczbową z dwoma miejscami po przecinku
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Funkcja formatująca wartość liczbową z dwoma miejscami po przecinku
export const formatNumber = (value?: number): string => {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString('pl-PL');
};

// Funkcja formatująca wartość stosunku z dwoma miejscami po przecinku
export const formatRatio = (value?: number): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface DataItemProps {
  label: string;
  value: string;
  subValue?: string;
  divider?: boolean;
}

// Komponent wyświetlający pojedynczy wiersz danych finansowych z etykietą, wartością i opcjonalną wartością podrzędną oraz linią podziału
function DataItem({ label, value, subValue, divider = true }: DataItemProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        dataItemStyles.dataRow,
        divider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderGlass,
        },
      ]}
    >
      <Text style={[dataItemStyles.dataLabel, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm }]}>
        {label}
      </Text>
      <View style={dataItemStyles.dataValueContainer}>
        <Text style={[dataItemStyles.dataValue, { color: theme.colors.text, fontSize: theme.fontSize.sm }]}>
          {value}
        </Text>
        {subValue && (
          <Text
            style={[
              dataItemStyles.dataSubValue,
              { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginLeft: theme.spacing.xs },
            ]}
          >
            {subValue}
          </Text>
        )}
      </View>
    </View>
  );
}

// Stylesheet dla komponentu DataItem (pojedynczy wiersz danych finansowych)
const dataItemStyles = StyleSheet.create({
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  dataLabel: {
    flex: 1,
  },
  dataValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dataValue: {
    fontWeight: '500',
  },
  dataSubValue: {},
});

// Komponent wyświetlający widok wykresu w formie modala
export function ModalChartView({ instrument, financialData: propFinancialData, onClose }: ModalChartViewProps) {
  const theme = useTheme();

  // Blokuje gesty ekranu pod spodem (np. swipe między zakładkami), dopóki modal jest otwarty.
  useLockScreenWhileActive(true);

  const [financialData, setFinancialData] = useState<StockFinancialData | null>(
    propFinancialData ?? instrument.financialData ?? null,
  );
  const [loading, setLoading] = useState<boolean>(!propFinancialData && !instrument.financialData);
  const [selectedReturnPeriod, setSelectedReturnPeriod] = useState<'1Y' | '3Y' | '5Y'>('1Y');

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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      let current: StockFinancialData | null | undefined = propFinancialData ?? instrument.financialData;
      if (!current) {
        setLoading(true);
        current = await getStockData(instrument.stock, instrument.exchange);
        if (isMounted && current) {
          setFinancialData(current);
        }
      }
      if (current) {
        const enriched = await enrichFinancialData(current, instrument.stock, instrument.exchange);
        if (isMounted) {
          setFinancialData(enriched);
        }
      } else {
        const fallback = await buildFallbackFinancialData(
          instrument.stock,
          instrument.exchange,
          instrument.currency,
        );
        if (isMounted && fallback) {
          setFinancialData(fallback);
        } else if (isMounted) {
          notify({
            variant: 'error',
            title: 'Brak danych finansowych',
            message: `Nie udało się pobrać danych dla ${instrument.stock}. Wykres pozostaje dostępny.`,
          });
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [instrument.stock, instrument.exchange, instrument.currency, propFinancialData, instrument.financialData]);

  const periodReturn = useMemo(() => {
    if (!financialData) return undefined;
    switch (selectedReturnPeriod) {
      case '1Y':
        return financialData.performance1Y;
      case '3Y':
        return financialData.performance3Y;
      case '5Y':
        return financialData.performance5Y;
    }
  }, [financialData, selectedReturnPeriod]);

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
    periodButtons: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 16,
    },
    periodButtonText: {
      fontSize: 12,
      fontWeight: '700' as const,
      paddingBottom: 6,
      borderBottomWidth: 2,
    },
    periodBanner: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingTop: theme.spacing.md,
      marginTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    periodBannerLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
    },
    periodBannerValue: {
      fontSize: theme.fontSize.sm,
      fontWeight: '700' as const,
    },
    skeletonRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 14,
    },
    footerNote: {
      marginTop: theme.spacing.lg,
      fontSize: theme.fontSize.xs,
      color: theme.colors.textMuted,
      textAlign: 'center' as const,
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
              showsVerticalScrollIndicator={false}
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

              <Section label="Zwrot">
                <View style={styles.periodButtons}>
                  {(['1Y', '3Y', '5Y'] as const).map((period) => {
                    const active = selectedReturnPeriod === period;
                    return (
                      <Pressable
                        key={period}
                        onPress={() => setSelectedReturnPeriod(period)}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.periodButtonText,
                            {
                              color: active ? theme.colors.accent : theme.colors.textMuted,
                              borderBottomColor: active ? theme.colors.accent : 'transparent',
                            },
                          ]}
                        >
                          {period}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {periodReturn !== undefined && (
                  <View style={[styles.periodBanner, { borderTopColor: theme.colors.borderGlass }]}>
                    <Text style={styles.periodBannerLabel}>Szacowany zwrot ({selectedReturnPeriod})</Text>
                    <Text
                      style={[
                        styles.periodBannerValue,
                        { color: periodReturn >= 0 ? theme.colors.positive : theme.colors.negative },
                      ]}
                    >
                      {periodReturn >= 0 ? '+' : ''}{formatPercent(periodReturn)}
                    </Text>
                  </View>
                )}
              </Section>

              {loading && !financialData && (
                <Section label="Dane finansowe">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={styles.skeletonRow}>
                      <Skeleton width="45%" height={16} />
                      <Skeleton width="30%" height={16} />
                    </View>
                  ))}
                </Section>
              )}

              {financialData && (
                <>
                  <Section label="Dane rynkowe">
                    <DataItem label="Cena" value={formatCurrency(financialData.price, financialData.currency)} />
                    <DataItem
                      label="Zmiana"
                      value={
                        financialData.change >= 0
                          ? `+${formatCurrency(financialData.change, financialData.currency)}`
                          : formatCurrency(financialData.change, financialData.currency)
                      }
                    />
                    <DataItem
                      label="Zmiana %"
                      value={
                        financialData.changePercent >= 0
                          ? `+${formatPercent(financialData.changePercent)}`
                          : formatPercent(financialData.changePercent)
                      }
                    />
                    <DataItem label="Wolumen" value={formatNumber(financialData.volume)} />
                    <DataItem label="Wolumen średni 10d" value={formatNumber(financialData.averageVolume)} divider={false} />
                  </Section>

                  <Section label="Wskaźniki wyceny">
                    <DataItem label="P/E (trailing)" value={financialData.trailingPE ? formatRatio(financialData.trailingPE) : '-'} />
                    <DataItem label="P/E (forward)" value={financialData.forwardPE ? formatRatio(financialData.forwardPE) : '-'} />
                    <DataItem label="P/B" value={financialData.priceToBook ? formatRatio(financialData.priceToBook) : '-'} />
                    <DataItem label="P/S" value={financialData.priceToSales ? formatRatio(financialData.priceToSales) : '-'} />
                    <DataItem label="EV/EBITDA" value={financialData.enterpriseValueToEbitda ? formatRatio(financialData.enterpriseValueToEbitda) : '-'} />
                    <DataItem label="P/FCF" value={financialData.priceToFreeCashFlow ? formatRatio(financialData.priceToFreeCashFlow) : '-'} />
                    <DataItem label="Marża zysku" value={financialData.profitMargins ? formatPercent(financialData.profitMargins) : '-'} divider={false} />
                  </Section>

                  <Section label="Dywidendy">
                    <DataItem label="Stopa dywidendy" value={formatPercent(financialData.dividendYield)} />
                    <DataItem label="Kwota dywidendy" value={formatCurrency(financialData.dividendRate, financialData.currency)} />
                    <DataItem label="Data ex-dividenda" value={formatDate(financialData.exDividendDate)} />
                    <DataItem label="Payout ratio" value={formatPercent(financialData.payoutRatio)} />
                    <DataItem label="Średnia 5-letnia dywidenda" value={formatPercent(financialData.fiveYearAvgDividendYield)} divider={false} />
                  </Section>

                  <Section label="Wycena i akcje">
                    <DataItem label="Kapitalizacja rynkowa" value={formatCurrency(financialData.marketCap, financialData.currency)} />
                    <DataItem label="Liczba akcji" value={formatNumber(financialData.sharesOutstanding)} />
                    <DataItem label="Wartość księgowa" value={formatCurrency(financialData.bookValue, financialData.currency)} />
                    <DataItem label="Akcje w obiegu" value={formatNumber(financialData.floatShares)} />
                    <DataItem label="Beta" value={financialData.beta ? formatRatio(financialData.beta) : '-'} divider={false} />
                  </Section>

                  <Section label="Wyniki historyczne">
                    <DataItem label="1 rok" value={financialData.performance1Y !== undefined ? formatPercent(financialData.performance1Y) : '-'} />
                    <DataItem label="3 lata" value={financialData.performance3Y !== undefined ? formatPercent(financialData.performance3Y) : '-'} />
                    <DataItem label="5 lat" value={financialData.performance5Y !== undefined ? formatPercent(financialData.performance5Y) : '-'} />
                    <DataItem label="Rok bieżący (YTD)" value={financialData.performanceYTD !== undefined ? formatPercent(financialData.performanceYTD) : '-'} />
                    <DataItem label="Średni zwrot 1 rok" value={financialData.oneYearAvgReturn ? formatPercent(financialData.oneYearAvgReturn) : '-'} />
                    <DataItem label="Średni zwrot 3 lata" value={financialData.threeYearAvgReturn ? formatPercent(financialData.threeYearAvgReturn) : '-'} />
                    <DataItem label="Średni zwrot 5 lat" value={financialData.fiveYearAvgReturn ? formatPercent(financialData.fiveYearAvgReturn) : '-'} divider={false} />
                  </Section>

                  <Section label="Dane dodatkowe">
                    <DataItem label="Wartość przedsiębiorstwa" value={formatCurrency(financialData.enterpriseValue, financialData.currency)} />
                    <DataItem label="EV/Przychody" value={financialData.enterpriseValueToRevenue ? formatRatio(financialData.enterpriseValueToRevenue) : '-'} />
                    <DataItem label="Akcje krótkoterminowe" value={formatNumber(financialData.sharesShort)} />
                    <DataItem label="Stosunek krótkich akcji" value={financialData.shortRatio ? formatRatio(financialData.shortRatio) : '-'} />
                    <DataItem label="% krótkich akcji" value={financialData.shortPercentOfFloat ? formatPercent(financialData.shortPercentOfFloat) : '-'} divider={!financialData.lastSplitFactor} />
                    {financialData.lastSplitFactor && (
                      <DataItem label="Ostatni split" value={`${financialData.lastSplitFactor}x`} subValue={formatDate(financialData.lastSplitDate)} divider={false} />
                    )}
                  </Section>
                </>
              )}

              <Text style={styles.footerNote}>
                Dane edukacyjne · mogą być opóźnione
              </Text>
            </ScrollView>
          </Reanimated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
