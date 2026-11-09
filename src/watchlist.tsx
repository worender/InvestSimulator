import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type WatchlistInstrument = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
};

const DEFAULT_WATCHLIST: WatchlistInstrument[] = [
  {
    symbol: "PKO",
    name: "PKO Bank Polski",
    exchange: "GPW",
    currency: "PLN",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    exchange: "CCC",
    currency: "USD",
  },
  {
    symbol: "GC=F",
    name: "Złoto",
    exchange: "COMEX",
    currency: "USD",
  },
];

type WatchlistContextValue = {
  instruments: WatchlistInstrument[];
  isWatched: (symbol: string) => boolean;
  toggle: (instrument: WatchlistInstrument) => void;
  remove: (symbol: string) => void;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: PropsWithChildren) {
  const [instruments, setInstruments] =
    useState<WatchlistInstrument[]>(DEFAULT_WATCHLIST);

  const isWatched = useCallback(
    (symbol: string) => instruments.some((item) => item.symbol === symbol),
    [instruments],
  );

  const toggle = useCallback((instrument: WatchlistInstrument) => {
    setInstruments((current) =>
      current.some((item) => item.symbol === instrument.symbol)
        ? current.filter((item) => item.symbol !== instrument.symbol)
        : [instrument, ...current],
    );
  }, []);

  const remove = useCallback((symbol: string) => {
    setInstruments((current) =>
      current.filter((item) => item.symbol !== symbol),
    );
  }, []);

  const value = useMemo(
    () => ({ instruments, isWatched, toggle, remove }),
    [instruments, isWatched, remove, toggle],
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const value = useContext(WatchlistContext);
  if (!value) {
    throw new Error("useWatchlist musi zostać użyty w WatchlistProvider");
  }
  return value;
}
