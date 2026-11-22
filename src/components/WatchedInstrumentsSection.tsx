import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  getCachedQuoteDetails,
  getStockQuoteDetails,
  type StockQuoteDetails,
} from "../api/marketService";
import { useDisplayCurrency } from "../displayCurrency";
import { usePortfolios } from "../portfolio/PortfolioProvider";
import { useTheme } from "../theme";
import { useWatchlist, type WatchlistInstrument } from "../watchlist";
import { InstrumentCard } from "./InstrumentCard";
import { InstrumentRow } from "./InstrumentRow";

type Holding = {
  quantity: number;
  averagePrice: number;
  currency?: string;
};

const HOLDING_ALIASES: Record<string, string> = {
  "BTC-USD": "BTC",
  "ETH-USD": "ETH",
};

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export function WatchedInstrumentsSection() {
  const { colors, rates } = useTheme();
  const display = useDisplayCurrency();
  const { instruments } = useWatchlist();
  const { activePortfolio } = usePortfolios();

  const holdings = useMemo(() => {
    const map: Record<string, Holding> = {};
    for (const category of activePortfolio?.categories ?? []) {
      for (const item of category.items) {
        map[item.symbol] = {
          quantity: item.ownedQuantity,
          averagePrice: item.averageBuyPrice,
          currency: item.currency,
        };
      }
    }
    return map;
  }, [activePortfolio]);

  const cachedInitial = useMemo(() => {
    const map: Record<string, StockQuoteDetails | null> = {};
    let allFound = instruments.length > 0;
    for (const inst of instruments) {
      const cached = getCachedQuoteDetails(inst.symbol, inst.exchange);
      if (cached) {
        map[inst.symbol] = cached;
      } else {
        allFound = false;
      }
    }
    return { map, allFound };
  }, [instruments]);

  const [quotes, setQuotes] = useState<
    Record<string, StockQuoteDetails | null>
  >(cachedInitial.map);
  const [loading, setLoading] = useState(!cachedInitial.allFound);
  const [selected, setSelected] = useState<WatchlistInstrument | null>(null);

  useEffect(() => {
    let active = true;

    const loadQuotes = async () => {
      if (!cachedInitial.allFound) {
        setLoading(true);
      }
      const entries = await Promise.all(
        instruments.map(async (instrument) => {
          const quote = await getStockQuoteDetails(
            instrument.symbol,
            instrument.exchange,
          );
          return [instrument.symbol, quote] as const;
        }),
      );
      if (!active) return;
      setQuotes(Object.fromEntries(entries));
      setLoading(false);
    };

    void loadQuotes();

    return () => {
      active = false;
    };
  }, [instruments, cachedInitial.allFound]);

  const findHolding = (symbol: string): Holding | undefined => {
    const alias = HOLDING_ALIASES[symbol];
    return holdings[symbol] ?? (alias ? holdings[alias] : undefined);
  };

  if (instruments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Brak obserwowanych instrumentów
        </Text>
        <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
          Otwórz szczegóły instrumentu i dotknij serca, aby dodać go do
          obserwowanych.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {instruments.map((instrument, index) => {
        const quote = quotes[instrument.symbol];
        const holding = findHolding(instrument.symbol);
        const holdingCurrency =
          holding?.currency ?? quote?.currency ?? instrument.currency;
        const quotePrice =
          quote && holding?.currency && quote.currency !== holding.currency
            ? quote.price *
              ((rates[quote.currency] ?? 1) / (rates[holding.currency] ?? 1))
            : quote?.price;
        const profit =
          holding && typeof quotePrice === "number" && quotePrice > 0
            ? (quotePrice - holding.averagePrice) * holding.quantity
            : null;
        const profitPercent =
          holding &&
          typeof quotePrice === "number" &&
          quotePrice > 0 &&
          holding.averagePrice > 0
            ? ((quotePrice - holding.averagePrice) / holding.averagePrice) * 100
            : null;
        const profitTone =
          (profit ?? 0) >= 0 ? colors.positive : colors.negative;

        return (
          <InstrumentRow
            key={instrument.symbol}
            symbol={instrument.symbol}
            name={instrument.name}
            exchangeName={instrument.exchange}
            price={quote?.price}
            changePercent={quote?.changePercent}
            currency={quote?.currency ?? instrument.currency}
            divider={index < instruments.length - 1}
            loading={loading}
            onPress={() => setSelected(instrument)}
            secondary={
              profit !== null && profitPercent !== null ? (
                <Text
                  numberOfLines={1}
                  style={[styles.profit, { color: profitTone }]}
                >
                  {`${profit >= 0 ? "+" : "-"}${display.formatMoneyForDisplay(profit, holdingCurrency)} (${formatPercent(profitPercent)})`}
                </Text>
              ) : null
            }
          />
        );
      })}

      {selected && (
        <InstrumentCard
          instrument={{
            stock: selected.symbol,
            title: selected.name.toUpperCase(),
            currency: selected.currency,
            symbol: selected.symbol,
            exchange: selected.exchange,
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  profit: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  emptyCopy: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
