import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  getStockQuotesBatch,
  type StockQuoteDetails,
} from "../api/marketService";
import { convertCurrency, currencySymbol } from "../currency";
import {
  getCategories,
  getPositions,
  getTransactions,
  getWallets,
  type AssetCategory,
  type Position,
  type Transaction,
  type Wallet,
} from "../database/database";
import { MARKET_INSTRUMENT_INFO } from "../instrumentCategories";
import { useTheme } from "../theme";
import { getPillarOption, resolvePillarKey } from "./pillars";
import type {
  Portfolio,
  PortfolioAssetItem,
  PortfolioCategory,
  TransactionHistoryItem,
} from "./types";

type PortfolioContextValue = {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  activeWalletId: number | null;
  setActiveWalletId: (walletId: number) => void;
  loading: boolean;
  reload: () => Promise<Portfolio[]>;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const quoteKey = (symbol: string, exchange?: string | null) =>
  `${symbol}_${exchange || ""}`;

const dateOnly = (timestamp: number) =>
  new Date(timestamp).toISOString().slice(0, 10);

function buildHistory(
  transactions: Transaction[],
  symbol: string,
  type: "BUY" | "SELL",
): TransactionHistoryItem[] {
  return transactions
    .filter(
      (transaction) =>
        transaction.symbol === symbol && transaction.type === type,
    )
    .sort((a, b) => a.created_at - b.created_at)
    .map((transaction) => ({
      id: String(transaction.id),
      date: dateOnly(transaction.created_at),
      type,
      quantity: transaction.quantity,
      price: transaction.price,
      total: transaction.quantity * transaction.price,
    }));
}

function buildActivePurchaseHistory(
  lots: Position[],
): TransactionHistoryItem[] {
  return lots
    .filter((lot) => lot.remaining_quantity > 0)
    .sort((a, b) => a.opened_at - b.opened_at)
    .map((lot) => ({
      id: String(lot.id),
      date: dateOnly(lot.opened_at),
      type: "BUY",
      quantity: lot.remaining_quantity,
      price: lot.buy_price,
      total: lot.remaining_quantity * lot.buy_price,
    }));
}

function buildCategory(
  category: AssetCategory,
  positions: Position[],
  transactions: Transaction[],
  quotes: Record<string, StockQuoteDetails | null>,
  walletCurrency: string,
  rates: Record<string, number>,
): PortfolioCategory {
  const kind = resolvePillarKey(category.kind, category.name);
  const pillar = getPillarOption(kind);
  const info = MARKET_INSTRUMENT_INFO[kind];

  const positionsBySymbol = new Map<string, Position[]>();
  for (const position of positions) {
    if (position.category_id !== category.id) continue;
    if (position.remaining_quantity <= 0) continue;
    const list = positionsBySymbol.get(position.symbol) ?? [];
    list.push(position);
    positionsBySymbol.set(position.symbol, list);
  }

  const items: PortfolioAssetItem[] = [];

  for (const [symbol, lots] of positionsBySymbol) {
    const quantity = lots.reduce((sum, lot) => sum + lot.remaining_quantity, 0);
    if (quantity <= 0) continue;

    const totalCost = lots.reduce(
      (sum, lot) => sum + lot.remaining_quantity * lot.buy_price,
      0,
    );
    const averageBuyPrice = totalCost / quantity;
    const firstLot = lots.reduce(
      (earliest, lot) => (lot.opened_at < earliest ? lot.opened_at : earliest),
      lots[0].opened_at,
    );
    const exchange = lots.find((lot) => lot.exchange)?.exchange ?? "";
    const quote = quotes[quoteKey(symbol, exchange)];
    const instrumentCurrency =
      lots.find((lot) => lot.currency)?.currency ??
      quote?.currency ??
      walletCurrency;
    const currentPrice =
      quote && quote.price > 0 ? quote.price : averageBuyPrice;
    const totalValue = quantity * currentPrice;
    const profitCurrency = totalValue - totalCost;
    const profitPercent =
      totalCost > 0 ? (profitCurrency / totalCost) * 100 : 0;

    items.push({
      id: `${category.id}-${symbol}`,
      symbol,
      name: lots.find((lot) => lot.name)?.name ?? symbol,
      exchange,
      category: kind,
      currency: instrumentCurrency,
      ownedQuantity: quantity,
      averageBuyPrice,
      currentPrice,
      totalValue,
      profitCurrency,
      profitPercent,
      firstPurchasedDate: dateOnly(firstLot),
      returns: {
        oneMonth: 0,
        threeMonths: 0,
        oneYear: quote?.changePercent ?? 0,
      },
      description: info.description,
      assetClassInfo: info.assetClassInfo,
      riskLevel: info.riskLevel,
      purchaseHistory: buildActivePurchaseHistory(lots),
      salesHistory: buildHistory(transactions, symbol, "SELL"),
    });
  }

  let totalValue = 0;
  let costValue = 0;

  for (const item of items) {
    const currentWalletPrice = convertCurrency(
      item.currentPrice,
      item.currency,
      walletCurrency,
      rates,
    );
    const costWalletPrice = convertCurrency(
      item.averageBuyPrice,
      item.currency,
      walletCurrency,
      rates,
    );
    totalValue += item.ownedQuantity * currentWalletPrice;
    costValue += item.ownedQuantity * costWalletPrice;
  }

  const profitCurrency = totalValue - costValue;
  const profitPercent = costValue > 0 ? (profitCurrency / costValue) * 100 : 0;

  return {
    id: kind,
    categoryId: category.id,
    kind,
    title: pillar.title,
    subtitle: pillar.description,
    pastelBgLight: pillar.pastelLight,
    pastelBgDark: pillar.pastelDark,
    accentColor: pillar.color,
    totalValue,
    profitCurrency,
    profitPercent,
    items,
  };
}

export function PortfolioProvider({ children }: PropsWithChildren) {
  const { activeAccount, rates } = useTheme();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activeWalletId, setActiveWalletIdState] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async (
    options?: { forceRefresh?: boolean; background?: boolean },
  ): Promise<Portfolio[]> => {
    const currentRequest = ++requestId.current;
    await Promise.resolve();
    if (!options?.background) setLoading(true);

    try {
      const userId = activeAccount?.id ?? 1;
      const wallets = await getWallets(userId);

      const snapshots = await Promise.all(
        wallets.map(async (wallet: Wallet) => {
          const [categories, positions, transactions] = await Promise.all([
            getCategories(wallet.id),
            getPositions(wallet.id),
            getTransactions(wallet.id),
          ]);
          return { wallet, categories, positions, transactions };
        }),
      );

      const instruments = new Map<
        string,
        { symbol: string; exchange?: string }
      >();
      for (const snapshot of snapshots) {
        for (const position of snapshot.positions) {
          if (position.remaining_quantity <= 0) continue;
          instruments.set(quoteKey(position.symbol, position.exchange), {
            symbol: position.symbol,
            exchange: position.exchange ?? undefined,
          });
        }
      }

      const quotes = instruments.size
        ? await getStockQuotesBatch(
            Array.from(instruments.values()),
            { forceRefresh: options?.forceRefresh },
          )
        : {};

      const next = snapshots.map((snapshot): Portfolio => {
        const categories = snapshot.categories.map((category) =>
          buildCategory(
            category,
            snapshot.positions,
            snapshot.transactions,
            quotes,
            snapshot.wallet.currency,
            rates,
          ),
        );

        const assetsValue = categories.reduce(
          (sum, category) => sum + category.totalValue,
          0,
        );
        const costValue = categories.reduce(
          (sum, category) =>
            sum + category.totalValue - category.profitCurrency,
          0,
        );
        const profitCurrency = categories.reduce(
          (sum, category) => sum + category.profitCurrency,
          0,
        );

        return {
          id: String(snapshot.wallet.id),
          walletId: snapshot.wallet.id,
          name: snapshot.wallet.name,
          currency: snapshot.wallet.currency,
          currencySymbol: currencySymbol(snapshot.wallet.currency),
          cashBalance: snapshot.wallet.balance,
          totalValue: snapshot.wallet.balance + assetsValue,
          profitCurrency,
          profitPercent: costValue > 0 ? (profitCurrency / costValue) * 100 : 0,
          categories,
        };
      });

      if (requestId.current === currentRequest) {
        setPortfolios(next);
      }
      return next;
    } catch (error) {
      console.error("Nie udało się wczytać portfeli:", error);
      if (requestId.current === currentRequest) {
        setPortfolios([]);
      }
      return [];
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
      }
    }
  }, [activeAccount, rates]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const refreshPortfolioQuotes = () => {
      if (AppState.currentState !== "active") return;
      void load({ forceRefresh: true, background: true });
    };

    const interval = setInterval(refreshPortfolioQuotes, 2 * 60 * 1000);
    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") refreshPortfolioQuotes();
      },
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [load]);

  const setActiveWalletId = useCallback((walletId: number) => {
    setActiveWalletIdState(walletId);
  }, []);

  const effectiveWalletId = portfolios.some(
    (portfolio) => portfolio.walletId === activeWalletId,
  )
    ? activeWalletId
    : (portfolios[0]?.walletId ?? null);

  const activePortfolio = useMemo(
    () =>
      portfolios.find(
        (portfolio) => portfolio.walletId === effectiveWalletId,
      ) ?? null,
    [effectiveWalletId, portfolios],
  );

  const value = useMemo(
    () => ({
      portfolios,
      activePortfolio,
      activeWalletId: effectiveWalletId,
      setActiveWalletId,
      loading,
      reload: load,
    }),
    [
      activePortfolio,
      effectiveWalletId,
      load,
      loading,
      portfolios,
      setActiveWalletId,
    ],
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolios(): PortfolioContextValue {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolios must be used inside PortfolioProvider");
  }
  return context;
}
