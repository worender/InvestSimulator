import { Platform } from 'react-native';

// Serwer deweloperski Expo serwuje "/" bez nagłówków COOP/COEP z metro.config.js, więc strona nie jest izolowana
// i expo-sqlite nie dostaje SharedArrayBuffer. "/(tabs)" to ten sam ekran, ale z nagłówkami — przeładowujemy na niego,
// a Expo Router sam przywraca w pasku adresu "/" (bez kolejnego przeładowania, więc izolacja zostaje).
if (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  !window.crossOriginIsolated &&
  window.location.pathname === '/'
) {
  window.location.replace(`/(tabs)${window.location.search}${window.location.hash}`);
}
