/**
 * Kursor (crosshair) i elementy rysujące wykresu świecowego `react-native-wagmi-charts`.
 *
 * @module src/components/CandleHoverCrosshair
 */

import { useContext, type ComponentProps, type ReactNode } from 'react';
import { Platform, StyleSheet, type GestureResponderEvent, type PointerEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import {
  CandlestickChart,
  CandlestickChartCrosshairTooltipContext,
  CandlestickChartDimensionsContext,
} from 'react-native-wagmi-charts';

/** Jak w wagmi: przy lewej krawędzi (px) dymek z ceną przeskakuje na prawą stronę kursora. */
const TOOLTIP_POSITION_THRESHOLD = 100;

/** Właściwości `CandlestickChart.Candles` z wagmi. */
type CandlesProps = ComponentProps<typeof CandlestickChart.Candles>;
/**
 * Rysuje knot świecy jako zwykłe `<Line>` (do `CandlestickChart.Candles renderLine`).
 *
 * wagmi przekazuje do elementów SVG swoje pomocnicze propsy (`useAnimations`,
 * `candle`), które na webie trafiają do DOM i wywołują błąd Reacta. Animacji
 * świec i tak nie używamy, więc te propsy są odrzucane.
 */
export const renderCandleLine: NonNullable<CandlesProps['renderLine']> = ({ useAnimations, candle, ...props }) => <Line {...props} />;
/** Rysuje korpus świecy jako zwykłe `<Rect>` (do `renderRect`); patrz {@link renderCandleLine}. */
export const renderCandleRect: NonNullable<CandlesProps['renderRect']> = ({ useAnimations, candle, ...props }) => <Rect {...props} />;

/** Właściwości `DashedLine`: kolor, wymiary SVG i koniec linii (`x2`, `y2`) — początek to (0, 0). */
type DashedLineProps = { color?: string; width: number; height: number; x2: number; y2: number };
/**
 * Przerywana linia kursora w SVG o jawnych wymiarach.
 *
 * `CandlestickChart.Line` z wagmi nadaje `<Svg>` tylko styl `absoluteFill`. Na webie
 * to nie rozciąga elementu SVG, który dostaje domyślne 300×150 px, więc kreski
 * kursora były ucinane i się nie przecinały.
 *
 * @param props Właściwości linii.
 */
function DashedLine({ color = 'gray', width, height, x2, y2 }: DashedLineProps) {
  return (
    <Svg width={width} height={height} style={styles.line}>
      <Line x1={0} y1={0} x2={x2} y2={y2} strokeWidth={2} stroke={color} strokeDasharray="6 6" />
    </Svg>
  );
}

/**
 * Właściwości kursora wykresu (zgodne z `CandlestickChart.Crosshair`).
 * @inline
 */
type CrosshairProps = {
  /** Kolor linii kursora (domyślnie szary). */
  color?: string;
  /** Czas przytrzymania przed pokazaniem kursora (tylko mobile; na webie ignorowany). */
  minDurationMs?: number;
  /** Zawartość, zwykle `CandlestickChart.Tooltip`. */
  children?: ReactNode;
};

/**
 * Kursor wykresu świecowego dla webu: pokazuje się po najechaniu myszą, a nie po przytrzymaniu
 * (wbudowany Crosshair z wagmi reaguje tylko na long press). Zasila ten sam stan wykresu,
 * więc dymek z ceną (Tooltip) i data pod wykresem (DatetimeText) działają bez zmian.
 * `minDurationMs` jest ignorowane — prop zostaje dla zgodności z Crosshair z wagmi.
 *
 * Pozycja kursora jest przyciągana do środka świecy pod myszą, a po opuszczeniu
 * wykresu kursor znika.
 *
 * @param props Właściwości komponentu.
 */
export function CandleHoverCrosshair({ color, children }: CrosshairProps) {
  const { width, height } = useContext(CandlestickChartDimensionsContext);
  const { currentX, currentY, currentIndex, step } = CandlestickChart.useChart();
  const tooltipPosition = useSharedValue<'left' | 'right'>('left');
  const opacity = useSharedValue(0);

  const show = (event: PointerEvent | GestureResponderEvent) => {
    if (step <= 0) return;
    // Na webie currentTarget to element DOM nakładki; liczymy pozycję względem niego
    const rect = (event.currentTarget as unknown as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = event.nativeEvent as unknown as { clientX: number; clientY: number };
    const x = Math.min(Math.max(clientX - rect.left, 0), width - 1);
    const y = Math.min(Math.max(clientY - rect.top, 0), height);

    tooltipPosition.set(x < TOOLTIP_POSITION_THRESHOLD ? 'right' : 'left');
    currentY.set(y);
    currentX.set(x - (x % step) + step / 2);
    currentIndex.set(Math.floor(x / step));
    opacity.set(1);
  };

  const hide = () => {
    opacity.set(0);
    currentY.set(-1);
    currentX.set(-1);
    currentIndex.set(-1);
  };

  const horizontal = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: currentY.value }],
  }));
  const vertical = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: currentX.value }],
  }));

  return (
    <Animated.View style={StyleSheet.absoluteFill} onPointerMove={show} onPointerLeave={hide}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, vertical]}>
        <DashedLine color={color} width={width} height={height} x2={0} y2={height} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, horizontal]}>
        <DashedLine color={color} width={width} height={height} x2={width} y2={0} />
        <CandlestickChartCrosshairTooltipContext.Provider value={{ position: tooltipPosition }}>
          {children}
        </CandlestickChartCrosshairTooltipContext.Provider>
      </Animated.View>
    </Animated.View>
  );
}

/** Kursor odpowiedni dla platformy: najechanie myszą na webie ({@link CandleHoverCrosshair}), przytrzymanie palcem na mobile (`CandlestickChart.Crosshair`). */
export const ChartCrosshair: (props: CrosshairProps) => ReactNode =
  Platform.OS === 'web' ? CandleHoverCrosshair : CandlestickChart.Crosshair;

const styles = StyleSheet.create({
  // overflow: visible, żeby kreska przy samej krawędzi (x = 0 / y = 0) nie była przycięta do połowy grubości
  line: { position: 'absolute', top: 0, left: 0, overflow: 'visible' },
});
