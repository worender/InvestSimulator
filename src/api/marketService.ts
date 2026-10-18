import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from 'react-native';

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
  days: number = 30
): Promise<CandleData[] | null> => {
  const token = await getValidToken();
  if (!token) {
    console.error('Nie udało się uzyskać tokenu JWT');
    return null;
  }

  try {
    const url = `${BASE_URL}/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&days=${days}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Token wygasł (status 403), usuwamy go i ponawiamy próbę
    if (response.status === 403) {
      await deleteItem('jwtToken');
      return getStockCandles(symbol, interval, days);
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