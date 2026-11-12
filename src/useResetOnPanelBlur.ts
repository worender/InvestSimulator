import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

// Przywraca początkowy stan panelu po przełączeniu na inną zakładkę
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
