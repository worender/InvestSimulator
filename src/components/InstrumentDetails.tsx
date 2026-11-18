import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  buildFallbackFinancialData,
  enrichFinancialData,
  getStockData,
  StockFinancialData,
} from "../api/marketService";
import {
  convertForDisplay,
  displaySymbol,
  useDisplayCurrency,
} from "../displayCurrency";
import {
  getMarketDetailTemplate,
  type InstrumentMarketCategory,
  type MarketDetailField,
} from "../instrumentCategories";
import { NOTIFICATION_GROUPS, notify } from "../notificationBus";
import { useTheme } from "../theme";
import { Section } from "./Section";
import { Skeleton } from "./Skeleton";

// Funkcja formatująca wartość pieniężną w walucie wyświetlania wybranej w ustawieniach
export const formatCurrency = (
  value?: number,
  currencyCode?: string,
): string => {
  if (value === undefined || currencyCode === undefined) return "-";
  const converted = convertForDisplay(value, currencyCode);
  const symbol = displaySymbol(currencyCode);
  return `${converted.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
};

// Funkcja formatująca wartość procentową z dwoma miejscami po przecinku
export const formatPercent = (value?: number): string => {
  if (value === undefined) return "-";
  return `${value.toFixed(2)}%`;
};

// Funkcja formatująca wartość liczbową z dwoma miejscami po przecinku
export const formatDate = (dateString?: string): string => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Funkcja formatująca wartość liczbową z dwoma miejscami po przecinku
export const formatNumber = (value?: number): string => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString("pl-PL");
};

// Funkcja formatująca wartość stosunku z dwoma miejscami po przecinku
export const formatRatio = (value?: number): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return value.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

type InstrumentRef = {
  stock: string;
  exchange: string;
  currency: string;
  financialData?: StockFinancialData;
};

// Pobiera i uzupełnia dane finansowe instrumentu (wspólne dla modala na mobile i panelu na desktopie)
export function useInstrumentFinancialData(
  instrument: InstrumentRef,
  propFinancialData?: StockFinancialData,
) {
  const initial = propFinancialData ?? instrument.financialData;
  const [financialData, setFinancialData] = useState<StockFinancialData | null>(
    initial ?? null,
  );
  const [loading, setLoading] = useState<boolean>(
    Boolean(instrument.stock) && !initial,
  );

  useEffect(() => {
    if (!instrument.stock) return;

    let isMounted = true;

    const loadData = async () => {
      let current: StockFinancialData | null | undefined =
        propFinancialData ?? instrument.financialData;
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
        const enriched = await enrichFinancialData(
          current,
          instrument.stock,
          instrument.exchange,
        );
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
            variant: "error",
            title: "Brak danych finansowych",
            category: NOTIFICATION_GROUPS.marketFinancials,
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
  }, [
    instrument.stock,
    instrument.exchange,
    instrument.currency,
    propFinancialData,
    instrument.financialData,
  ]);

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
      <Text
        style={[
          dataItemStyles.dataLabel,
          { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
        ]}
      >
        {label}
      </Text>
      <View style={dataItemStyles.dataValueContainer}>
        <Text
          style={[
            dataItemStyles.dataValue,
            { color: theme.colors.text, fontSize: theme.fontSize.sm },
          ]}
        >
          {value}
        </Text>
        {subValue && (
          <Text
            style={[
              dataItemStyles.dataSubValue,
              {
                color: theme.colors.textMuted,
                fontSize: theme.fontSize.xs,
                marginLeft: theme.spacing.xs,
              },
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  dataLabel: {
    flex: 1,
  },
  dataValueContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  dataValue: {
    fontWeight: "500",
  },
  dataSubValue: {},
});

type InstrumentDetailsProps = {
  financialData: StockFinancialData | null;
  loading: boolean;
  // Na desktopie sekcje układają się w siatkę kolumn zamiast jednej długiej listy
  grid?: boolean;
  // Kategoria decyduje o doborze szablonu pól (akcje, ETF, obligacje, CFD, krypto)
  category?: InstrumentMarketCategory;
};

// Sekcje z danymi rynkowymi instrumentu, filtrowane według szablonu kategorii
export function InstrumentDetails({
  financialData,
  loading,
  grid = false,
  category = "stocks",
}: InstrumentDetailsProps) {
  const theme = useTheme();
  const display = useDisplayCurrency();
  // Wersja formatowania powiązana z bieżącymi ustawieniami waluty (odświeża się na żywo)
  const formatCurrency = (value?: number, currencyCode?: string): string => {
    if (value === undefined || currencyCode === undefined) return "-";
    const converted = display.convertForDisplay(value, currencyCode);
    const symbol = display.displaySymbol(currencyCode);
    return `${converted.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  };

  const cell = grid ? styles.gridCell : undefined;
  const template = getMarketDetailTemplate(category);

  /**
   * Formatuje jedno pole szablonu. Zwraca null, gdy nie ma sensownej wartości.
   * @param field Pole do sformatowania
   * @returns Sformatowana wartość lub null
   */
  const formatField = (
    field: MarketDetailField,
  ): { value: string; subValue?: string } | null => {
    if (!financialData) return null;
    const raw = financialData[field.key];

    if (raw === undefined || raw === null) return null;

    if (typeof raw === "string") {
      if (raw.trim().length === 0) return null;
      if (field.format === "split") {
        return {
          value: `${raw}x`,
          subValue: financialData.lastSplitDate
            ? formatDate(financialData.lastSplitDate)
            : undefined,
        };
      }
      if (field.format === "date") {
        return { value: formatDate(raw) };
      }
      return { value: raw };
    }

    if (!Number.isFinite(raw)) return null;

    const zeroIsMissing =
      field.zeroIsMissing ??
      (field.format !== "change" &&
        field.format !== "changePercent" &&
        field.key !== "price");
    if (raw === 0 && zeroIsMissing) return null;

    switch (field.format) {
      case "currency":
        return { value: formatCurrency(raw, financialData.currency) };
      case "change":
        return {
          value:
            raw >= 0
              ? `+${formatCurrency(raw, financialData.currency)}`
              : formatCurrency(raw, financialData.currency),
        };
      case "changePercent":
        return {
          value: raw >= 0 ? `+${formatPercent(raw)}` : formatPercent(raw),
        };
      case "percent":
        return { value: formatPercent(raw) };
      case "ratio":
        return { value: formatRatio(raw) };
      case "number":
        return { value: formatNumber(raw) };
      case "date":
        return { value: formatDate(String(raw)) };
      case "split":
        return { value: `${raw}x` };
      default:
        return { value: String(raw) };
    }
  };

  return (
    <>
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
          {template.map((section) => {
            const rows = section.fields
              .map((field) => ({ field, formatted: formatField(field) }))
              .filter(
                (
                  row,
                ): row is {
                  field: MarketDetailField;
                  formatted: { value: string; subValue?: string };
                } => row.formatted !== null,
              );

            if (rows.length === 0) return null;

            return (
              <View key={section.key} style={cell}>
                <Section label={section.label}>
                  {rows.map((row, index) => (
                    <DataItem
                      key={row.field.key}
                      label={row.field.label}
                      value={row.formatted.value}
                      subValue={row.formatted.subValue}
                      divider={index < rows.length - 1}
                    />
                  ))}
                </Section>
              </View>
            );
          })}
        </View>
      )}

      <Text
        style={[
          styles.footerNote,
          {
            color: theme.colors.textMuted,
            fontSize: theme.fontSize.xs,
            marginTop: theme.spacing.lg,
          },
        ]}
      >
        Dane edukacyjne · mogą być opóźnione
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  footerNote: {
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 40,
  },
  gridCell: {
    flexGrow: 1,
    flexBasis: 300,
  },
});
