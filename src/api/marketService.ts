import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from 'react-native';

const BASE_URL = 'http://TWÓJ_ADRES:3000';

export interface StockData {
  currentPrice: number;
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



// Pomocnicza funkcja pobierająca token JWT (lub generująca nowy)
const getValidToken = async () => {
  let token = await getItem('jwtToken');
  
  if (!token) {
    
    let deviceId = await getItem('deviceId');
    if (!deviceId) {
      deviceId = uuidv4();
      console.log('Generowanie nowego anonimowego ID urządzenia:', deviceId);
      await setItem('deviceId', deviceId);
    }

    
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
  }else{
    console.log('Używam zapisanego tokenu JWT:');
  }
  
  return token;
};

// Główna funkcja dla interfejsu (wywoływana w widokach)
export const getStockData = async (symbol: string): Promise< StockData | null> => {
  const token = await getValidToken();
  if (!token) {
    console.error('Nie udało się uzyskać tokenu JWT');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/quote?symbol=${symbol}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Jeśli token wygasł (status 403), można usunąć go z pamięci i spróbować ponownie
    if (response.status === 403) {
      await SecureStore.deleteItemAsync('jwtToken');
      return getStockData(symbol); // Ponowienie próby
    }

    if (!response.ok) throw new Error('Błąd połączenia');

    return await response.json();
  } catch (error) {
    console.error('Błąd pobierania danych giełdowych:', error);
    return null;
  }
};