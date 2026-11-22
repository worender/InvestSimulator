import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

/**
 * Lista obserwowanych instrumentów (zakładka „Obserwowane” na ekranie rynku).
 *
 * Stan jest trzymany tylko w pamięci — po ponownym uruchomieniu aplikacji lista
 * wraca do wartości domyślnych (`DEFAULT_WATCHLIST`).
 *
 * @module src/watchlist
 */

/** Instrument na liście obserwowanych. */
export type WatchlistInstrument = {
  /** Symbol instrumentu (klucz unikalności na liście). */
  symbol: string;
  /** Nazwa wyświetlana. */
  name: string;
  /** Giełda notowań, np. `"GPW"`. */
  exchange: string;
  /** Waluta notowań, np. `"PLN"`. */
  currency: string;
};

/** Instrumenty obserwowane na starcie: PKO, NVIDIA, Bitcoin i złoto. */
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

/** Wartość kontekstu listy obserwowanych. */
type WatchlistContextValue = {
  /** Obserwowane instrumenty; ostatnio dodany jest pierwszy. */
  instruments: WatchlistInstrument[];
  /** Sprawdza, czy instrument o danym symbolu jest obserwowany. */
  isWatched: (symbol: string) => boolean;
  /** Dodaje instrument na początek listy albo usuwa go, jeśli już jest obserwowany. */
  toggle: (instrument: WatchlistInstrument) => void;
  /** Usuwa instrument o danym symbolu (brak symbolu na liście — nic się nie dzieje). */
  remove: (symbol: string) => void;
};

/** Kontekst listy obserwowanych; `null` poza {@link WatchlistProvider}. */
const WatchlistContext = createContext<WatchlistContextValue | null>(null);

/**
 * Dostawca listy obserwowanych instrumentów (stan w pamięci).
 *
 * @param props Właściwości komponentu; `children` — drzewo aplikacji, które ma dostęp do listy.
 */
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

/**
 * Zwraca listę obserwowanych instrumentów i funkcje do jej zmiany.
 *
 * @returns Obiekt `{ instruments, isWatched, toggle, remove }`.
 * @throws {Error} Gdy hook użyto poza {@link WatchlistProvider}.
 */
export function useWatchlist() {
  const value = useContext(WatchlistContext);
  if (!value) {
    throw new Error("useWatchlist musi zostać użyty w WatchlistProvider");
  }
  return value;
}
