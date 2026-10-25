import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { notify } from '../notificationBus';

const getApiBaseUrl = async (): Promise<string> => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (Platform.OS !== 'web') {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = new URL(
        hostUri.includes('://') ? hostUri : `http://${hostUri}`,
      ).hostname;
      return `http://${host}:3000`;
    }
  }

  // Pobieramy adres z backendu
  try {
    const defaultBaseUrl = 'http://localhost:3000';
    const response = await fetch(`${defaultBaseUrl}/api/config`);
    if (response.ok) {
      const config = await response.json();
      return config.url || defaultBaseUrl;
    }
  } catch (error) {
    console.error('Błąd pobierania adresu API:', error);
  }

  return 'http://localhost:3000';
};

let BASE_URL: string;

// Inicjalizacja BASE_URL - tylko dla dewelopera
if (process.env.EXPO_PUBLIC_API_URL) {
  BASE_URL = process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
} else if (Platform.OS !== 'web' && Constants.expoConfig?.hostUri) {
  const hostUri = Constants.expoConfig.hostUri;
  const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
  BASE_URL = `http://${host}:3000`;
} else {
  BASE_URL = 'http://localhost:3000';
}

export { getApiBaseUrl };

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
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};


const setItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const deleteItem = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};



// Funkcja pobierająca token JWT (lub generująca nowy)
const getValidToken = async (): Promise<string | null> => {
  let token = await getItem('jwtToken');
  
  if (!token) {
    
    let deviceId = await getItem('deviceId');
    if (!deviceId) {
      deviceId = uuidv4();
      console.log('Generowanie nowego anonimowego ID urządzenia:', deviceId);
      await setItem('deviceId', deviceId);
    }

    try{
      const defaultBaseUrl = 'http://localhost:3000';
      const response = await fetch(`${defaultBaseUrl}/api/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      if (response.ok) {
        const data = await response.json();
        token = data.token;
        if (token) {
          console.log('Zapisywanie nowego tokenu JWT:', token);
          await setItem('jwtToken', token);
          console.log('Odebrano token JWT z serwera');
        }else {
          console.error('Nie otrzymano tokenu JWT z serwera');
          return null;
        }
      }
    } catch (error) {
      console.error('Błąd podczas pobierania tokenu JWT:', error);
      return null;
    }
  }else{
    console.log('Używam zapisanego tokenu JWT:');
  }
  
  return token;
};

// Funkcja pobierająca dane świec giełdowych
export const getStockCandles = async (
  symbol: string,
  interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' = '1d',
  days: number = 30,
  exchange?: string,
): Promise<CandleData[] | null> => {
  const token = await getValidToken();
  if (!token) {
    console.error('Nie udało się uzyskać tokenu JWT');
    return null;
  }

  try {
    const exchangeQuery = exchange ? `&exchange=${encodeURIComponent(exchange)}` : '';
    const url = `${BASE_URL}/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&days=${days}${exchangeQuery}`;
    console.log(`Pobieranie świec: ${symbol} (${exchange || 'domyślna giełda'})`);
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Token wygasł (status 403), usuwamy go i ponawiamy próbę
    if (response.status === 403) {
      await deleteItem('jwtToken');
      return getStockCandles(symbol, interval, days, exchange);
    }

    if (!response.ok) {
      throw new Error(`Błąd serwera: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Błąd pobierania świec giełdowych:', error);
    notify({
      variant: 'warning',
      title: 'Brak notowań',
      message: 'Nie udało się pobrać danych wykresu. Spróbuj ponownie za chwilę.',
    });
    return null;
  }
};

// Funckja obsługująca wyszukiwarkę instrumentów giełdowych
export const searchInstruments = async (query: string): Promise<InstrumentSearchResult[]> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const request = async (token: string) => fetch(
    `${BASE_URL}/api/instruments/search?q=${encodeURIComponent(normalizedQuery)}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  try {
    let token = await getValidToken();
    if (!token) return [];

    let response = await request(token);
    if (response.status === 401 || response.status === 403) {
      await deleteItem('jwtToken');
      token = await getValidToken();
      if (!token) return [];
      response = await request(token);
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Błąd wyszukiwania: ${response.status}${details ? ` - ${details}` : ''}`);
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Nieprawidłowy format wyników wyszukiwania');
    return data as InstrumentSearchResult[];
  } catch (error) {
    console.error('Błąd wyszukiwania instrumentów:', error);
    notify({
      variant: 'error',
      title: 'Wyszukiwanie nie powiodło się',
      message: 'Nie udało się pobrać wyników. Sprawdź połączenie z internetem i spróbuj ponownie.',
    });
    return [];
  }
};

// Funckja pobierająca dane dotyczące ceny instrumentu giełdowego
export const getInstrumentQuote = async (symbol: string, exchange?: string): Promise<InstrumentQuote | null> => {
  const request = async (token: string) => fetch(
    `${BASE_URL}/api/instruments/quote?symbol=${encodeURIComponent(symbol)}${exchange ? `&exchange=${encodeURIComponent(exchange)}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  try {
    let token = await getValidToken();
    if (!token) return null;
    let response = await request(token);
    if (response.status === 401 || response.status === 403) {
      await deleteItem('jwtToken');
      token = await getValidToken();
      if (!token) return null;
      response = await request(token);
    }
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Błąd statusu giełdy: ${response.status}${details ? ` - ${details}` : ''}`);
    }
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || typeof (data as InstrumentQuote).exchange !== 'string') {
      throw new Error('Nieprawidłowy format statusu giełdy');
    }
    return data as InstrumentQuote;
  } catch (error) {
    console.error('Błąd pobierania statusu giełdy:', error);
    return null;
  }
};

// Funkcja pobierająca dynamiczne trendy giełdowe z Yahoo
export const getDynamicTrends = async (category: string): Promise<DynamicTrendAsset[]> => {
  const token = await getValidToken();
  if (!token) return [];
  try {
    const response = await fetch(`${BASE_URL}/api/trends?category=${encodeURIComponent(category)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Błąd trendów: ${response.status}`);
    const data: unknown = await response.json();
    return Array.isArray(data) ? data as DynamicTrendAsset[] : [];
  } catch (error) {
    console.error('Błąd pobierania dynamicznych trendów:', error);
    notify({
      variant: 'warning',
      title: 'Brak trendów',
      message: 'Nie udało się pobrać danych trendów. Spróbuj ponownie za chwilę.',
    });
    return [];
  }
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

// Funckja autentyfikująca żądania do API z użyciem tokenu JWT
const authenticatedFetch = async (endpointPath: string): Promise<Response | null> => {
  const request = async (token: string) =>
    fetch(`${BASE_URL}${endpointPath}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

  try {
    let token = await getValidToken();
    if (!token) return null;

    let response = await request(token);
    if (response.status === 401 || response.status === 403) {
      await deleteItem('jwtToken');
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

// Funckja pobierająca dane finansowe instrumentu giełdowego
export const getStockData = async (symbol: string, exchange?: string): Promise<StockFinancialData | null> => {
  const exchangeParam = exchange ? `&exchange=${encodeURIComponent(exchange)}` : '';
  const endpoint = `/api/instruments/financials?symbol=${encodeURIComponent(symbol)}${exchangeParam}`;

  try {
    const response = await authenticatedFetch(endpoint);
    if (!response || !response.ok) {
      throw new Error(`Błąd pobierania danych finansowych: ${response?.status}`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('Nieprawidłowy format danych finansowych');
    }

    return data as StockFinancialData;
  } catch (error) {
    console.error(`Błąd getStockData dla ${symbol}:`, error);
    notify({
      variant: 'error',
      title: 'Błąd danych finansowych',
      message: `Nie udało się pobrać danych finansowych dla ${symbol}. Sprawdź połączenie i spróbuj ponownie.`,
    });
    return null;
  }
};

// Funckja pobierająca dane dotyczące wyników historycznych instrumentu giełdowego
export const getStockPerformance = async (
  symbol: string,
  exchange?: string,
): Promise<StockPerformanceData | null> => {
  const exchangeParam = exchange ? `&exchange=${encodeURIComponent(exchange)}` : '';
  const endpoint = `/api/instruments/performance?symbol=${encodeURIComponent(symbol)}${exchangeParam}`;

  try {
    const response = await authenticatedFetch(endpoint);
    if (!response || !response.ok) {
      return null;
    }

    return (await response.json()) as StockPerformanceData;
  } catch (error) {
    console.error(`Błąd getStockPerformance dla ${symbol}:`, error);
    notify({
      variant: 'warning',
      title: 'Brak danych wyników',
      message: `Nie udało się pobrać wyników historycznych dla ${symbol}. Dane mogą być niepełne.`,
    });
    return null;
  }
};

// Funckja pobierająca szczegółowe dane notowania instrumentu giełdowego
export const getStockQuoteDetails = async (
  symbol: string,
  exchange?: string,
): Promise<StockQuoteDetails | null> => {
  const exchangeParam = exchange ? `&exchange=${encodeURIComponent(exchange)}` : '';
  const endpoint = `/api/instruments/quote-details?symbol=${encodeURIComponent(symbol)}${exchangeParam}`;

  try {
    const response = await authenticatedFetch(endpoint);
    if (!response || !response.ok) {
      return null;
    }

    return (await response.json()) as StockQuoteDetails;
  } catch (error) {
    console.error(`Błąd getStockQuoteDetails dla ${symbol}:`, error);
    notify({
      variant: 'error',
      title: 'Błąd danych notowań',
      message: `Nie udało się pobrać szczegółów notowań dla ${symbol}. Dane mogą być niepełne.`,
    });
    return null;
  }
};

// Funckja pobierająca dane dotyczące instrumentu giełdowego (łączy dane finansowe, notowania i wyniki historyczne)
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
    (!enriched.oneYearAvgReturn && !enriched.threeYearAvgReturn && !enriched.fiveYearAvgReturn);

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
              oneYearAvgReturn: enriched.oneYearAvgReturn || perf.oneYearAvgReturn,
              threeYearAvgReturn: enriched.threeYearAvgReturn || perf.threeYearAvgReturn,
              fiveYearAvgReturn: enriched.fiveYearAvgReturn || perf.fiveYearAvgReturn,
            };
          }
        } catch (e) {
          console.warn('Nie udało się uzupełnić wyników historycznych:', e);
          notify({
            variant: 'warning',
            title: 'Brak danych wyników',
            message: 'Nie udało się uzupełnić danych o wyniki historyczne. Wyświetlona zostanie podstawowa wersja.',
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
              sharesOutstanding: enriched.sharesOutstanding || quote.sharesOutstanding || 0,
              bookValue: enriched.bookValue || quote.bookValue || 0,
              dividendRate: enriched.dividendRate || quote.dividendRate || 0,
              dividendYield: enriched.dividendYield || quote.dividendYield || 0,
            };
          }
        } catch (e) {
          console.warn('Nie udało się uzupełnić danych notowania:', e);
          notify({
            variant: 'warning',
            title: 'Brak danych notowań',
            message: 'Nie udało się uzupełnić danych o szczegóły notowań. Wyświetlona zostanie podstawowa wersja.',
          });
        }
      })(),
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return enriched;
};

// Funckja budująca dane rezerwowe dla instrumentu giełdowego, jeśli nie udało się pobrać pełnych danych
export const buildFallbackFinancialData = async (
  symbol: string,
  exchange?: string,
  fallbackCurrency = 'USD',
): Promise<StockFinancialData | null> => {
  try {
    const [quote, perf] = await Promise.all([
      getStockQuoteDetails(symbol, exchange),
      getStockPerformance(symbol, exchange),
    ]);

    if (!quote && !perf) return null;

    return {
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
      exDividendDate: '',
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
      lastSplitFactor: '',
      lastSplitDate: '',
      fiveYearAvgReturn: perf?.fiveYearAvgReturn ?? 0,
      threeYearAvgReturn: perf?.threeYearAvgReturn ?? 0,
      oneYearAvgReturn: perf?.oneYearAvgReturn ?? 0,
      performance1Y: perf?.performance1Y ?? quote?.fiftyTwoWeekChangePercent,
      performance3Y: perf?.performance3Y,
      performance5Y: perf?.performance5Y,
      performanceYTD: perf?.performanceYTD,
    };
  } catch (error) {
    console.error('Błąd budowania danych rezerwowych:', error);
    notify({
      variant: 'error',
      title: 'Brak danych finansowych',
      message: 'Nie udało się pobrać żadnych danych finansowych. Sprawdź połączenie z internetem.',
    });
    return null;
  }
};
