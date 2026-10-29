import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MockPortfolio } from '../database/mockPortfolioData';
import { useTheme } from '../theme';
import { PortfolioResultChart, buildPortfolioSeries } from './PortfolioResultChart';

interface SinglePortfolioCardProps {
  portfolio: MockPortfolio;
}

export function SinglePortfolioCard({ portfolio }: SinglePortfolioCardProps) {
  const { colors, mode } = useTheme();

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
    return buildPortfolioSeries([baseVal, midVal, endVal], 90);
  }, [portfolio]);

  const cardAccent = colors.accent;

  return (
    <View style={styles.wrapper}>
      {/* Karta 1:1 z dashboard (index.tsx / PortfolioOverviewCard) */}
      <View style={styles.card}>
        {/* Efekt Liquid Glass z blurem - bardziej przeźroczyste tło z blurem jak w AssetCategoryCard */}
        <BlurView
          intensity={45}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: cardAccent + '15', // Bardziej przeźroczyste tło
              opacity: mode === 'dark' ? 0.78 : 0.65,
            },
          ]}
        />

        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.stockText, { color: colors.text }]} numberOfLines={1}>
                {portfolio.name} · {portfolio.currency}
              </Text>
              <Text style={[styles.total, { color: colors.text }]}>{totalFormatted}</Text>
              <View style={styles.returnProfit}>
                <Ionicons name={arrowIcon} size={13} color={arrowColor} />
                <Text style={[styles.returnText, { color: colors.text }]}>
                  {profitFormatted} ({profitPctFormatted})
                </Text>
              </View>
            </View>
            <Ionicons name="wallet-outline" size={24} color={cardAccent}/>
          </View>


          {/* Breakdown: Aktywne / Nieaktywne */}
          <View style={[styles.breakdown, { marginBottom: 16 }]}>
            <Text style={[styles.breakdownText, { color: colors.textMuted }]}>
              Aktywne: <Text style={{ color: colors.text }}>{activeFormatted}</Text>
            </Text>
            <Text style={[styles.breakdownText, { color: colors.textMuted }]}>
              Nieaktywne: <Text style={{ color: colors.text }}>{inactiveFormatted}</Text>
            </Text>
          </View>

          {/* Wykres wyników portfela z pionową legendą i zakresem dat */}
          <PortfolioResultChart
            data={chartData}
            currencySymbol={portfolio.currencySymbol}
            periodLabel="3 miesiące"
            height={110}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginTop: 16,
    marginBottom: 4,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    minHeight: 260,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    zIndex: 1,
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
  returnProfit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  returnText: {
    fontWeight: '700',
    fontSize: 11,
  },
  returnPeriod: {
    fontSize: 12,
  },
});
