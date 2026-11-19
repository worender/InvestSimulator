/**
 * Klient REST backendu InvestSimulator (dane rynkowe).
 *
 * Moduł odpowiada za:
 * - ustalenie adresu backendu ({@link getApiBaseUrl}),
 * - anonimowe uwierzytelnianie urządzenia tokenem JWT (`POST /api/guest`),
 *   przechowywanym w `expo-secure-store` (na webie w `localStorage`),
 *   z automatycznym odświeżeniem po odpowiedzi `401`/`403`,
 * - pobieranie świec, trendów, notowań, danych finansowych i wyników historycznych,
 * - cache w pamięci z podejściem *stale-while-revalidate*: przeterminowane dane
 *   są zwracane od razu, a świeże pobierane w tle,
 * - łączenie równoległych żądań o te same dane w jedno.
 *
 * Błędy sieci nie są rzucane do wywołującego — funkcje zwracają `null` lub
 * pustą tablicę i pokazują powiadomienie przez `notificationBus`.
 *
 * Opis endpointów backendu: moduł `backend/server`.
 *
 * @module src/api/marketService
 */

import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { NOTIFICATION_GROUPS, notify } from "../notificationBus";

/** Domyślny port backendu (musi zgadzać się z `PORT` w `backend/.env`). */
const API_PORT = 3000;
/** Adres backendu na tym samym komputerze — ostateczna wartość domyślna. */
const LOCAL_BASE_URL = `http://localhost:${API_PORT}`;

/**
 * Usuwa białe znaki i końcowe ukośniki z adresu, np.
 * `" http://host:3000/ "` → `"http://host:3000"`.
 *
 * @param url Adres do znormalizowania.
 * @returns Adres bez końcowego `/`.
 */
const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

/**
 * Sprawdza, czy host jest adresem w sieci lokalnej: `localhost`, `::1`,
 * domena `.local` albo adres IPv4.
 *
 * Adres serwera Metro jest użyteczny tylko w sieci lokalnej (LAN, Tailscale).
 * Dla tunelu Expo (np. `*.exp.direct`) nie wskazuje backendu — wtedy trzeba
 * ustawić `EXPO_PUBLIC_API_URL`.
 *
 * @param host Nazwa hosta bez portu.
 * @returns `true`, gdy host jest lokalny.
 */
const isLocalHost = (host: string) =>
  host === "localhost" ||
  host === "::1" ||
  host === "[::1]" ||
  host.endsWith(".local") ||
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

/**
 * Odczytuje host serwera deweloperskiego Metro z konfiguracji Expo
 * (`expoConfig.hostUri` lub `expoGoConfig.debuggerHost`).
 *
 * Telefon z Expo Go łączy się z Metro na komputerze, więc ten sam host
 * wskazuje backend uruchomiony na tym komputerze. Hosty spoza sieci lokalnej
 * (tunel Expo) są pomijane z ostrzeżeniem w konsoli.
 *
 * @returns Host (np. `"192.168.1.20"`) albo `null`, gdy brak lub nie jest lokalny.
 */
const getDevServerHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (!hostUri) return null;

  try {
    const host = new URL(
      hostUri.includes("://") ? hostUri : `http://${hostUri}`,
    ).hostname;
    if (!isLocalHost(host)) {
      console.warn(
        `Pomijam adres serwera deweloperskiego "${host}" (tunel Expo). Ustaw EXPO_PUBLIC_API_URL, aby wskazać adres backendu.`,
      );
      return null;
    }
    return host;
  } catch {
    return null;
  }
};

/**
 * Ustala adres backendu według priorytetu:
 * 1. zmienna `EXPO_PUBLIC_API_URL`,
 * 2. host serwera Metro ({@link getDevServerHost}) z portem {@link API_PORT},
 * 3. pole `url` z `GET http://localhost:3000/api/config`,
 * 4. {@link LOCAL_BASE_URL}.
 *
 * Dzięki `EXPO_PUBLIC_API_URL` ten sam kod obsługuje pracę lokalną i przez
 * tunel (Tailscale, cloudflared itp.).
 *
 * @returns Adres bazowy backendu bez końcowego `/`.
 */
const resolveApiBaseUrl = async (): Promise<string> => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  const devServerHost = getDevServerHost();
  if (devServerHost) {
    return `http://${devServerHost}:${API_PORT}`;
  }

  // Ostatnia szansa: backend zapisuje swój adres w /api/config
  try {
    const response = await fetch(`${LOCAL_BASE_URL}/api/config`);
    if (response.ok) {
      const config = await response.json();
      if (typeof config?.url === "string" && config.url.trim()) {
        return normalizeBaseUrl(config.url);
      }
    }
  } catch (error) {
    console.warn("Nie udało się pobrać adresu API z /api/config:", error);
  }

  return LOCAL_BASE_URL;
};

/** Zapamiętany wynik `resolveApiBaseUrl` — adres jest ustalany raz na uruchomienie. */
let apiBaseUrlPromise: Promise<string> | null = null;

/**
 * Zwraca adres bazowy backendu, np. `"http://192.168.1.20:3000"`.
 *
 * Adres jest ustalany przy pierwszym wywołaniu (kolejność źródeł opisana
 * w `resolveApiBaseUrl`), a kolejne wywołania zwracają ten sam wynik.
 *
 * @returns Obietnica adresu bez końcowego `/`.
 */
export const getApiBaseUrl = (): Promise<string> => {
  apiBaseUrlPromise ??= resolveApiBaseUrl();
  return apiBaseUrlPromise;
};

/** Jedna świeca (OHLC) wykresu — element odpowiedzi `GET /api/candles`. */
export interface CandleData {
  /** Początek świecy jako znacznik czasu w milisekundach. */
  timestamp: number;
  /** Cena otwarcia. */
  open: number;
  /** Najwyższa cena w okresie świecy. */
  high: number;
  /** Najniższa cena w okresie świecy. */
  low: number;
  /** Cena zamknięcia. */
  close: number;
}

/** Wynik wyszukiwarki instrumentów — element odpowiedzi `GET /api/instruments/search`. */
export interface InstrumentSearchResult {
  /** Symbol Yahoo, np. `"PKO.WA"`, `"AAPL"`. */
  symbol: string;
  /** Pełna lub skrócona nazwa instrumentu. */
  name: string;
  /** Kod giełdy w Yahoo, np. `"WSE"`, `"NMS"`. */
  exchange: string;
  /** Czytelna nazwa giełdy, np. `"Warsaw"`, `"NASDAQ"`. */
  exchangeName: string;
  /** Typ instrumentu w Yahoo, np. `"EQUITY"`, `"ETF"`, `"CRYPTOCURRENCY"`. */
  quoteType: string;
}

/** Status giełdy dla instrumentu — odpowiedź `GET /api/instruments/quote`. */
export interface InstrumentQuote {
  /** Symbol Yahoo po normalizacji. */
  symbol: string;
  /** Nazwa giełdy. */
  exchange: string;
  /** Stan rynku w Yahoo, np. `"REGULAR"`, `"PRE"`, `"POST"`, `"CLOSED"`. */
  marketState: string;
  /** `true`, gdy trwa sesja (również przed- i posesyjna). */
  isOpen: boolean;
}

/** Instrument z listy trendów — element odpowiedzi `GET /api/trends`. */
export interface DynamicTrendAsset {
  /** Symbol Yahoo. */
  symbol: string;
  /** Nazwa instrumentu. */
  name: string;
  /** Kod giełdy w Yahoo. */
  exchange: string;
  /** Czytelna nazwa giełdy. */
  exchangeName: string;
  /** Dzienna zmiana ceny w procentach. */
  changePercent: number;
}

/**
 * Odczytuje wartość z bezpiecznego magazynu: `expo-secure-store` na iOS
 * i Androidzie, `localStorage` na webie.
 *
 * @param key Klucz wartości.
 * @returns Zapisana wartość albo `null`, gdy jej brak.
 */
const getItem = async (key: string) => {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

/**
 * Zapisuje wartość w bezpiecznym magazynie (patrz {@link getItem}).
 *
 * @param key Klucz wartości.
 * @param value Wartość do zapisania.
 */
const setItem = async (key: string, value: string) => {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

/**
 * Usuwa wartość z bezpiecznego magazynu (patrz {@link getItem}).
 *
 * @param key Klucz wartości.
 */
const deleteItem = async (key: string) => {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

/**
 * Zwraca token JWT z magazynu albo pobiera nowy z backendu.
 *
 * Gdy tokenu nie ma, używa anonimowego identyfikatora urządzenia (`deviceId`,
 * losowy UUID tworzony przy pierwszym uruchomieniu i zapisywany w magazynie),
 * wywołuje `POST /api/guest` i zapisuje otrzymany token pod kluczem `jwtToken`.
 *
 * @returns Token JWT albo `null`, gdy backend jest niedostępny lub nie zwrócił tokenu.
 */
const requestToken = async (): Promise<string | null> => {
  try {
    const storedToken = await getItem("jwtToken");
    if (storedToken) {
      return storedToken;
    }

    let deviceId = await getItem("deviceId");
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      console.log("Generowanie nowego anonimowego ID urządzenia:", deviceId);
      await setItem("deviceId", deviceId);
    }

    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(
        `Nie udało się pobrać tokenu JWT: ${response.status}${details ? ` - ${details}` : ""} (${baseUrl}/api/guest)`,
      );
      return null;
    }

    const data: unknown = await response.json();
    const token = (data as { token?: string } | null)?.token;
    if (!token) {
      console.error("Serwer nie zwrócił tokenu JWT w odpowiedzi /api/guest");
      return null;
    }

    await setItem("jwtToken", token);
    console.log("Odebrano i zapisano nowy token JWT");
    return token;
  } catch (error) {
    console.error("Błąd podczas pobierania tokenu JWT:", error);
    return null;
  }
};

/** Trwające żądanie tokenu — kilka ekranów prosi o token równolegle. */
let tokenRequest: Promise<string | null> | null = null;

/**
 * Zwraca token JWT do nagłówka `Authorization`.
 *
 * Równoległe wywołania korzystają z jednego wywołania {@link requestToken},
 * dzięki czemu przy starcie aplikacji powstaje tylko jedno żądanie `/api/guest`.
 *
 * @returns Token JWT albo `null`.
 */
const getValidToken = (): Promise<string | null> => {
  tokenRequest ??= requestToken().finally(() => {
    tokenRequest = null;
  });
  return tokenRequest;
};

/**
 * Odświeża token po odpowiedzi `401`/`403`.
 *
 * Jeśli w magazynie jest już inny token niż odrzucony (odświeżył go
 * równoległy request), zwraca go. W przeciwnym razie usuwa stary token
 * i pobiera nowy przez {@link getValidToken}.
 *
 * @param staleToken Token, który backend odrzucił.
 * @returns Nowy token albo `null`.
 */
const refreshAuthToken = async (staleToken: string): Promise<string | null> => {
  const currentToken = await getItem("jwtToken");
  if (currentToken && currentToken !== staleToken) {
    return currentToken;
  }
  await deleteItem("jwtToken");
  return getValidToken();
};

/**
 * Ostatni błąd pobierania świec dla każdego symbolu.
 *
 * Klucz: symbol, wartość: błąd i czas jego wystąpienia (ms). Służy do
 * wstrzymania ponownych prób na `FETCH_RETRY_MINUTES` po błędzie
 * (patrz {@link canRetryFetch}).
 */
const lastFetchErrorMap = new Map<
  string,
  { error: Error | null; timestamp: number }
>();
/** Czas wstrzymania ponownego pobierania świec po błędzie: 1 minuta. */
const FETCH_RETRY_MINUTES = 1; // 60 sekund

/**
 * Sprawdza, czy można ponowić pobieranie świec dla symbolu.
 *
 * Po błędzie pobierania kolejna próba jest możliwa dopiero po
 * `FETCH_RETRY_MINUTES` minutach — zapobiega to zasypywaniu backendu
 * żądaniami, gdy Yahoo nie ma danych dla instrumentu.
 *
 * @param symbol Symbol instrumentu; bez symbolu zawsze zwraca `true`.
 * @returns `true`, gdy nie było błędu lub minął czas wstrzymania.
 */
const canRetryFetch = (symbol?: string): boolean => {
  if (!symbol) return true;
  const state = lastFetchErrorMap.get(symbol);
  if (state?.error && state.timestamp) {
    const elapsedMinutes = (Date.now() - state.timestamp) / 60000;
    return elapsedMinutes >= FETCH_RETRY_MINUTES;
  }
  return true;
};

/**
 * Zapisuje błąd pobierania świec dla symbolu wraz z bieżącym czasem.
 *
 * @param symbol Symbol instrumentu.
 * @param error Błąd, który wystąpił.
 */
const recordFetchError = (symbol: string, error: Error): void => {
  lastFetchErrorMap.set(symbol, {
    error,
    timestamp: Date.now(),
  });
};

/**
 * Czyści zapisany błąd pobierania świec po udanym pobraniu.
 *
 * @param symbol Symbol instrumentu; bez symbolu czyści błędy wszystkich symboli.
 */
const clearFetchError = (symbol?: string): void => {
  if (!symbol) {
    lastFetchErrorMap.clear();
  } else {
    lastFetchErrorMap.delete(symbol);
  }
};

// Eksport funkcji pomocniczych dla komponentów (np. TrendCards pomija pobieranie świec po błędzie)
export { canRetryFetch, lastFetchErrorMap };

/**
 * Wpis cache danych giełdowych (świece, trendy, notowania, dane finansowe,
 * wyniki historyczne).
 *
 * @typeParam T Typ przechowywanych danych.
 */
interface CacheItem<T> {
  /** Dane z backendu. */
  data: T;
  /** Czas zapisu w ms (`Date.now()`), względem którego liczony jest TTL. */
  timestamp: number;
}

/** Po ilu ms świece są uznawane za nieaktualne: 5 minut. */
const CANDLES_CACHE_TTL = 5 * 60 * 1000; // 5 minut
/** Po ilu ms trendy są uznawane za nieaktualne: 10 minut. */
const TRENDS_CACHE_TTL = 10 * 60 * 1000; // 10 minut
/** Po ilu ms notowania są uznawane za nieaktualne: 2 minuty. */
const QUOTES_CACHE_TTL = 2 * 60 * 1000; // 2 minuty
/** Po ilu ms dane finansowe są uznawane za nieaktualne: 10 minut. */
const FINANCIALS_CACHE_TTL = 10 * 60 * 1000; // 10 minut
/** Po ilu ms wyniki historyczne są uznawane za nieaktualne: 10 minut. */
const PERFORMANCE_CACHE_TTL = 10 * 60 * 1000; // 10 minut

/** Cache świec, klucz: `"<symbol>_<interval>_<days>_<exchange>"`. */
const candlesCache = new Map<string, CacheItem<CandleData[]>>();
/** Cache trendów, klucz: kategoria (np. `"gainers"`). */
const trendsCache = new Map<string, CacheItem<DynamicTrendAsset[]>>();
/** Cache szczegółów notowań, klucz: `"<symbol>_<exchange>"`. */
const quoteDetailsCache = new Map<string, CacheItem<StockQuoteDetails>>();
/** Cache danych finansowych, klucz: `"<symbol>_<exchange>"`. */
const financialsCache = new Map<string, CacheItem<StockFinancialData>>();
/** Cache wyników historycznych, klucz: `"<symbol>_<exchange>"`. */
const performanceCache = new Map<string, CacheItem<StockPerformanceData>>();

/** Trwające żądania do backendu, klucz: identyfikator żądania (patrz {@link withInFlight}). */
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Łączy równoległe żądania o te same dane w jedno.
 *
 * Jeśli żądanie o danym kluczu już trwa, zwraca jego obietnicę zamiast
 * wywoływać `fetcher` ponownie. Po zakończeniu (sukces lub błąd) klucz jest
 * zwalniany.
 *
 * @typeParam T Typ wyniku żądania.
 * @param key Identyfikator żądania, np. `"candles_PKO_1d_30_GPW"`.
 * @param fetcher Funkcja wykonująca żądanie.
 * @returns Obietnica wyniku — wspólna dla wszystkich równoległych wywołań.
 */
function withInFlight<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Synchronicznie zwraca świece z cache, bez żądania do backendu.
 *
 * Pozwala od razu wyrenderować wykres (bez szkieletu ładowania), gdy dane
 * zostały wcześniej pobrane, np. przez {@link preloadMarketData}.
 * Nie sprawdza, czy dane są aktualne.
 *
 * @param symbol Symbol instrumentu.
 * @param interval Interwał świec (domyślnie `"1d"`).
 * @param days Liczba dni wstecz (domyślnie 30).
 * @param exchange Giełda instrumentu.
 * @returns Świece z cache albo `null`, gdy ich brak.
 */
export const getCachedStockCandles = (
  symbol: string,
  interval: "1m" | "5m" | "15m" | "1h" | "1d" | "1wk" = "1d",
  days: number = 30,
  exchange?: string,
): CandleData[] | null => {
  const key = `${symbol}_${interval}_${days}_${exchange || ""}`;
  return candlesCache.get(key)?.data ?? null;
};

/**
 * Synchronicznie zwraca trendy z cache, bez żądania do backendu.
 *
 * @param category Kategoria trendów, np. `"gainers"`.
 * @returns Trendy z cache albo `null`, gdy ich brak.
 */
export const getCachedDynamicTrends = (
  category: string,
): DynamicTrendAsset[] | null => {
  return trendsCache.get(category)?.data ?? null;
};

/**
 * Synchronicznie zwraca szczegóły notowania z cache, bez żądania do backendu.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @returns Szczegóły notowania albo `null`, gdy ich brak.
 */
export const getCachedQuoteDetails = (
  symbol: string,
  exchange?: string,
): StockQuoteDetails | null => {
  const key = `${symbol}_${exchange || ""}`;
  return quoteDetailsCache.get(key)?.data ?? null;
};

/**
 * Synchronicznie zwraca dane finansowe z cache, bez żądania do backendu.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @returns Dane finansowe albo `null`, gdy ich brak.
 */
export const getCachedStockData = (
  symbol: string,
  exchange?: string,
): StockFinancialData | null => {
  const key = `${symbol}_${exchange || ""}`;
  return financialsCache.get(key)?.data ?? null;
};

/**
 * Czyści cały cache danych rynkowych i listę trwających żądań.
 *
 * Kolejne wywołania funkcji `get*` pobiorą dane z backendu od nowa.
 */
export const clearMarketCache = (): void => {
  candlesCache.clear();
  trendsCache.clear();
  quoteDetailsCache.clear();
  financialsCache.clear();
  performanceCache.clear();
  inFlightRequests.clear();
};

/**
 * Pobiera świece z `GET /api/candles` i zapisuje je w cache.
 *
 * Gdy dla symbolu niedawno wystąpił błąd ({@link canRetryFetch}), nie wysyła
 * żądania i pokazuje powiadomienie z czasem do kolejnej próby. Po odpowiedzi
 * `401`/`403` jednorazowo odświeża token i ponawia żądanie. Błąd pobierania
 * jest zapisywany ({@link recordFetchError}) i zgłaszany powiadomieniem.
 *
 * @param symbol Symbol instrumentu.
 * @param interval Interwał świec.
 * @param days Liczba dni wstecz.
 * @param exchange Giełda instrumentu.
 * @returns Świece albo `null` przy błędzie.
 */
const fetchStockCandlesFromApi = async (
  symbol: string,
  interval: "1m" | "5m" | "15m" | "1h" | "1d" | "1wk" = "1d",
  days: number = 30,
  exchange?: string,
): Promise<CandleData[] | null> => {
  const token = await getValidToken();
  if (!token) {
    console.error("Nie udało się uzyskać tokenu JWT");
    return null;
  }

  try {
    const baseUrl = await getApiBaseUrl();
    const exchangeQuery = exchange
      ? `&exchange=${encodeURIComponent(exchange)}`
      : "";
    const url = `${baseUrl}/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&days=${days}${exchangeQuery}`;
    console.log(
      `Pobieranie świec: ${symbol} (${exchange || "domyślna giełda"})`,
    );

    // Sprawdź czy można ponowić próbę po błędzie
    if (!canRetryFetch(symbol)) {
      const state = lastFetchErrorMap.get(symbol);
      const remainingSeconds = Math.max(
        1,
        Math.ceil(
          FETCH_RETRY_MINUTES * 60 -
            (Date.now() - (state?.timestamp ?? 0)) / 1000,
        ),
      );
      notify({
        variant: "error",
        title: "Opóźnione pobieranie danych",
        category: NOTIFICATION_GROUPS.marketChart,
        message: `Oczekiwanie na ponowną próbę pobrania danych świec dla ${symbol}. Próba za ${remainingSeconds} sekund...`,
      });
      return null;
    }

    const request = (authToken: string) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

    let response = await request(token);

    // Token wygasł (401/403), usuwamy go i ponawiamy próbę tylko raz
    if (response.status === 401 || response.status === 403) {
      const refreshedToken = await refreshAuthToken(token);
      if (refreshedToken && refreshedToken !== token) {
        response = await request(refreshedToken);
      }
    }

    if (!response.ok) {
      throw new Error(`Błąd serwera: ${response.status}`);
    }

    const data = (await response.json()) as CandleData[];
    clearFetchError(symbol);

    const cacheKey = `${symbol}_${interval}_${days}_${exchange || ""}`;
    candlesCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error("Błąd pobierania świec giełdowych:", error);
    recordFetchError(symbol, error as Error);
    notify({
      variant: "warning",
      title: "Brak notowań",
      category: NOTIFICATION_GROUPS.marketChart,
      message: `Nie udało się pobrać danych wykresu dla ${symbol}. Spróbuj ponownie za chwilę.`,
    });
    return null;
  }
};

/**
 * Zwraca świece (OHLC) instrumentu do wykresu.
 *
 * Dane z cache są zwracane od razu; jeśli są starsze niż
 * `CANDLES_CACHE_TTL`, świeże dane są pobierane w tle i trafią do cache
 * na następne wywołanie. Bez cache (lub z `forceRefresh`) czeka na backend.
 *
 * @param symbol Symbol instrumentu, np. `"PKO"`, `"AAPL"`.
 * @param interval Interwał świec: `"1m"`, `"5m"`, `"15m"`, `"1h"`, `"1d"` (domyślnie) lub `"1wk"`.
 * @param days Liczba dni wstecz (domyślnie 30).
 * @param exchange Giełda instrumentu, np. `"GPW"`, `"NASDAQ"`.
 * @param options.forceRefresh Gdy `true`, pomija cache i czeka na świeże dane.
 * @returns Świece albo `null`, gdy nie udało się ich pobrać.
 */
export const getStockCandles = async (
  symbol: string,
  interval: "1m" | "5m" | "15m" | "1h" | "1d" | "1wk" = "1d",
  days: number = 30,
  exchange?: string,
  options?: { forceRefresh?: boolean },
): Promise<CandleData[] | null> => {
  const cacheKey = `${symbol}_${interval}_${days}_${exchange || ""}`;
  const cached = candlesCache.get(cacheKey);

  if (cached && !options?.forceRefresh) {
    const isFresh = Date.now() - cached.timestamp < CANDLES_CACHE_TTL;
    if (!isFresh) {
      // Pobieranie w tle
      void withInFlight(`candles_${cacheKey}`, () =>
        fetchStockCandlesFromApi(symbol, interval, days, exchange),
      );
    }
    return cached.data;
  }

  return withInFlight(`candles_${cacheKey}`, () =>
    fetchStockCandlesFromApi(symbol, interval, days, exchange),
  );
};

/**
 * Wyszukuje instrumenty po nazwie lub symbolu (`GET /api/instruments/search`).
 *
 * Fraza krótsza niż 2 znaki (po przycięciu) zwraca pustą listę bez żądania.
 * Zwraca maksymalnie 20 wyników. Przy błędzie pokazuje powiadomienie.
 *
 * @param query Wpisana fraza, np. `"orlen"`.
 * @returns Lista wyników; pusta przy braku wyników lub błędzie.
 */
export const searchInstruments = async (
  query: string,
): Promise<InstrumentSearchResult[]> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  try {
    const baseUrl = await getApiBaseUrl();
    const request = (token: string) =>
      fetch(
        `${baseUrl}/api/instruments/search?q=${encodeURIComponent(normalizedQuery)}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

    let token = await getValidToken();
    if (!token) return [];

    let response = await request(token);
    if (response.status === 401 || response.status === 403) {
      const refreshedToken = await refreshAuthToken(token);
      if (!refreshedToken) return [];
      token = refreshedToken;
      response = await request(token);
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Błąd wyszukiwania: ${response.status}${details ? ` - ${details}` : ""}`,
      );
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data))
      throw new Error("Nieprawidłowy format wyników wyszukiwania");
    return data as InstrumentSearchResult[];
  } catch (error) {
    console.error("Błąd wyszukiwania instrumentów:", error);
    notify({
      variant: "error",
      title: "Wyszukiwanie nie powiodło się",
      category: NOTIFICATION_GROUPS.marketSearch,
      message:
        "Nie udało się pobrać wyników. Sprawdź połączenie z internetem i spróbuj ponownie.",
    });
    return [];
  }
};

/**
 * Pobiera status giełdy dla instrumentu (`GET /api/instruments/quote`) —
 * czy rynek jest teraz otwarty.
 *
 * Bez cache i bez powiadomień — błąd jest tylko logowany.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @returns Status giełdy albo `null` przy błędzie.
 */
export const getInstrumentQuote = async (
  symbol: string,
  exchange?: string,
): Promise<InstrumentQuote | null> => {
  try {
    const baseUrl = await getApiBaseUrl();
    const request = (token: string) =>
      fetch(
        `${baseUrl}/api/instruments/quote?symbol=${encodeURIComponent(symbol)}${exchange ? `&exchange=${encodeURIComponent(exchange)}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

    let token = await getValidToken();
    if (!token) return null;
    let response = await request(token);
    if (response.status === 401 || response.status === 403) {
      const refreshedToken = await refreshAuthToken(token);
      if (!refreshedToken) return null;
      token = refreshedToken;
      response = await request(token);
    }
    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Błąd statusu giełdy: ${response.status}${details ? ` - ${details}` : ""}`,
      );
    }
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      typeof (data as InstrumentQuote).exchange !== "string"
    ) {
      throw new Error("Nieprawidłowy format statusu giełdy");
    }
    return data as InstrumentQuote;
  } catch (error) {
    console.error("Błąd pobierania statusu giełdy:", error);
    return null;
  }
};

/**
 * Pobiera trendy z `GET /api/trends` i zapisuje je w cache.
 *
 * Po odpowiedzi `401`/`403` jednorazowo odświeża token i ponawia żądanie.
 * Przy błędzie pokazuje powiadomienie.
 *
 * @param category Kategoria trendów.
 * @returns Lista trendów; pusta przy błędzie.
 */
const fetchDynamicTrendsFromApi = async (
  category: string,
): Promise<DynamicTrendAsset[]> => {
  try {
    const token = await getValidToken();
    if (!token) return [];
    const baseUrl = await getApiBaseUrl();
    const url = `${baseUrl}/api/trends?category=${encodeURIComponent(category)}`;
    const request = (authToken: string) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

    let response = await request(token);

    // Token wygasł (401/403)
    // Usuwamy go i ponawiamy próbę tylko raz
    if (response.status === 401 || response.status === 403) {
      const refreshedToken = await refreshAuthToken(token);
      if (refreshedToken && refreshedToken !== token) {
        response = await request(refreshedToken);
      }
    }

    if (!response.ok) throw new Error(`Błąd trendów: ${response.status}`);
    const data: unknown = await response.json();
    const result = Array.isArray(data) ? (data as DynamicTrendAsset[]) : [];
    trendsCache.set(category, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Błąd pobierania dynamicznych trendów:", error);
    notify({
      variant: "warning",
      title: "Brak trendów",
      category: NOTIFICATION_GROUPS.marketTrends,
      message:
        "Nie udało się pobrać danych trendów. Spróbuj ponownie za chwilę.",
    });
    return [];
  }
};

/**
 * Zwraca listę trendujących instrumentów z Yahoo Finance (np. sekcja
 * „Warte uwagi”).
 *
 * Działa jak {@link getStockCandles}: zwraca cache od razu, a po
 * `TRENDS_CACHE_TTL` odświeża go w tle.
 *
 * @param category Kategoria: `"gainers"`, `"active"`, `"technology"` lub `"undervalued"`.
 * @param options.forceRefresh Gdy `true`, pomija cache i czeka na świeże dane.
 * @returns Do 10 instrumentów; pusta lista przy błędzie.
 */
export const getDynamicTrends = async (
  category: string,
  options?: { forceRefresh?: boolean },
): Promise<DynamicTrendAsset[]> => {
  const cached = trendsCache.get(category);

  if (cached && !options?.forceRefresh) {
    const isFresh = Date.now() - cached.timestamp < TRENDS_CACHE_TTL;
    if (!isFresh) {
      void withInFlight(`trends_${category}`, () =>
        fetchDynamicTrendsFromApi(category),
      );
    }
    return cached.data;
  }

  return withInFlight(`trends_${category}`, () =>
    fetchDynamicTrendsFromApi(category),
  );
};

/**
 * Historyczne stopy zwrotu instrumentu — odpowiedź
 * `GET /api/instruments/performance`. Wszystkie wartości w procentach.
 */
export interface StockPerformanceData {
  /** Zmiana ceny za ostatni rok. */
  performance1Y: number;
  /** Łączna zmiana ceny za ostatnie 3 lata. */
  performance3Y: number;
  /** Łączna zmiana ceny za ostatnie 5 lat. */
  performance5Y: number;
  /** Zmiana ceny od początku bieżącego roku. */
  performanceYTD: number;
  /** Stopa zwrotu za ostatni rok (równa `performance1Y`). */
  oneYearAvgReturn: number;
  /** Średnioroczna stopa zwrotu (CAGR) za 3 lata. */
  threeYearAvgReturn: number;
  /** Średnioroczna stopa zwrotu (CAGR) za 5 lat. */
  fiveYearAvgReturn: number;
}

/**
 * Skrócone szczegóły notowania instrumentu — odpowiedź
 * `GET /api/instruments/quote-details` i element `POST /api/instruments/quotes`.
 * Używane na listach rynku, w kartach i obserwowanych.
 */
export interface StockQuoteDetails {
  /** Symbol z żądania (przed normalizacją do symbolu Yahoo). */
  symbol: string;
  /** Waluta notowań, np. `"PLN"`, `"USD"`. */
  currency: string;
  /** Bieżąca cena. */
  price: number;
  /** Dzienna zmiana ceny w walucie notowań. */
  change: number;
  /** Dzienna zmiana ceny w procentach. */
  changePercent: number;
  /** Wolumen bieżącej sesji. */
  volume: number;
  /** Średni dzienny wolumen. */
  averageVolume: number;
  /** Kapitalizacja rynkowa. */
  marketCap: number;
  /** Cena / zysk (C/Z) z ostatnich 12 miesięcy. */
  trailingPE?: number;
  /** Prognozowany wskaźnik C/Z. */
  forwardPE?: number;
  /** Cena / wartość księgowa (C/WK). */
  priceToBook?: number;
  /** Liczba akcji w obrocie. */
  sharesOutstanding?: number;
  /** Wartość księgowa na akcję. */
  bookValue?: number;
  /** Roczna dywidenda na akcję. */
  dividendRate?: number;
  /** Stopa dywidendy. */
  dividendYield?: number;
  /** Najwyższa cena z 52 tygodni. */
  fiftyTwoWeekHigh?: number;
  /** Najniższa cena z 52 tygodni. */
  fiftyTwoWeekLow?: number;
  /** Zmiana ceny w ciągu 52 tygodni w procentach. */
  fiftyTwoWeekChangePercent?: number;
}

/**
 * Pełne dane finansowe instrumentu do ekranu szczegółów — odpowiedź
 * `GET /api/instruments/financials`. Procenty są w skali 0–100,
 * brakujące wartości liczbowe mają wartość `0`.
 */
export interface StockFinancialData {
  /** Symbol z żądania. */
  symbol: string;
  /** Waluta notowań. */
  currency: string;
  /** Bieżąca cena. */
  price: number;
  /** Dzienna zmiana ceny w walucie notowań. */
  change: number;
  /** Dzienna zmiana ceny w procentach. */
  changePercent: number;
  /** Wolumen bieżącej sesji. */
  volume: number;
  /** Średni dzienny wolumen (10 dni). */
  averageVolume: number;
  /** Kapitalizacja rynkowa. */
  marketCap: number;
  /** Liczba akcji w obrocie. */
  sharesOutstanding: number;
  /** Wartość księgowa na akcję. */
  bookValue: number;
  /** Roczna dywidenda na akcję. */
  dividendRate: number;
  /** Stopa dywidendy w procentach. */
  dividendYield: number;
  /** Data odcięcia dywidendy (ISO 8601). */
  exDividendDate?: string;
  /** Wskaźnik wypłaty dywidendy w procentach zysku. */
  payoutRatio: number;
  /** Średnia stopa dywidendy z 5 lat. */
  fiveYearAvgDividendYield: number;
  /** Beta — zmienność względem rynku. */
  beta: number;
  /** Cena / zysk z ostatnich 12 miesięcy. */
  trailingPE: number;
  /** Prognozowany wskaźnik C/Z. */
  forwardPE: number;
  /** Cena / wartość księgowa. */
  priceToBook: number;
  /** Cena / sprzedaż z ostatnich 12 miesięcy. */
  priceToSales: number;
  /** Wartość przedsiębiorstwa (EV). */
  enterpriseValue: number;
  /** EV / przychody. */
  enterpriseValueToRevenue: number;
  /** EV / EBITDA. */
  enterpriseValueToEbitda: number;
  /** Kapitalizacja / wolne przepływy pieniężne. */
  priceToFreeCashFlow: number;
  /** Marża zysku netto w procentach. */
  profitMargins: number;
  /** Liczba akcji w wolnym obrocie (free float). */
  floatShares: number;
  /** Liczba akcji sprzedanych na krótko. */
  sharesShort: number;
  /** Liczba dni potrzebnych do pokrycia krótkiej sprzedaży. */
  shortRatio: number;
  /** Krótka sprzedaż jako procent free float. */
  shortPercentOfFloat: number;
  /** Proporcja ostatniego splitu, np. `"4:1"`. */
  lastSplitFactor: string;
  /** Data ostatniego splitu (ISO 8601). */
  lastSplitDate?: string;
  /** Średnioroczna stopa zwrotu (CAGR) za 5 lat. */
  fiveYearAvgReturn: number;
  /** Średnioroczna stopa zwrotu (CAGR) za 3 lata. */
  threeYearAvgReturn: number;
  /** Stopa zwrotu za ostatni rok. */
  oneYearAvgReturn: number;
  /** Zmiana ceny za ostatni rok. */
  performance1Y?: number;
  /** Łączna zmiana ceny za 3 lata. */
  performance3Y?: number;
  /** Łączna zmiana ceny za 5 lat. */
  performance5Y?: number;
  /** Zmiana ceny od początku roku. */
  performanceYTD?: number;
}

/**
 * Wysyła żądanie do backendu z tokenem JWT w nagłówku `Authorization`.
 *
 * Dokleja adres bazowy ({@link getApiBaseUrl}) do ścieżki endpointu. Po
 * odpowiedzi `401`/`403` jednorazowo odświeża token i ponawia żądanie.
 * Nie sprawdza statusu odpowiedzi — robi to wywołujący.
 *
 * @param endpointPath Ścieżka z parametrami, np. `"/api/news?topic=world"`.
 * @param init Opcje `fetch` (metoda, body, dodatkowe nagłówki).
 * @returns Odpowiedź HTTP albo `null`, gdy brak tokenu lub błąd sieci.
 *
 * @example
 * const response = await authenticatedFetch("/api/instruments/quotes", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ instruments: [{ symbol: "PKO", exchange: "GPW" }] }),
 * });
 */
export const authenticatedFetch = async (
  endpointPath: string,
  init?: RequestInit,
): Promise<Response | null> => {
  try {
    const baseUrl = await getApiBaseUrl();
    const request = (token: string) =>
      fetch(`${baseUrl}${endpointPath}`, {
        ...init,
        headers: {
          ...((init?.headers as Record<string, string> | undefined) ?? {}),
          Authorization: `Bearer ${token}`,
        },
      });

    let token = await getValidToken();
    if (!token) return null;

    let response = await request(token);
    if (response.status === 401 || response.status === 403) {
      const refreshedToken = await refreshAuthToken(token);
      if (refreshedToken && refreshedToken !== token) {
        response = await request(refreshedToken);
      }
    }

    return response;
  } catch (error) {
    console.error(`Błąd authenticatedFetch dla ${endpointPath}:`, error);
    return null;
  }
};

/**
 * Pobiera dane finansowe z `GET /api/instruments/financials` i zapisuje je
 * w cache. Przy błędzie pokazuje powiadomienie.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @returns Dane finansowe albo `null` przy błędzie.
 */
const fetchStockDataFromApi = async (
  symbol: string,
  exchange?: string,
): Promise<StockFinancialData | null> => {
  const exchangeParam = exchange
    ? `&exchange=${encodeURIComponent(exchange)}`
    : "";
  const endpoint = `/api/instruments/financials?symbol=${encodeURIComponent(symbol)}${exchangeParam}`;

  try {
    const response = await authenticatedFetch(endpoint);
    if (!response) {
      throw new Error("Brak połączenia z serwerem API");
    }
    if (!response.ok) {
      throw new Error(`Błąd serwera API (${response.status})`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") {
      throw new Error("Nieprawidłowy format danych finansowych");
    }

    const result = data as StockFinancialData;
    const cacheKey = `${symbol}_${exchange || ""}`;
    financialsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`Błąd getStockData dla ${symbol}:`, error);
    notify({
      variant: "error",
      title: "Błąd danych finansowych",
      category: NOTIFICATION_GROUPS.marketFinancials,
      message: `Nie udało się pobrać danych finansowych dla ${symbol}. Sprawdź połączenie i spróbuj ponownie.`,
    });
    return null;
  }
};

/**
 * Zwraca pełne dane finansowe instrumentu (ekran szczegółów).
 *
 * Zwraca cache od razu, a po `FINANCIALS_CACHE_TTL` odświeża go w tle.
 * Niekompletne dane można uzupełnić przez {@link enrichFinancialData}, a gdy
 * backend nie zwróci nic — zbudować z notowań przez {@link buildFallbackFinancialData}.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @param options.forceRefresh Gdy `true`, pomija cache i czeka na świeże dane.
 * @returns Dane finansowe albo `null` przy błędzie.
 */
export const getStockData = async (
  symbol: string,
  exchange?: string,
  options?: { forceRefresh?: boolean },
): Promise<StockFinancialData | null> => {
  const cacheKey = `${symbol}_${exchange || ""}`;
  const cached = financialsCache.get(cacheKey);

  // Jeśli znaleziono w cache i nie wymuszono odświeżenia, zwróć z cache
  if (cached && !options?.forceRefresh) {
    const isFresh = Date.now() - cached.timestamp < FINANCIALS_CACHE_TTL;
    if (!isFresh) {
      void withInFlight(`financials_${cacheKey}`, () =>
        fetchStockDataFromApi(symbol, exchange),
      );
    }
    return cached.data;
  }

  // W przypadku braku w cache lub forceRefresh pobierz najświeższe z API
  return withInFlight(`financials_${cacheKey}`, () =>
    fetchStockDataFromApi(symbol, exchange),
  );
};

/**
 * Pobiera wyniki historyczne z `GET /api/instruments/performance` i zapisuje
 * je w cache. Odpowiedź z błędem HTTP zwraca `null` bez powiadomienia;
 * powiadomienie pojawia się tylko przy błędzie sieci lub parsowania.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @returns Wyniki historyczne albo `null`.
 */
const fetchStockPerformanceFromApi = async (
  symbol: string,
  exchange?: string,
): Promise<StockPerformanceData | null> => {
  const exchangeParam = exchange
    ? `&exchange=${encodeURIComponent(exchange)}`
    : "";
  const endpoint = `/api/instruments/performance?symbol=${encodeURIComponent(symbol)}${exchangeParam}`;

  try {
    const response = await authenticatedFetch(endpoint);
    if (!response || !response.ok) {
      return null;
    }

    const data = (await response.json()) as StockPerformanceData;
    const cacheKey = `${symbol}_${exchange || ""}`;
    performanceCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Błąd getStockPerformance dla ${symbol}:`, error);
    notify({
      variant: "warning",
      title: "Brak danych wyników",
      category: NOTIFICATION_GROUPS.marketEarnings,
      message: `Nie udało się pobrać wyników historycznych dla ${symbol}. Dane mogą być niepełne.`,
    });
    return null;
  }
};

/**
 * Zwraca historyczne stopy zwrotu instrumentu (1Y, 3Y, 5Y, YTD, średnioroczne).
 *
 * Zwraca cache od razu, a po `PERFORMANCE_CACHE_TTL` odświeża go w tle.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @param options.forceRefresh Gdy `true`, pomija cache i czeka na świeże dane.
 * @returns Wyniki historyczne albo `null`.
 */
export const getStockPerformance = async (
  symbol: string,
  exchange?: string,
  options?: { forceRefresh?: boolean },
): Promise<StockPerformanceData | null> => {
  const cacheKey = `${symbol}_${exchange || ""}`;
  const cached = performanceCache.get(cacheKey);

  if (cached && !options?.forceRefresh) {
    const isFresh = Date.now() - cached.timestamp < PERFORMANCE_CACHE_TTL;
    if (!isFresh) {
      void withInFlight(`perf_${cacheKey}`, () =>
        fetchStockPerformanceFromApi(symbol, exchange),
      );
    }
    return cached.data;
  }

  return withInFlight(`perf_${cacheKey}`, () =>
    fetchStockPerformanceFromApi(symbol, exchange),
  );
};

/**
 * Pobiera szczegóły notowania z `GET /api/instruments/quote-details`
 * i zapisuje je w cache. Odpowiedź z błędem HTTP zwraca `null` bez
 * powiadomienia; powiadomienie pojawia się przy błędzie sieci lub parsowania.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @returns Szczegóły notowania albo `null`.
 */
const fetchStockQuoteDetailsFromApi = async (
  symbol: string,
  exchange?: string,
): Promise<StockQuoteDetails | null> => {
  const exchangeParam = exchange
    ? `&exchange=${encodeURIComponent(exchange)}`
    : "";
  const endpoint = `/api/instruments/quote-details?symbol=${encodeURIComponent(symbol)}${exchangeParam}`;

  try {
    const response = await authenticatedFetch(endpoint);
    if (!response || !response.ok) {
      return null;
    }

    const data = (await response.json()) as StockQuoteDetails;
    const cacheKey = `${symbol}_${exchange || ""}`;
    quoteDetailsCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Błąd getStockQuoteDetails dla ${symbol}:`, error);
    notify({
      variant: "error",
      title: "Błąd danych notowań",
      category: NOTIFICATION_GROUPS.marketQuotes,
      message: `Nie udało się pobrać szczegółów notowań dla ${symbol}. Dane mogą być niepełne.`,
    });
    return null;
  }
};

/**
 * Zwraca szczegóły notowania jednego instrumentu (cena, zmiana, wolumen, wskaźniki).
 *
 * Zwraca cache od razu, a po `QUOTES_CACHE_TTL` odświeża go w tle.
 * Dla wielu instrumentów naraz lepiej użyć {@link getStockQuotesBatch}.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @param options.forceRefresh Gdy `true`, pomija cache i czeka na świeże dane.
 * @returns Szczegóły notowania albo `null`.
 */
export const getStockQuoteDetails = async (
  symbol: string,
  exchange?: string,
  options?: { forceRefresh?: boolean },
): Promise<StockQuoteDetails | null> => {
  const cacheKey = `${symbol}_${exchange || ""}`;
  const cached = quoteDetailsCache.get(cacheKey);

  if (cached && !options?.forceRefresh) {
    const isFresh = Date.now() - cached.timestamp < QUOTES_CACHE_TTL;
    if (!isFresh) {
      void withInFlight(`quote_${cacheKey}`, () =>
        fetchStockQuoteDetailsFromApi(symbol, exchange),
      );
    }
    return cached.data;
  }

  return withInFlight(`quote_${cacheKey}`, () =>
    fetchStockQuoteDetailsFromApi(symbol, exchange),
  );
};

/**
 * Buduje klucz notowania `"<symbol>_<exchange>"` — ten sam format używa cache
 * pojedynczych notowań i odpowiedź `POST /api/instruments/quotes`.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu (pusta, gdy brak).
 * @returns Klucz, np. `"PKO_GPW"` lub `"AAPL_"`.
 */
const quoteBatchKey = (symbol: string, exchange?: string) =>
  `${symbol}_${exchange || ""}`;

/**
 * Zwraca notowania wielu instrumentów jednym żądaniem (np. lista rynku).
 *
 * Instrumenty z cache są zwracane od razu (przeterminowane są odświeżane
 * w tle pojedynczo). Pozostałe są pobierane jednym żądaniem
 * `POST /api/instruments/quotes` i zapisywane w cache pojedynczych notowań.
 * Przy błędzie żądania brakujące instrumenty dostają wartość `null`.
 *
 * @param instruments Lista instrumentów `{ symbol, exchange? }`.
 * @param options.forceRefresh Gdy `true`, pobiera wszystkie instrumenty z backendu.
 * @returns Obiekt `{ "<symbol>_<exchange>": szczegóły | null }`.
 *
 * @example
 * const quotes = await getStockQuotesBatch([
 *   { symbol: "PKO", exchange: "GPW" },
 *   { symbol: "AAPL", exchange: "NASDAQ" },
 * ]);
 * quotes["PKO_GPW"]?.price;
 */
export const getStockQuotesBatch = async (
  instruments: { symbol: string; exchange?: string }[],
  options?: { forceRefresh?: boolean },
): Promise<Record<string, StockQuoteDetails | null>> => {
  const results: Record<string, StockQuoteDetails | null> = {};
  if (instruments.length === 0) return results;

  const pending: { symbol: string; exchange?: string }[] = [];
  const now = Date.now();

  for (const instrument of instruments) {
    const key = quoteBatchKey(instrument.symbol, instrument.exchange);
    const cached = quoteDetailsCache.get(key);

    if (cached && !options?.forceRefresh) {
      results[key] = cached.data;
      if (now - cached.timestamp >= QUOTES_CACHE_TTL) {
        void withInFlight(`quote_${key}`, () =>
          fetchStockQuoteDetailsFromApi(instrument.symbol, instrument.exchange),
        );
      }
      continue;
    }

    pending.push(instrument);
  }

  if (pending.length === 0) return results;

  try {
    const response = await authenticatedFetch("/api/instruments/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruments: pending }),
    });

    if (!response || !response.ok) {
      throw new Error(`Błąd serwera: ${response?.status ?? "brak odpowiedzi"}`);
    }

    const payload = (await response.json()) as {
      quotes?: Record<string, StockQuoteDetails | null>;
    };
    const quotes = payload.quotes ?? {};

    for (const instrument of pending) {
      const key = quoteBatchKey(instrument.symbol, instrument.exchange);
      const data = quotes[key] ?? null;
      results[key] = data;
      if (data) {
        quoteDetailsCache.set(key, { data, timestamp: Date.now() });
      }
    }
  } catch (error) {
    console.error("Błąd wsadowego pobierania notowań:", error);
    for (const instrument of pending) {
      const key = quoteBatchKey(instrument.symbol, instrument.exchange);
      if (!(key in results)) results[key] = null;
    }
  }

  return results;
};

/**
 * Uzupełnia niekompletne dane finansowe o notowania i wyniki historyczne.
 *
 * Yahoo nie zawsze zwraca wszystkie pola. Funkcja równolegle:
 * - pobiera {@link getStockPerformance}, gdy brakuje któregoś z pól
 *   `performance*` albo wszystkie średnie stopy zwrotu są zerowe,
 * - pobiera {@link getStockQuoteDetails}, gdy brakuje ceny, wolumenu,
 *   kapitalizacji lub średniego wolumenu.
 *
 * Istniejące wartości nie są nadpisywane — uzupełniane są tylko puste lub
 * zerowe pola. Wynik jest zapisywany w cache danych finansowych.
 * Błąd uzupełniania pokazuje powiadomienie, ale nie przerywa działania.
 *
 * @param data Dane finansowe do uzupełnienia (nie są modyfikowane).
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @returns Nowy obiekt z uzupełnionymi danymi.
 */
export const enrichFinancialData = async (
  data: StockFinancialData,
  symbol: string,
  exchange?: string,
): Promise<StockFinancialData> => {
  let enriched = { ...data };

  const needsPerformance =
    enriched.performance1Y === undefined ||
    enriched.performance3Y === undefined ||
    enriched.performance5Y === undefined ||
    enriched.performanceYTD === undefined ||
    (!enriched.oneYearAvgReturn &&
      !enriched.threeYearAvgReturn &&
      !enriched.fiveYearAvgReturn);

  const needsQuote =
    !enriched.price ||
    !enriched.volume ||
    !enriched.marketCap ||
    !enriched.averageVolume;

  const tasks: Promise<void>[] = [];

  if (needsPerformance) {
    tasks.push(
      (async () => {
        try {
          const perf = await getStockPerformance(symbol, exchange);
          if (perf) {
            enriched = {
              ...enriched,
              performance1Y: enriched.performance1Y ?? perf.performance1Y,
              performance3Y: enriched.performance3Y ?? perf.performance3Y,
              performance5Y: enriched.performance5Y ?? perf.performance5Y,
              performanceYTD: enriched.performanceYTD ?? perf.performanceYTD,
              oneYearAvgReturn:
                enriched.oneYearAvgReturn || perf.oneYearAvgReturn,
              threeYearAvgReturn:
                enriched.threeYearAvgReturn || perf.threeYearAvgReturn,
              fiveYearAvgReturn:
                enriched.fiveYearAvgReturn || perf.fiveYearAvgReturn,
            };
          }
        } catch (e) {
          console.warn("Nie udało się uzupełnić wyników historycznych:", e);
          notify({
            variant: "warning",
            title: "Brak danych wyników",
            category: NOTIFICATION_GROUPS.marketEarnings,
            message:
              "Nie udało się uzupełnić danych o wyniki historyczne. Wyświetlona zostanie podstawowa wersja.",
          });
        }
      })(),
    );
  }

  if (needsQuote) {
    tasks.push(
      (async () => {
        try {
          const quote = await getStockQuoteDetails(symbol, exchange);
          if (quote) {
            enriched = {
              ...enriched,
              price: enriched.price || quote.price,
              change: enriched.change || quote.change,
              changePercent: enriched.changePercent || quote.changePercent,
              volume: enriched.volume || quote.volume,
              averageVolume: enriched.averageVolume || quote.averageVolume,
              marketCap: enriched.marketCap || quote.marketCap,
              currency: enriched.currency || quote.currency,
              trailingPE: enriched.trailingPE || quote.trailingPE || 0,
              forwardPE: enriched.forwardPE || quote.forwardPE || 0,
              priceToBook: enriched.priceToBook || quote.priceToBook || 0,
              sharesOutstanding:
                enriched.sharesOutstanding || quote.sharesOutstanding || 0,
              bookValue: enriched.bookValue || quote.bookValue || 0,
              dividendRate: enriched.dividendRate || quote.dividendRate || 0,
              dividendYield: enriched.dividendYield || quote.dividendYield || 0,
            };
          }
        } catch (e) {
          console.warn("Nie udało się uzupełnić danych notowania:", e);
          notify({
            variant: "warning",
            title: "Brak danych notowań",
            category: NOTIFICATION_GROUPS.marketQuotes,
            message:
              "Nie udało się uzupełnić danych o szczegóły notowań. Wyświetlona zostanie podstawowa wersja.",
          });
        }
      })(),
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  const cacheKey = `${symbol}_${exchange || ""}`;
  financialsCache.set(cacheKey, { data: enriched, timestamp: Date.now() });
  return enriched;
};

/**
 * Buduje zastępcze dane finansowe, gdy {@link getStockData} nie zwróciło danych.
 *
 * Składa obiekt {@link StockFinancialData} z równolegle pobranych szczegółów
 * notowania i wyników historycznych. Pola, których te źródła nie zawierają
 * (np. beta, EV, krótka sprzedaż), mają wartość `0` lub pusty tekst.
 * Wynik jest zapisywany w cache danych finansowych.
 *
 * @param symbol Symbol instrumentu.
 * @param exchange Giełda instrumentu.
 * @param fallbackCurrency Waluta, gdy notowanie jej nie podaje (domyślnie `"USD"`).
 * @returns Dane zastępcze albo `null`, gdy oba źródła zawiodły.
 */
export const buildFallbackFinancialData = async (
  symbol: string,
  exchange?: string,
  fallbackCurrency = "USD",
): Promise<StockFinancialData | null> => {
  try {
    const [quote, perf] = await Promise.all([
      getStockQuoteDetails(symbol, exchange),
      getStockPerformance(symbol, exchange),
    ]);

    if (!quote && !perf) return null;

    const result: StockFinancialData = {
      symbol,
      currency: quote?.currency || fallbackCurrency,
      price: quote?.price ?? 0,
      change: quote?.change ?? 0,
      changePercent: quote?.changePercent ?? 0,
      volume: quote?.volume ?? 0,
      averageVolume: quote?.averageVolume ?? 0,
      marketCap: quote?.marketCap ?? 0,
      sharesOutstanding: quote?.sharesOutstanding ?? 0,
      bookValue: quote?.bookValue ?? 0,
      dividendRate: quote?.dividendRate ?? 0,
      dividendYield: quote?.dividendYield ?? 0,
      exDividendDate: "",
      payoutRatio: 0,
      fiveYearAvgDividendYield: 0,
      beta: 0,
      trailingPE: quote?.trailingPE ?? 0,
      forwardPE: quote?.forwardPE ?? 0,
      priceToBook: quote?.priceToBook ?? 0,
      priceToSales: 0,
      enterpriseValue: 0,
      enterpriseValueToRevenue: 0,
      enterpriseValueToEbitda: 0,
      priceToFreeCashFlow: 0,
      profitMargins: 0,
      floatShares: 0,
      sharesShort: 0,
      shortRatio: 0,
      shortPercentOfFloat: 0,
      lastSplitFactor: "",
      lastSplitDate: "",
      fiveYearAvgReturn: perf?.fiveYearAvgReturn ?? 0,
      threeYearAvgReturn: perf?.threeYearAvgReturn ?? 0,
      oneYearAvgReturn: perf?.oneYearAvgReturn ?? 0,
      performance1Y: perf?.performance1Y ?? quote?.fiftyTwoWeekChangePercent,
      performance3Y: perf?.performance3Y,
      performance5Y: perf?.performance5Y,
      performanceYTD: perf?.performanceYTD,
    };

    const fallbackKey = `${symbol}_${exchange || ""}`;
    financialsCache.set(fallbackKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Błąd budowania danych rezerwowych:", error);
    notify({
      variant: "error",
      title: "Brak danych finansowych",
      category: NOTIFICATION_GROUPS.marketFinancials,
      message:
        "Nie udało się pobrać żadnych danych finansowych. Sprawdź połączenie z internetem.",
    });
    return null;
  }
};

/**
 * Pobiera w tle kluczowe dane startowe, aby ekrany otwierały się bez ładowania.
 *
 * Równolegle:
 * - pobiera trendy `"gainers"` („Warte uwagi”) i świece (1d, 30 dni) dla
 *   3 pierwszych instrumentów,
 * - pobiera notowania stałego zestawu popularnych instrumentów (PKO, AAPL,
 *   MC.PA, NVDA, BTC-USD, złoto `GC=F`) oraz instrumentów z `extraSymbols`.
 *
 * Nie rzuca wyjątków i nie zwraca danych — wypełnia tylko cache.
 *
 * @param extraSymbols Dodatkowe instrumenty do pobrania, np. obserwowane przez użytkownika.
 */
export const preloadMarketData = async (
  extraSymbols?: { symbol: string; exchange?: string }[],
): Promise<void> => {
  try {
    const trendsPromise = getDynamicTrends("gainers").then(async (assets) => {
      if (Array.isArray(assets) && assets.length > 0) {
        await Promise.allSettled(
          assets
            .slice(0, 3)
            .map((asset) =>
              getStockCandles(asset.symbol, "1d", 30, asset.exchange),
            ),
        );
      }
    });

    const symbolsToFetch = [
      { symbol: "PKO", exchange: "GPW" },
      { symbol: "AAPL", exchange: "NASDAQ" },
      { symbol: "MC.PA", exchange: "EURONEXT_PARIS" },
      { symbol: "NVDA", exchange: "NASDAQ" },
      { symbol: "BTC-USD", exchange: "CCC" },
      { symbol: "GC=F", exchange: "COMEX" },
      ...(extraSymbols || []),
    ];

    const quotesPromise = Promise.allSettled(
      symbolsToFetch.map((item) =>
        getStockQuoteDetails(item.symbol, item.exchange),
      ),
    );

    await Promise.allSettled([trendsPromise, quotesPromise]);
  } catch (err) {
    console.warn("Błąd preloadMarketData:", err);
  }
};
