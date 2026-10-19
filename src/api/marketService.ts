import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const getApiBaseUrl = (): string => {
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

  return 'http://localhost:3000';
};

const BASE_URL = getApiBaseUrl();

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
      const response = await fetch(`${BASE_URL}/api/guest`, {
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
    return null;
  }
};

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
    return [];
  }
};

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
    return [];
  }
};

//Finhub API response type
// export const getStockData = async (symbol: string): Promise< StockData | null> => {
//   const token = await getValidToken();
//   if (!token) {
//     console.error('Nie udało się uzyskać tokenu JWT');
//     return null;
//   }

//   try {
//     const response = await fetch(`${BASE_URL}/api/quote?symbol=${symbol}`, {
//       headers: { 'Authorization': `Bearer ${token}` }
//     });

//     // Jeśli token wygasł (status 403), można usunąć go z pamięci i spróbować ponownie
//     if (response.status === 403) {
//       await SecureStore.deleteItemAsync('jwtToken');
//       return getStockData(symbol); // Ponowienie próby
//     }

//     if (!response.ok) throw new Error('Błąd połączenia');

//     return await response.json();
//   } catch (error) {
//     console.error('Błąd pobierania danych giełdowych:', error);
//     return null;
//   }
// };