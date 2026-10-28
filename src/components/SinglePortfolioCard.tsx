import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';
import { MockPortfolio } from '../database/mockPortfolioData';
import { useTheme } from '../theme';
import { GlassSurface } from './GlassSurface';

interface SinglePortfolioCardProps {
  portfolio: MockPortfolio;
}

export function SinglePortfolioCard({ portfolio }: SinglePortfolioCardProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const formatNumber = (val: number) =>
    Math.abs(val).toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const isPositive = portfolio.profitCurrency >= 0;
  const arrowColor = isPositive ? '#10b981' : '#ef4444';
  const arrowIcon = isPositive ? 'arrow-up' : 'arrow-down';
  const sign = isPositive ? '+' : '-';

  const totalFormatted = `${formatNumber(portfolio.totalValue)} ${portfolio.currencySymbol}`;
  const activeFormatted = `${formatNumber(Math.max(0, portfolio.totalValue - portfolio.cashBalance))} ${portfolio.currencySymbol}`;
  const inactiveFormatted = `${formatNumber(portfolio.cashBalance)} ${portfolio.currencySymbol}`;
  const profitFormatted = `${sign}${formatNumber(portfolio.profitCurrency)} ${portfolio.currencySymbol}`;
  const profitPctFormatted = `${sign}${Math.abs(portfolio.profitPercent).toFixed(2)}%`;

  // Punkty wykresu dla 3 miesięcy
  const chartData = useMemo(() => {
    const baseVal = portfolio.totalValue - portfolio.profitCurrency;
    const midVal = baseVal + portfolio.profitCurrency * 0.45;
    const endVal = portfolio.totalValue;
    return [
      { timestamp: 1, value: Math.max(1, Math.round(baseVal)) },
      { timestamp: 2, value: Math.max(1, Math.round(midVal)) },
      { timestamp: 3, value: Math.max(1, Math.round(endVal)) },
    ];
  }, [portfolio]);

  const chartLabels = [
    chartData[chartData.length - 1].value,
    chartData[Math.floor(chartData.length / 2)].value,
    chartData[0].value,
  ];

  const chartWidth = Math.max(width - 124, 180);
  const cardAccent = colors.accent;

  return (
    <View style={styles.wrapper}>
      {/* Karta 1:1 z dashboard (index.tsx / PortfolioOverviewCard) */}
      <View style={[styles.card, { borderColor: cardAccent }]}>
        <GlassSurface
          pointerEvents="none"
          tintColor={cardAccent}
          style={[StyleSheet.absoluteFill, styles.cardGlass]}
        />

        <View>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                WARTOŚĆ PORTFELA · 3 MIESIĄCE
              </Text>
              <Text style={[styles.total, { color: colors.text }]}>{totalFormatted}</Text>
            </View>
            <Ionicons name="wallet-outline" size={24} color={cardAccent} />
          </View>

          {/* Stock / Portfolio Name row */}
          <View style={styles.stockRow}>
            <Ionicons name="trending-up-outline" size={16} color={cardAccent} />
            <Text style={[styles.stockText, { color: colors.text }]} numberOfLines={1}>
              {portfolio.name}
            </Text>
          </View>

          {/* Subtitle */}
          <Text style={[styles.swipeHint, { color: colors.textMuted }]}>
            Portfel inwestycyjny · {portfolio.currency}
          </Text>

          {/* Breakdown: Aktywne / Nieaktywne */}
          <View style={styles.breakdown}>
            <Text style={[styles.breakdownText, { color: colors.textMuted }]}>
              Aktywne <Text style={{ color: colors.text }}>{activeFormatted}</Text>
            </Text>
            <Text style={[styles.breakdownText, { color: colors.textMuted }]}>
              Nieaktywne <Text style={{ color: colors.text }}>{inactiveFormatted}</Text>
            </Text>
          </View>

          {/* Wykres z osią Y i liniami siatki */}
          <View style={styles.chartRow}>
            <View style={styles.yAxis}>
              {chartLabels.map((value, pointIndex) => (
                <Text
                  key={`${value}-${pointIndex}`}
                  style={[styles.yAxisLabel, { color: colors.textMuted }]}
                >
                  {value.toLocaleString('pl-PL')} {portfolio.currencySymbol}
                </Text>
              ))}
            </View>
            <View style={styles.chart}>
              <View pointerEvents="none" style={styles.grid}>
                {[0, 1, 2].map((gridIndex) => (
                  <View
                    key={gridIndex}
                    style={[
                      styles.gridLine,
                      { top: gridIndex * 54, backgroundColor: colors.border },
                    ]}
                  />
                ))}
              </View>
              <LineChart.Provider data={chartData}>
                <LineChart height={110} width={chartWidth}>
                  <LineChart.Path color={cardAccent} width={2.5} />
                </LineChart>
              </LineChart.Provider>
            </View>
          </View>

          {/* Stopka z wynikiem: kolorowa strzałka, ale czysty tekst zgodnie z wytycznymi */}
          <View style={styles.returnFooter}>
            <Ionicons name={arrowIcon} size={15} color={arrowColor} />
            <Text style={[styles.returnText, { color: colors.text }]}>
              {profitFormatted} ({profitPctFormatted})
            </Text>
            <Text style={[styles.returnPeriod, { color: colors.textMuted }]}>
              · wynik za ostatnie 3 miesiące
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    minHeight: 260,
    overflow: 'hidden',
  },
  cardGlass: {
    borderRadius: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  total: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 7,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  swipeHint: {
    fontSize: 10,
    marginTop: 6,
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  breakdownText: {
    fontSize: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 12,
  },
  yAxis: {
    width: 46,
    height: 110,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yAxisLabel: {
    fontSize: 8,
    textAlign: 'right',
  },
  chart: {
    flex: 1,
    height: 110,
    overflow: 'hidden',
    position: 'relative',
  },
  grid: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  returnFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  returnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  returnPeriod: {
    fontSize: 12,
  },
});
