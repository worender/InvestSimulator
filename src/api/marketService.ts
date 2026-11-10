import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { NOTIFICATION_GROUPS, notify } from "../notificationBus";

const API_PORT = 3000;
const LOCAL_BASE_URL = `http://localhost:${API_PORT}`;

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

// Adres serwera Metro jest użyteczny tylko w sieci lokalnej (LAN, Tailscale).
// Dla tunelu Expo (np. *.exp.direct) nie wskazuje backendu - wtedy trzeba użyć EXPO_PUBLIC_API_URL.
const isLocalHost = (host: string) =>
  host === "localhost" ||
  host === "::1" ||
  host === "[::1]" ||
  host.endsWith(".local") ||
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

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

// Adres backendu: EXPO_PUBLIC_API_URL > host serwera Metro > /api/config > localhost.
// Dzięki EXPO_PUBLIC_API_URL ten sam kod obsługuje pracę lokalną i przez tunel (Tailscale, cloudflared itp.).
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

let apiBaseUrlPromise: Promise<string> | null = null;

export const getApiBaseUrl = (): Promise<string> => {
  apiBaseUrlPromise ??= resolveApiBaseUrl();
  return apiBaseUrlPromise;
};

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  exchangeName: string;
  quoteType: string;
}

export interface InstrumentQuote {
  symbol: string;
  exchange: string;
  marketState: string;
  isOpen: boolean;
}

export interface DynamicTrendAsset {
  symbol: string;
  name: string;
  exchange: string;
  exchangeName: string;
  changePercent: number;
}

const getItem = async (key: string) => {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const setItem = async (key: string, value: string) => {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const deleteItem = async (key: string) => {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// Funkcja pobierająca token JWT (lub generująca nowy)
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

// Jedno żądanie tokenu na raz - kilka ekranów prosi o niego równolegle
let tokenRequest: Promise<string | null> | null = null;

const getValidToken = (): Promise<string | null> => {
  tokenRequest ??= requestToken().finally(() => {
    tokenRequest = null;
  });
  return tokenRequest;
};

// State do śledzenia błędów fetchowania świec
const lastFetchErrorMap = new Map<
  string,
  { error: Error | null; timestamp: number }
>();
const FETCH_RETRY_MINUTES = 1; // 60 sekund

// Funkcja sprawdzająca czy można ponowić próbę pobierania świec dla danego symbolu
const canRetryFetch = (symbol?: string): boolean => {
  if (!symbol) return true;
  const state = lastFetchErrorMap.get(symbol);
  if (state?.error && state.timestamp) {
    const elapsedMinutes = (Date.now() - state.timestamp) / 60000;
    return elapsedMinutes >= FETCH_RETRY_MINUTES;
  }
  return true;
};

// Funkcja zapisująca błąd fetchowania dla danego symbolu
const recordFetchError = (symbol: string, error: Error): void => {
  lastFetchErrorMap.set(symbol, {
    error,
    timestamp: Date.now(),
  });
};

// Funkcja czyszcząca state po pomyślnym pobraniu
const clearFetchError = (symbol?: string): void => {
  if (!symbol) {
    lastFetchErrorMap.clear();
  } else {
    lastFetchErrorMap.delete(symbol);
  }
};

// Eksport funkcji pomocniczych dla komponentów
export { canRetryFetch, lastFetchErrorMap };

// Cache dla danych giełdowych (świece, trendy, notowania, dane finansowe, wyniki historyczne)
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const CANDLES_CACHE_TTL = 5 * 60 * 1000; // 5 minut
const TRENDS_CACHE_TTL = 10 * 60 * 1000; // 10 minut
const QUOTES_CACHE_TTL = 2 * 60 * 1000; // 2 minuty
const FINANCIALS_CACHE_TTL = 10 * 60 * 1000; // 10 minut
const PERFORMANCE_CACHE_TTL = 10 * 60 * 1000; // 10 minut

const candlesCache = new Map<string, CacheItem<CandleData[]>>();
const trendsCache = new Map<string, CacheItem<DynamicTrendAsset[]>>();
const quoteDetailsCache = new Map<string, CacheItem<StockQuoteDetails>>();
const financialsCache = new Map<string, CacheItem<StockFinancialData>>();
const performanceCache = new Map<string, CacheItem<StockPerformanceData>>();

const inFlightRequests = new Map<string, Promise<unknown>>();

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

// Synchroniczne odczyty z cache
export const getCachedStockCandles = (
  symbol: string,
  interval: "1m" | "5m" | "15m" | "1h" | "1d" | "1wk" = "1d",
  days: number = 30,
  exchange?: string,
): CandleData[] | null => {
  const key = `${symbol}_${interval}_${days}_${exchange || ""}`;
  return candlesCache.get(key)?.data ?? null;
};

export const getCachedDynamicTrends = (
  category: string,
): DynamicTrendAsset[] | null => {
  return trendsCache.get(category)?.data ?? null;
};

export const getCachedQuoteDetails = (
  symbol: string,
  exchange?: string,
): StockQuoteDetails | null => {
  const key = `${symbol}_${exchange || ""}`;
  return quoteDetailsCache.get(key)?.data ?? null;
};

export const getCachedStockData = (
  symbol: string,
  exchange?: string,
): StockFinancialData | null => {
  const key = `${symbol}_${exchange || ""}`;
  return financialsCache.get(key)?.data ?? null;
};

export const clearMarketCache = (): void => {
  candlesCache.clear();
  trendsCache.clear();
  quoteDetailsCache.clear();
  financialsCache.clear();
  performanceCache.clear();
  inFlightRequests.clear();
};

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
      const elapsedSeconds = Math.floor(
        (Date.now() - (state?.timestamp ?? 0)) / 1000,
      );
      notify({
        variant: "error",
        title: "Opóźnione pobieranie danych",
        category: NOTIFICATION_GROUPS.marketChart,
        message: `Oczekiwanie na ponowną próbę pobrania danych świec dla ${symbol}. Próba za ${elapsedSeconds} sekund...`,
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
      await deleteItem("jwtToken");
      const refreshedToken = await getValidToken();
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

// Funkcja pobierająca dane świec giełdowych
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

// Funckja obsługująca wyszukiwarkę instrumentów giełdowych
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
      await deleteItem("jwtToken");
      token = await getValidToken();
      if (!token) return [];
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

// Funckja pobierająca dane dotyczące ceny instrumentu giełdowego
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
      await deleteItem("jwtToken");
      token = await getValidToken();
      if (!token) return null;
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

const fetchDynamicTrendsFromApi = async (
  category: string,
): Promise<DynamicTrendAsset[]> => {
  try {
    const token = await getValidToken();
    if (!token) return [];
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(
      `${baseUrl}/api/trends?category=${encodeURIComponent(category)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
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

// Funkcja pobierająca dynamiczne trendy giełdowe z Yahoo
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

export interface StockPerformanceData {
  performance1Y: number;
  performance3Y: number;
  performance5Y: number;
  performanceYTD: number;
  oneYearAvgReturn: number;
  threeYearAvgReturn: number;
  fiveYearAvgReturn: number;
}

export interface StockQuoteDetails {
  symbol: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  averageVolume: number;
  marketCap: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  sharesOutstanding?: number;
  bookValue?: number;
  dividendRate?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekChangePercent?: number;
}

export interface StockFinancialData {
  symbol: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  averageVolume: number;
  marketCap: number;
  sharesOutstanding: number;
  bookValue: number;
  dividendRate: number;
  dividendYield: number;
  exDividendDate?: string;
  payoutRatio: number;
  fiveYearAvgDividendYield: number;
  beta: number;
  trailingPE: number;
  forwardPE: number;
  priceToBook: number;
  priceToSales: number;
  enterpriseValue: number;
  enterpriseValueToRevenue: number;
  enterpriseValueToEbitda: number;
  priceToFreeCashFlow: number;
  profitMargins: number;
  floatShares: number;
  sharesShort: number;
  shortRatio: number;
  shortPercentOfFloat: number;
  lastSplitFactor: string;
  lastSplitDate?: string;
  fiveYearAvgReturn: number;
  threeYearAvgReturn: number;
  oneYearAvgReturn: number;
  performance1Y?: number;
  performance3Y?: number;
  performance5Y?: number;
  performanceYTD?: number;
}

// Funkcja autentyfikująca żądania do API z użyciem tokenu JWT
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
      await deleteItem("jwtToken");
      token = await getValidToken();
      if (!token) return null;
      response = await request(token);
    }

    return response;
  } catch (error) {
    console.error(`Błąd authenticatedFetch dla ${endpointPath}:`, error);
    return null;
  }
};

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

// Funckja pobierająca dane finansowe instrumentu giełdowego
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

// Funkcja pobierająca dane dotyczące wyników historycznych instrumentu giełdowego
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

// Funckja pobierająca szczegółowe dane notowania instrumentu giełdowego
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

const quoteBatchKey = (symbol: string, exchange?: string) =>
  `${symbol}_${exchange || ""}`;

// Funkcja pobierająca notowania wielu instrumentów jednym żądaniem (lista rynku).
// Wynik jest kluczowany tak samo jak cache pojedynczych notowań.
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

// Funkcja pobierająca dane dotyczące instrumentu giełdowego (łączy dane finansowe, notowania i wyniki historyczne)
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

// Funkcja budująca dane rezerwowe dla instrumentu giełdowego, jeśli nie udało się pobrać pełnych danych
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

// Funkcja pobierająca w tle kluczowe dane startowe (Warte uwagi, obserwowane)
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
