import { useContext, type ComponentProps, type ReactNode } from 'react';
import { Platform, StyleSheet, type GestureResponderEvent, type PointerEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Line, Rect } from 'react-native-svg';
import {
  CandlestickChart,
  CandlestickChartCrosshairTooltipContext,
  CandlestickChartDimensionsContext,
} from 'react-native-wagmi-charts';

// Jak w wagmi: przy lewej krawędzi dymek z ceną przeskakuje na prawą stronę kursora
const TOOLTIP_POSITION_THRESHOLD = 100;

// wagmi przekazuje do elementów SVG swoje pomocnicze propsy (useAnimations, candle), które na webie trafiają do DOM
// i wywołują błąd Reacta. Animacji świec i tak nie używamy, więc rysujemy zwykłe Line/Rect bez tych propsów.
type CandlesProps = ComponentProps<typeof CandlestickChart.Candles>;
export const renderCandleLine: NonNullable<CandlesProps['renderLine']> = ({ useAnimations, candle, ...props }) => <Line {...props} />;
export const renderCandleRect: NonNullable<CandlesProps['renderRect']> = ({ useAnimations, candle, ...props }) => <Rect {...props} />;

type CrosshairProps = { color?: string; minDurationMs?: number; children?: ReactNode };

/**
 * Kursor wykresu świecowego dla webu: pokazuje się po najechaniu myszą, a nie po przytrzymaniu
 * (wbudowany Crosshair z wagmi reaguje tylko na long press). Zasila ten sam stan wykresu,
 * więc dymek z ceną (Tooltip) i data pod wykresem (DatetimeText) działają bez zmian.
 * `minDurationMs` jest ignorowane — prop zostaje dla zgodności z Crosshair z wagmi.
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
        <CandlestickChart.Line color={color} x={0} y={height} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, horizontal]}>
        <CandlestickChart.Line color={color} x={width} y={0} />
        <CandlestickChartCrosshairTooltipContext.Provider value={{ position: tooltipPosition }}>
          {children}
        </CandlestickChartCrosshairTooltipContext.Provider>
      </Animated.View>
    </Animated.View>
  );
}

// Kursor odpowiedni dla platformy: najechanie myszą na webie, przytrzymanie palcem na mobile
export const ChartCrosshair: (props: CrosshairProps) => ReactNode =
  Platform.OS === 'web' ? CandleHoverCrosshair : CandlestickChart.Crosshair;
