import { useId, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

export type TrendPoint = {
  timestamp: number;
  value: number;
};

export type TrendChartProps = {
  data: TrendPoint[];
  height?: number;
  showPeriod?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const AXIS_WIDTH = 46;
const AXIS_LABEL_HEIGHT = 12;
const TOP_PADDING = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Zmiana procentowa liczona z pierwszego i ostatniego punktu serii.
 * Dzięki temu nagłówek karty i kształt wykresu zawsze opowiadają tę samą historię.
 */
export function trendChangePercent(data: TrendPoint[], fallback = 0): number {
  if (data.length < 2) return fallback;
  const first = data[0]?.value;
  const last = data[data.length - 1]?.value;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return fallback;
  return ((last - first) / first) * 100;
}

/**
 * Reużywalny mini-wykres trendu
 */
export function TrendChart({
  data,
  height = 88,
  showPeriod = true,
  style,
  accessibilityLabel,
}: TrendChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const rawGradientId = useId();
  const gradientId = `trend-${rawGradientId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - nextWidth) > 0.5 ? nextWidth : current));
  };

  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const firstValue = data[0].value;
    const latestTimestamp = data[data.length - 1].timestamp;
    const changePercent = trendChangePercent(data);
    const changes = data.map((point) =>
      firstValue === 0 ? 0 : ((point.value - firstValue) / firstValue) * 100,
    );
    const seriesMin = Math.min(0, ...changes);
    const seriesMax = Math.max(0, ...changes);
    const span = Math.max(seriesMax - seriesMin, 2);
    const pad = Math.max(span * 0.12, 0.35);
    const min = seriesMin - pad;
    const max = seriesMax + pad;

    const plotWidth = Math.max(width - AXIS_WIDTH, 1);
    const plotHeight = Math.max(height - TOP_PADDING, 1);
    const toY = (change: number) => TOP_PADDING + ((max - change) / (max - min)) * plotHeight;
    const toX = (index: number) =>
      data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth;

    const points = changes.map((change, index) => ({
      x: toX(index),
      y: toY(change),
    }));

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    const zeroY = toY(0);

    return {
      points,
      linePath,
      areaPath,
      zeroY,
      toY,
      seriesMin,
      seriesMax,
      changePercent,
      latestTimestamp,
      spanDays: Math.max(1, Math.round((latestTimestamp - data[0].timestamp) / DAY_MS)),
    };
  }, [data, height, width]);

  const tone = (chart?.changePercent ?? 0) >= 0 ? colors.positive : colors.negative;
  const label =
    accessibilityLabel ??
    (chart
      ? `Zmiana ${formatSignedPercent(chart.changePercent)} w ciągu ${chart.spanDays} dni`
      : 'Brak danych do wykresu');

  return (
    <View
      style={[styles.root, style]}
      onLayout={handleLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <View style={[styles.body, { height }]}>
        <View style={styles.plot}>
          {chart && width > 0 && (
            <Svg width={Math.max(width - AXIS_WIDTH, 1)} height={height}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={tone} stopOpacity={0.26} />
                  <Stop offset="1" stopColor={tone} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              <Line
                x1={0}
                x2={Math.max(width - AXIS_WIDTH, 1)}
                y1={chart.zeroY}
                y2={chart.zeroY}
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

        {chart && width > 0 && (
          <View style={[styles.axis, { height }]}>
            {buildAxisMarks(chart, height).map((mark) => (
              <Text
                key={mark.key}
                style={[
                  styles.axisLabel,
                  mark.strong && styles.axisLabelZero,
                  { top: mark.top, color: colors.textMuted },
                ]}
              >
                {mark.label}
              </Text>
            ))}
          </View>
        )}
      </View>

      {showPeriod && chart && (
        <View style={styles.period}>
          <Text style={[styles.periodLabel, { color: colors.textMuted }]}>
            {formatStartLabel(chart.spanDays)}
          </Text>
          <Text style={[styles.periodLabel, { color: colors.textMuted }]}>
            {formatEndLabel(chart.latestTimestamp)}
          </Text>
        </View>
      )}
    </View>
  );
}

function buildAxisMarks(
  chart: {
    toY: (value: number) => number;
    seriesMin: number;
    seriesMax: number;
  },
  height: number,
) {
  const candidates = [
    { value: chart.seriesMax, strong: false },
    { value: 0, strong: true },
    { value: chart.seriesMin, strong: false },
  ].filter((candidate) => {
    if (candidate.value === 0) return true;
    const span = Math.max(chart.seriesMax - chart.seriesMin, 0.01);
    return Math.abs(candidate.value) >= span * 0.08;
  });

  const marks: { key: string; label: string; top: number; strong: boolean }[] = [];
  let previousTop = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const value = Math.round(candidate.value * 100) / 100;
    if (marks.some((mark) => mark.key === `axis-${value}`)) continue;

    const top = Math.max(
      Math.min(chart.toY(candidate.value) - AXIS_LABEL_HEIGHT / 2, height - AXIS_LABEL_HEIGHT),
      0,
    );
    if (top - previousTop < AXIS_LABEL_HEIGHT - 1) continue;

    marks.push({
      key: `axis-${value}`,
      label: candidate.strong ? '0%' : formatSignedPercent(candidate.value, true),
      top,
      strong: candidate.strong,
    });
    previousTop = top;
  }

  return marks;
}

// Gładka krzywa bez przestrzeliwania
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

function formatSignedPercent(value: number, compact = false) {
  if (!Number.isFinite(value)) return '0%';
  if (Math.abs(value) < 0.05) return '0%';

  const digits = compact ? (Math.abs(value) < 100 ? 1 : 0) : (Math.abs(value) < 10 ? 2 : 1);
  const formatted = Math.abs(value).toLocaleString('pl-PL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value > 0 ? '+' : '−'}${formatted}%`;
}

function formatStartLabel(days: number) {
  if (days <= 1) return '1 dzień temu';
  return `${days} dni temu`;
}

function formatEndLabel(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) return 'dziś';
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  body: { flexDirection: 'row', alignItems: 'stretch' },
  plot: { flex: 1, overflow: 'hidden' },
  axis: { width: AXIS_WIDTH, position: 'relative' },
  axisLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    lineHeight: AXIS_LABEL_HEIGHT,
  },
  axisLabelZero: { fontWeight: '700' },
  period: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  periodLabel: { fontSize: 9, fontWeight: '500' },
});
