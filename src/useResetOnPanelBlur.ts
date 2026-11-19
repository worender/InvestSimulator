/**
 * Reset stanu panelu przy opuszczeniu zakładki.
 *
 * @module src/useResetOnPanelBlur
 */

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

/**
 * Przywraca początkowy stan panelu po przełączeniu na inną zakładkę.
 *
 * Funkcja `reset` jest wywoływana, gdy ekran traci fokus (`useFocusEffect`
 * z Expo Router). Zawsze używana jest jej najnowsza wersja, więc nie trzeba
 * jej opakowywać w `useCallback`.
 *
 * @param reset Funkcja przywracająca stan początkowy (np. czyszcząca wyszukiwanie).
 *
 * @example
 * useResetOnPanelBlur(() => {
 *   setQuery("");
 *   setSelected(null);
 * });
 */
export function useResetOnPanelBlur(reset: () => void) {
  const resetRef = useRef(reset);

  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetRef.current();
      };
    }, []),
  );
}
