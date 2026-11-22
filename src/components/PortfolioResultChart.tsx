/**
 * Wykres wartości portfela w czasie.
 *
 * @module src/components/PortfolioResultChart
 */

import { useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme';
import type { TrendPoint } from './TrendChart';

/** Właściwości {@link PortfolioResultChart}. */
export type PortfolioResultChartProps = {
  /** Punkty wykresu (wartość portfela w czasie); mniej niż 2 — wykres pusty. */
  data: TrendPoint[];
  /** Symbol waluty dopisywany do etykiet osi. */
  currencySymbol?: string;
  /** Wysokość wykresu (px). */
  height?: number;
  /** Kolor linii; domyślnie zielony przy wzroście i czerwony przy spadku. */
  color?: string;
  /** Etykieta okresu pod wykresem; domyślnie zakres dat. */
  periodLabel?: string;
  /** Dodatkowy styl kontenera. */
  style?: StyleProp<ViewStyle>;
};

/** Szerokość (px) osi wartości. */
const AXIS_WIDTH = 58;
/** Wysokość (px) etykiety osi. */
const AXIS_LABEL_HEIGHT = 12;
/** Górny odstęp (px) obszaru wykresu. */
const TOP_PADDING = 6;
/** Liczba milisekund w dniu. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Wygładzony wykres liniowy wartości portfela z wypełnieniem, osią wartości
 * (maksimum, środek, minimum; skrócone „tys.”/„mln”) i zakresem dat.
 *
 * Zakres osi ma 12% zapasu nad i pod danymi. Szerokość jest mierzona z kontenera.
 *
 * @param props Właściwości komponentu (patrz {@link PortfolioResultChartProps}).
 */
export function PortfolioResultChart({
  data,
  currencySymbol,
  height = 110,
  color,
  periodLabel,
  style,
}: PortfolioResultChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const rawGradientId = useId();
  const gradientId = `portfolio-${rawGradientId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - nextWidth) > 0.5 ? nextWidth : current));
  };

  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const values = data.map((point) => point.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const span = maxValue - minValue;
    const pad = span > 0.0001 ? span * 0.12 : Math.max(Math.abs(maxValue) * 0.01, 1);
    const min = minValue - pad;
    const max = maxValue + pad;

    const plotWidth = Math.max(width - AXIS_WIDTH, 1);
    const plotHeight = Math.max(height - TOP_PADDING, 1);
    const toY = (value: number) => TOP_PADDING + ((max - value) / (max - min)) * plotHeight;
    const toX = (index: number) =>
      data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth;

    const points = values.map((value, index) => ({ x: toX(index), y: toY(value) }));
    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return {
      points,
      linePath,
      areaPath,
      firstY: toY(firstValue),
      toY,
      minValue,
      maxValue,
      midValue: values[Math.floor(values.length / 2)],
      firstValue,
      lastValue,
      startTimestamp: data[0].timestamp,
      endTimestamp: data[data.length - 1].timestamp,
    };
  }, [data, height, width]);

  const tone = color ?? (chart && chart.lastValue >= chart.firstValue ? colors.positive : colors.negative);

  return (
    <View style={[styles.root, style]} onLayout={handleLayout} accessible accessibilityRole="image" accessibilityLabel={buildAccessibilityLabel(chart, currencySymbol)}>
      <View style={[styles.body, { height }]}>
        <View style={[styles.axis, { height }]}>
          {chart &&
            width > 0 &&
            buildAxisMarks(chart, height, currencySymbol).map((mark) => (
              <Text
                key={mark.key}
                style={[styles.axisLabel, { top: mark.top, color: colors.textMuted }]}
              >
                {mark.label}
              </Text>
            ))}
        </View>

        <View style={styles.plot}>
          {chart && width > 0 && (
            <Svg width={Math.max(width - AXIS_WIDTH, 1)} height={height}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={tone} stopOpacity={0.24} />
                  <Stop offset="1" stopColor={tone} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {/* Poziom startowy — pokazuje, czy portfel zyskał, czy stracił */}
              <Line
                x1={0}
                x2={Math.max(width - AXIS_WIDTH, 1)}
                y1={chart.firstY}
                y2={chart.firstY}
                stroke={colors.textMuted}
                strokeOpacity={0.28}
                strokeWidth={1}
                strokeDasharray="3 5"
              />

              <Path d={chart.areaPath} fill={`url(#${gradientId})`} />
              <Path
                d={chart.linePath}
                fill="none"
                stroke={tone}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle
                cx={chart.points[chart.points.length - 1].x}
                cy={chart.points[chart.points.length - 1].y}
                r={6}
                fill={tone}
                fillOpacity={0.18}
              />
              <Circle
                cx={chart.points[chart.points.length - 1].x}
                cy={chart.points[chart.points.length - 1].y}
                r={2.6}
                fill={tone}
              />
            </Svg>
          )}
        </View>
      </View>

      {chart && (
        <Text style={[styles.range, { color: colors.textMuted }]}>
          {periodLabel ? `${periodLabel} · ` : ''}
          {formatDateRange(chart.startTimestamp, chart.endTimestamp)}
        </Text>
      )}
    </View>
  );
}

/**
 * Buduje przykładową serię wartości portfela przechodzącą przez podane punkty.
 *
 * Punkty są rozłożone równo w ostatnich `days` dniach (do teraz). Wartości są
 * interpolowane liniowo między kolejnymi punktami `anchors` z lekką falą
 * (4% różnicy między pierwszym a ostatnim punktem), znikającą na końcach.
 *
 * @param anchors Wartości kontrolne od najstarszej do najnowszej.
 * @param days Długość okresu w dniach (domyślnie 90).
 * @param points Liczba punktów serii (domyślnie 13).
 * @returns Seria punktów; pusta dla braku punktów kontrolnych, jeden punkt (teraz) dla jednego.
 *
 * @example
 * buildPortfolioSeries([10_000, 10_450, 11_000]); // 13 punktów z 90 dni
 */
export function buildPortfolioSeries(anchors: number[], days = 90, points = 13): TrendPoint[] {
  if (anchors.length === 0) return [];
  if (anchors.length === 1) {
    return [{ timestamp: Date.now(), value: anchors[0] }];
  }

  const now = Date.now();
  const totalSpan = days * DAY_MS;
  const amplitude = Math.abs(anchors[anchors.length - 1] - anchors[0]) * 0.04;

  return Array.from({ length: points }, (_, index) => {
    const ratio = index / (points - 1);
    const scaled = ratio * (anchors.length - 1);
    const segment = Math.min(Math.floor(scaled), anchors.length - 2);
    const local = scaled - segment;
    const base = anchors[segment] + (anchors[segment + 1] - anchors[segment]) * local;
    const wave = amplitude * Math.sin(index * 1.9) * Math.sin(ratio * Math.PI);

    return {
      timestamp: now - totalSpan + ratio * totalSpan,
      value: base + wave,
    };
  });
}

/** Geometria wykresu potrzebna do etykiet osi. */
type ChartGeometry = {
  /** Zamienia wartość na współrzędną Y. */
  toY: (value: number) => number;
  /** Najmniejsza wartość serii. */
  minValue: number;
  /** Największa wartość serii. */
  maxValue: number;
  /** Wartość ze środka serii. */
  midValue: number;
};

/**
 * Wyznacza etykiety osi wartości (maksimum, środek, minimum).
 *
 * Pomija etykiety o tej samej wartości lub tekście oraz takie, które
 * nachodziłyby na poprzednią.
 *
 * @param chart Geometria wykresu.
 * @param height Wysokość wykresu (px).
 * @param currencySymbol Symbol waluty.
 * @returns Etykiety z kluczem, tekstem i położeniem od góry.
 */

function buildAxisMarks(chart: ChartGeometry, height: number, currencySymbol?: string) {
  const candidates = [
    { value: chart.maxValue },
    { value: chart.midValue },
    { value: chart.minValue },
  ];

  const marks: { key: string; label: string; top: number }[] = [];
  let previousTop = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const value = Math.round(candidate.value * 100) / 100;
    const key = `axis-${value}`;
    if (marks.some((mark) => mark.key === key)) continue;

    const label = formatAxisValue(candidate.value, currencySymbol);
    if (marks.some((mark) => mark.label === label)) continue;

    const top = Math.max(
      Math.min(chart.toY(candidate.value) - AXIS_LABEL_HEIGHT / 2, height - AXIS_LABEL_HEIGHT),
      0,
    );
    if (top - previousTop < AXIS_LABEL_HEIGHT - 1) continue;

    marks.push({ key, label, top });
    previousTop = top;
  }

  return marks;
}

/**
 * Formatuje wartość na osi w skróconej formie.
 *
 * @param value Wartość.
 * @param currencySymbol Symbol waluty dopisywany na końcu.
 * @returns Np. `"950 zł"`, `"1,5 tys. zł"`, `"12 tys. zł"`, `"1,2 mln zł"`.
 */
function formatAxisValue(value: number, currencySymbol?: string) {
  const abs = Math.abs(value);
  const format = (number: number, digits: number) =>
    number.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: digits });

  let text: string;
  if (abs >= 1_000_000) text = `${format(value / 1_000_000, 1)} mln`;
  else if (abs >= 10_000) text = `${format(value / 1000, 0)} tys.`;
  else if (abs >= 1000) text = `${format(value / 1000, 1)} tys.`;
  else text = format(value, 0);

  return currencySymbol ? `${text} ${currencySymbol}` : text;
}

/**
 * Formatuje zakres dat wykresu; rok jest dodawany tylko wtedy, gdy różni się od bieżącego.
 *
 * @param startTimestamp Początek (ms).
 * @param endTimestamp Koniec (ms).
 * @returns Np. `"15 sie – 15 lis"`.
 */
function formatDateRange(startTimestamp: number, endTimestamp: number) {
  const start = new Date(startTimestamp);
  const end = new Date(endTimestamp);
  const nowYear = new Date().getFullYear();
  const includeYear = start.getFullYear() !== nowYear || end.getFullYear() !== nowYear;
  const options: Intl.DateTimeFormatOptions = includeYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' };

  return `${start.toLocaleDateString('pl-PL', options)} – ${end.toLocaleDateString('pl-PL', options)}`;
}

/**
 * Tworzy opis wykresu dla czytników ekranu (okres, kierunek i procent zmiany).
 *
 * @param chart Dane wykresu albo `null`.
 * @param currencySymbol Symbol waluty.
 * @returns Opis dostępności.
 */
function buildAccessibilityLabel(
  chart: {
    firstValue: number;
    lastValue: number;
    startTimestamp: number;
    endTimestamp: number;
  } | null,
  currencySymbol?: string,
) {
  if (!chart) return 'Brak danych wykresu portfela';
  const change = chart.firstValue === 0 ? 0 : ((chart.lastValue - chart.firstValue) / chart.firstValue) * 100;
  const direction = change >= 0 ? 'wzrost' : 'spadek';
  return `Wartość portfela od ${new Date(chart.startTimestamp).toLocaleDateString('pl-PL')} do ${new Date(chart.endTimestamp).toLocaleDateString('pl-PL')}: ${direction} ${Math.abs(change).toFixed(2)}%${currencySymbol ? `, ${currencySymbol}` : ''}`;
}

/**
 * Buduje gładką ścieżkę SVG (krzywe Béziera z punktami kontrolnymi w połowie odcinków).
 *
 * @param points Punkty wykresu.
 * @returns Atrybut `d` ścieżki SVG.
 */
function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    path += ` C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  body: { flexDirection: 'row', alignItems: 'stretch' },
  axis: { width: AXIS_WIDTH, position: 'relative' },
  axisLabel: {
    position: 'absolute',
    right: 8,
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    lineHeight: AXIS_LABEL_HEIGHT,
  },
  plot: { flex: 1, overflow: 'hidden' },
  range: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
});
