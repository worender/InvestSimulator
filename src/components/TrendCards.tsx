import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CandleData,
  DynamicTrendAsset,
  canRetryFetch,
  getCachedDynamicTrends,
  getCachedStockCandles,
  getDynamicTrends,
  getStockCandles,
} from "../api/marketService";
import { currencySymbol, resolveCurrency } from "../currency";
import { useDisplayCurrency } from "../displayCurrency";
import { NOTIFICATION_GROUPS, notify } from "../notificationBus";
import { useTheme } from "../theme";
import { CategorySelector } from "./CategorySelector";
import { CHART_RANGES } from "./ChartFullscreenModal";
import { ModalChartView } from "./ModalChartView";
import { Skeleton } from "./Skeleton";
import { TrendChart, trendChangePercent } from "./TrendChart";

type Category = { key: string; label: string };
const categories: Category[] = [
  { key: "gainers", label: "Zyskujące" },
  { key: "active", label: "Zaskakujące" },
  { key: "technology", label: "BigTech" },
  { key: "undervalued", label: "Okazje" },
  { key: "cfd", label: "Rynek CFD" },
  { key: "crypto", label: "Krypto" },
];

const STATIC_TRENDS: Record<string, DynamicTrendAsset[]> = {
  cfd: [
    {
      symbol: "GC=F",
      name: "Złoto",
      exchange: "COMEX",
      exchangeName: "COMEX",
      changePercent: 0,
    },
    {
      symbol: "CL=F",
      name: "Ropa WTI",
      exchange: "NYMEX",
      exchangeName: "NYMEX",
      changePercent: 0,
    },
    {
      symbol: "BZ=F",
      name: "Ropa Brent",
      exchange: "ICE",
      exchangeName: "ICE",
      changePercent: 0,
    },
    {
      symbol: "SI=F",
      name: "Srebro",
      exchange: "COMEX",
      exchangeName: "COMEX",
      changePercent: 0,
    },
    {
      symbol: "NG=F",
      name: "Gaz ziemny",
      exchange: "NYMEX",
      exchangeName: "NYMEX",
      changePercent: 0,
    },
    {
      symbol: "HG=F",
      name: "Miedź",
      exchange: "COMEX",
      exchangeName: "COMEX",
      changePercent: 0,
    },
  ],
  crypto: [
    {
      symbol: "BTC-USD",
      name: "Bitcoin",
      exchange: "CCC",
      exchangeName: "Kryptowaluty",
      changePercent: 0,
    },
    {
      symbol: "ETH-USD",
      name: "Ethereum",
      exchange: "CCC",
      exchangeName: "Kryptowaluty",
      changePercent: 0,
    },
    {
      symbol: "SOL-USD",
      name: "Solana",
      exchange: "CCC",
      exchangeName: "Kryptowaluty",
      changePercent: 0,
    },
    {
      symbol: "XRP-USD",
      name: "XRP",
      exchange: "CCC",
      exchangeName: "Kryptowaluty",
      changePercent: 0,
    },
    {
      symbol: "ADA-USD",
      name: "Cardano",
      exchange: "CCC",
      exchangeName: "Kryptowaluty",
      changePercent: 0,
    },
    {
      symbol: "DOGE-USD",
      name: "Dogecoin",
      exchange: "CCC",
      exchangeName: "Kryptowaluty",
      changePercent: 0,
    },
  ],
};

function pickRandom<T>(items: readonly T[], count: number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next.slice(0, count);
}

const TREND_RANGE_INDEX = Math.max(
  0,
  CHART_RANGES.findIndex((range) => range.days === 30),
);

function getInitialCategoryData(cat: string) {
  const staticTrends = STATIC_TRENDS[cat];
  const cachedTrends = staticTrends
    ? staticTrends.slice(0, 3)
    : getCachedDynamicTrends(cat)?.slice(0, 3);
  if (!cachedTrends || cachedTrends.length === 0) {
    return { assets: [], data: {}, isReady: false };
  }

  const candlesMap: Record<string, CandleData[]> = {};
  let allFound = true;
  for (const asset of cachedTrends) {
    const cachedCandles = getCachedStockCandles(
      asset.symbol,
      "1d",
      30,
      asset.exchange,
    );
    if (cachedCandles && cachedCandles.length > 0) {
      candlesMap[asset.symbol] = cachedCandles;
    } else {
      allFound = false;
    }
  }

  return {
    assets: cachedTrends,
    data: candlesMap,
    isReady: allFound && cachedTrends.length > 0,
  };
}

// Komponent wyświetlający karty trendów dla różnych kategorii aktywów giełdowych
export function TrendCards() {
  const { colors } = useTheme();
  const [category, setCategory] = useState("gainers");
  const initial = useMemo(() => getInitialCategoryData("gainers"), []);
  const [assets, setAssets] = useState<DynamicTrendAsset[]>(initial.assets);
  const [data, setData] = useState<Record<string, CandleData[]>>(initial.data);
  const [loadedCategory, setLoadedCategory] = useState(
    initial.isReady ? "gainers" : "",
  );
  const [selectedAsset, setSelectedAsset] = useState<DynamicTrendAsset | null>(
    null,
  );
  const loading = loadedCategory !== category;

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const cached = getInitialCategoryData(newCategory);
    if (cached.isReady) {
      setAssets(cached.assets);
      setData(cached.data);
      setLoadedCategory(newCategory);
    }
  };

  useEffect(() => {
    let active = true;

    const loadTrendsAndCandles = async () => {
      try {
        const staticTrends = STATIC_TRENDS[category];
        const trends = staticTrends
          ? pickRandom(staticTrends, 3)
          : await getDynamicTrends(category);

        if (!active) return;
        const selectedTrends = trends.slice(0, 3);
        setAssets(selectedTrends);

        // Pobieranie danych (z pamięci podręcznej lub z API)
        const candlesResults = await Promise.all(
          selectedTrends.map(async (asset) => {
            try {
              if (!canRetryFetch(asset.symbol)) {
                return [asset.symbol, []] as const;
              }
              const candles = await getStockCandles(
                asset.symbol,
                "1d",
                30,
                asset.exchange,
              );
              return [asset.symbol, candles ?? []] as const;
            } catch (error) {
              console.error(
                `Błąd pobierania świec dla ${asset.symbol}:`,
                error,
              );
              return [asset.symbol, []] as const;
            }
          }),
        );

        if (active) {
          setData(Object.fromEntries(candlesResults));
          setLoadedCategory(category);
        }
      } catch (error) {
        console.error("Błąd ładowania trendów:", error);
        if (active) {
          setData((prevData) => {
            if (Object.keys(prevData).length === 0) {
              notify({
                variant: "error",
                title: "Błąd ładowania trendów",
                category: NOTIFICATION_GROUPS.marketTrends,
                message:
                  "Nie udało się pobrać danych trendów. Spróbuj ponownie później.",
              });
            }
            return prevData;
          });
        }
      }
    };

    void loadTrendsAndCandles();

    return () => {
      active = false;
    };
  }, [category]);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <CategorySelector
          options={categories}
          value={category}
          onChange={handleCategoryChange}
          accessibilityLabel="Kategoria trendów"
        />
      </View>
      {loading ? (
        <View>
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              style={[
                styles.item,
                item < 3 && { borderBottomColor: colors.borderGlass },
              ]}
            >
              <View style={styles.row}>
                <Skeleton width={34} height={34} radius={17} />
                <View style={styles.copy}>
                  <Skeleton width="55%" height={14} />
                  <Skeleton width="38%" height={10} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={54} height={22} radius={11} />
              </View>
              <View style={styles.chartSkeleton}>
                <Skeleton
                  width="100%"
                  height={1}
                  radius={0}
                  style={styles.chartLineTop}
                />
                <Skeleton
                  width="100%"
                  height={1}
                  radius={0}
                  style={styles.chartLineMiddle}
                />
                <Skeleton
                  width="70%"
                  height={4}
                  radius={3}
                  style={styles.chartStroke}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View>
          {assets.slice(0, 3).map((asset, index) => (
            <TrendCard
              key={asset.symbol}
              asset={asset}
              candles={data[asset.symbol] ?? []}
              colors={colors}
              showSeparator={index < Math.min(assets.length, 3) - 1}
              onPress={() => setSelectedAsset(asset)}
            />
          ))}
        </View>
      )}

      {selectedAsset && (
        <ModalChartView
          instrument={toModalInstrument(selectedAsset)}
          initialRangeIndex={TREND_RANGE_INDEX}
          initialInterval="1d"
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </View>
  );
}

// Komponent wyświetlający pojedynczą kartę trendu dla danego aktywa giełdowego
function TrendCard({
  asset,
  candles,
  colors,
  showSeparator,
  onPress,
}: {
  asset: DynamicTrendAsset;
  candles: CandleData[];
  colors: ReturnType<typeof useTheme>["colors"];
  showSeparator: boolean;
  onPress: () => void;
}) {
  const display = useDisplayCurrency();
  const currency = resolveCurrency(asset);
  const latest = candles[candles.length - 1];
  const values = candles.map((item) => ({
    timestamp: item.timestamp,
    value: display.convertForDisplay(item.close, currency),
  }));
  const hasChart = values.length > 1;
  
  const change = trendChangePercent(values, asset.changePercent);
  const tone = change >= 0 ? colors.positive : colors.negative;
  const changeLabel = `${change >= 0 ? "+" : ""}${change.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Otwórz wykres ${asset.name}`}
      style={({ pressed }) => [
        styles.item,
        showSeparator && { borderBottomColor: colors.border },
        pressed && styles.itemPressed,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor:
                change >= 0 ? colors.positiveGlass : colors.negativeGlass,
            },
          ]}
        >
          <Ionicons
            name={change >= 0 ? "trending-up-outline" : "trending-down-outline"}
            size={18}
            color={tone}
          />
        </View>
        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.name, { color: colors.text }]}
          >
            {truncate(asset.name, 24)}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.meta, { color: colors.textMuted }]}
          >
            {asset.exchangeName}
            {latest
              ? ` · ${display
                  .convertForDisplay(latest.close, currency)
                  .toLocaleString("pl-PL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ${display.displaySymbol(currency)}`
              : ` · ${display.displaySymbol(currency)}`}
          </Text>
        </View>
        <View
          style={[
            styles.changeBadge,
            {
              backgroundColor:
                change >= 0 ? colors.positiveGlass : colors.negativeGlass,
            },
          ]}
        >
          <Ionicons
            name={change >= 0 ? "arrow-up" : "arrow-down"}
            size={11}
            color={tone}
          />
          <Text style={[styles.changeText, { color: tone }]}>
            {changeLabel}
          </Text>
        </View>
      </View>
      {hasChart ? (
        <TrendChart data={values} height={88} style={styles.chart} />
      ) : (
        <View style={styles.chartEmpty}>
          <Ionicons
            name="analytics-outline"
            size={18}
            color={colors.textMuted}
          />
          <Text style={[styles.chartEmptyText, { color: colors.textMuted }]}>
            Brak danych do wykresu
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function toModalInstrument(asset: DynamicTrendAsset) {
  const currency = resolveCurrency(asset);
  return {
    stock: asset.symbol,
    title: asset.name.toUpperCase(),
    currency,
    symbol: currencySymbol(currency),
    exchange: asset.exchange,
  };
}

function truncate(value: string, limit: number) {
  return value.length > limit
    ? `${value.slice(0, limit - 1).trimEnd()}…`
    : value;
}

// Stylesheet dla komponentu TrendCards (karty trendów)
const styles = StyleSheet.create({
  sectionHeader: { marginBottom: 10, gap: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  itemPressed: { opacity: 0.72 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, marginLeft: 10 },
  name: { fontWeight: "700", fontSize: 14 },
  meta: { fontSize: 11, marginTop: 3 },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 11,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  chart: { marginTop: 12 },
  chartEmpty: {
    height: 88,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chartEmptyText: { fontSize: 11, fontWeight: "500" },
  chartSkeleton: { height: 88, marginTop: 12, position: "relative" },
  chartLineTop: { position: "absolute", top: 16, left: 0, right: 0 },
  chartLineMiddle: { position: "absolute", top: 52, left: 0, right: 0 },
  chartStroke: { position: "absolute", top: 44, left: 10 },
});
