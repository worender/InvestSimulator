import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  buildFallbackFinancialData,
  enrichFinancialData,
  getStockData,
  StockFinancialData,
} from '../api/marketService';
import { currencySymbol } from '../currency';
import { notify } from '../notificationBus';
import { useTheme } from '../theme';
import { Section } from './Section';
import { Skeleton } from './Skeleton';

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

type InstrumentRef = {
  stock: string;
  exchange: string;
  currency: string;
  financialData?: StockFinancialData;
};

// Pobiera i uzupełnia dane finansowe instrumentu (wspólne dla modala na mobile i panelu na desktopie)
export function useInstrumentFinancialData(instrument: InstrumentRef, propFinancialData?: StockFinancialData) {
  const initial = propFinancialData ?? instrument.financialData;
  const [financialData, setFinancialData] = useState<StockFinancialData | null>(initial ?? null);
  const [loading, setLoading] = useState<boolean>(!initial);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      let current: StockFinancialData | null | undefined = propFinancialData ?? instrument.financialData;
      // Przy zmianie instrumentu (panel na desktopie) nie pokazujemy danych poprzedniego
      setFinancialData(current ?? null);
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

  return { financialData, loading };
}

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

type InstrumentDetailsProps = {
  financialData: StockFinancialData | null;
  loading: boolean;
  // Na desktopie sekcje układają się w siatkę kolumn zamiast jednej długiej listy
  grid?: boolean;
};

// Sekcje ze zwrotem i danymi finansowymi instrumentu (pod wykresem w modalu lub w panelu na desktopie)
export function InstrumentDetails({ financialData, loading, grid = false }: InstrumentDetailsProps) {
  const theme = useTheme();
  const [selectedReturnPeriod, setSelectedReturnPeriod] = useState<'1Y' | '3Y' | '5Y'>('1Y');

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

  const cell = grid ? styles.gridCell : undefined;

  return (
    <>
      <View style={grid && styles.gridReturn}>
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
            <View style={[styles.periodBanner, { borderTopColor: theme.colors.borderGlass, paddingTop: theme.spacing.md, marginTop: theme.spacing.sm }]}>
              <Text style={[styles.periodBannerLabel, { color: theme.colors.textMuted, fontSize: theme.fontSize.xs }]}>
                Szacowany zwrot ({selectedReturnPeriod})
              </Text>
              <Text
                style={[
                  styles.periodBannerValue,
                  { color: periodReturn >= 0 ? theme.colors.positive : theme.colors.negative, fontSize: theme.fontSize.sm },
                ]}
              >
                {periodReturn >= 0 ? '+' : ''}{formatPercent(periodReturn)}
              </Text>
            </View>
          )}
        </Section>
      </View>

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
        <View style={grid && styles.grid}>
          <View style={cell}>
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
          </View>

          <View style={cell}>
            <Section label="Wskaźniki wyceny">
              <DataItem label="P/E (trailing)" value={financialData.trailingPE ? formatRatio(financialData.trailingPE) : '-'} />
              <DataItem label="P/E (forward)" value={financialData.forwardPE ? formatRatio(financialData.forwardPE) : '-'} />
              <DataItem label="P/B" value={financialData.priceToBook ? formatRatio(financialData.priceToBook) : '-'} />
              <DataItem label="P/S" value={financialData.priceToSales ? formatRatio(financialData.priceToSales) : '-'} />
              <DataItem label="EV/EBITDA" value={financialData.enterpriseValueToEbitda ? formatRatio(financialData.enterpriseValueToEbitda) : '-'} />
              <DataItem label="P/FCF" value={financialData.priceToFreeCashFlow ? formatRatio(financialData.priceToFreeCashFlow) : '-'} />
              <DataItem label="Marża zysku" value={financialData.profitMargins ? formatPercent(financialData.profitMargins) : '-'} divider={false} />
            </Section>
          </View>

          <View style={cell}>
            <Section label="Dywidendy">
              <DataItem label="Stopa dywidendy" value={formatPercent(financialData.dividendYield)} />
              <DataItem label="Kwota dywidendy" value={formatCurrency(financialData.dividendRate, financialData.currency)} />
              <DataItem label="Data ex-dividenda" value={formatDate(financialData.exDividendDate)} />
              <DataItem label="Payout ratio" value={formatPercent(financialData.payoutRatio)} />
              <DataItem label="Średnia 5-letnia dywidenda" value={formatPercent(financialData.fiveYearAvgDividendYield)} divider={false} />
            </Section>
          </View>

          <View style={cell}>
            <Section label="Wycena i akcje">
              <DataItem label="Kapitalizacja rynkowa" value={formatCurrency(financialData.marketCap, financialData.currency)} />
              <DataItem label="Liczba akcji" value={formatNumber(financialData.sharesOutstanding)} />
              <DataItem label="Wartość księgowa" value={formatCurrency(financialData.bookValue, financialData.currency)} />
              <DataItem label="Akcje w obiegu" value={formatNumber(financialData.floatShares)} />
              <DataItem label="Beta" value={financialData.beta ? formatRatio(financialData.beta) : '-'} divider={false} />
            </Section>
          </View>

          <View style={cell}>
            <Section label="Wyniki historyczne">
              <DataItem label="1 rok" value={financialData.performance1Y !== undefined ? formatPercent(financialData.performance1Y) : '-'} />
              <DataItem label="3 lata" value={financialData.performance3Y !== undefined ? formatPercent(financialData.performance3Y) : '-'} />
              <DataItem label="5 lat" value={financialData.performance5Y !== undefined ? formatPercent(financialData.performance5Y) : '-'} />
              <DataItem label="Rok bieżący (YTD)" value={financialData.performanceYTD !== undefined ? formatPercent(financialData.performanceYTD) : '-'} />
              <DataItem label="Średni zwrot 1 rok" value={financialData.oneYearAvgReturn ? formatPercent(financialData.oneYearAvgReturn) : '-'} />
              <DataItem label="Średni zwrot 3 lata" value={financialData.threeYearAvgReturn ? formatPercent(financialData.threeYearAvgReturn) : '-'} />
              <DataItem label="Średni zwrot 5 lat" value={financialData.fiveYearAvgReturn ? formatPercent(financialData.fiveYearAvgReturn) : '-'} divider={false} />
            </Section>
          </View>

          <View style={cell}>
            <Section label="Dane dodatkowe">
              <DataItem label="Wartość przedsiębiorstwa" value={formatCurrency(financialData.enterpriseValue, financialData.currency)} />
              <DataItem label="EV/Przychody" value={financialData.enterpriseValueToRevenue ? formatRatio(financialData.enterpriseValueToRevenue) : '-'} />
              <DataItem label="Akcje krótkoterminowe" value={formatNumber(financialData.sharesShort)} />
              <DataItem label="Stosunek krótkich akcji" value={financialData.shortRatio ? formatRatio(financialData.shortRatio) : '-'} />
              <DataItem label="% krótkich akcji" value={financialData.shortPercentOfFloat ? formatPercent(financialData.shortPercentOfFloat) : '-'} divider={!financialData.lastSplitFactor} />
              {/* !! — pusty string z API wyrenderowałby się jako goły tekst w View (błąd na webie) */}
              {!!financialData.lastSplitFactor && (
                <DataItem label="Ostatni split" value={`${financialData.lastSplitFactor}x`} subValue={formatDate(financialData.lastSplitDate)} divider={false} />
              )}
            </Section>
          </View>
        </View>
      )}

      <Text style={[styles.footerNote, { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: theme.spacing.lg }]}>
        Dane edukacyjne · mogą być opóźnione
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  periodButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '700',
    paddingBottom: 6,
    borderBottomWidth: 2,
  },
  periodBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  periodBannerLabel: {},
  periodBannerValue: {
    fontWeight: '700',
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  footerNote: {
    textAlign: 'center',
  },
  gridReturn: {
    maxWidth: 420,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 40,
  },
  gridCell: {
    flexGrow: 1,
    flexBasis: 300,
  },
});
