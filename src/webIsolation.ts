/**
 * Wymuszenie izolacji między źródłami (cross-origin isolation) w wersji webowej.
 *
 * Moduł nic nie eksportuje — działa przy samym imporcie (`import "../webIsolation"`
 * w głównym `_layout.tsx`).
 *
 * Serwer deweloperski Expo serwuje `/` bez nagłówków COOP/COEP ustawianych
 * w `metro.config.js`, więc strona nie jest izolowana i `expo-sqlite` nie dostaje
 * `SharedArrayBuffer`. `/(tabs)` to ten sam ekran, ale serwowany z nagłówkami —
 * dlatego, gdy strona nie jest izolowana i otwarto `/`, przeładowujemy ją na
 * `/(tabs)` (z zachowaniem query i hash). Expo Router sam przywraca potem `/`
 * w pasku adresu bez kolejnego przeładowania, więc izolacja zostaje.
 *
 * Na platformach natywnych moduł nic nie robi.
 *
 * @module src/webIsolation
 */
import { Platform } from 'react-native';

if (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  !window.crossOriginIsolated &&
  window.location.pathname === '/'
) {
  window.location.replace(`/(tabs)${window.location.search}${window.location.hash}`);
}
