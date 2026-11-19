/**
 * Skróty klawiszowe w wersji webowej.
 *
 * @module src/useKeyboardShortcut
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Sprawdza, czy użytkownik pisze w polu tekstowym — wtedy skróty (poza Escape)
 * nie mogą przechwytywać klawiszy.
 *
 * Pola tylko do odczytu i wyłączone się nie liczą: wykresy wagmi pokazują
 * etykiety w ukrytych `<input readonly>`, które łapią fokus po kliknięciu.
 *
 * @param target Cel zdarzenia klawiatury.
 * @returns `true` dla edytowalnego `input`/`textarea`, `select` i elementu `contentEditable`.
 */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }
  return target instanceof HTMLSelectElement;
}

/**
 * Skrót klawiszowy na webie (na platformach natywnych nic nie robi).
 * `key` to wartość KeyboardEvent.key, np. '/', 'Escape', 'ArrowDown'.
 *
 * Skrót nie działa, gdy wciśnięto Ctrl, Cmd lub Alt, ani (poza `Escape`)
 * podczas pisania w polu tekstowym. Nasłuchiwanie odbywa się w fazie capture
 * na `document`.
 *
 * @param key Klawisz (`KeyboardEvent.key`).
 * @param handler Funkcja wywoływana po wciśnięciu klawisza; warto ją opakować
 * w `useCallback`, bo każda nowa referencja ponownie rejestruje nasłuch.
 * @param enabled Czy skrót jest aktywny (domyślnie `true`).
 *
 * @example
 * useKeyboardShortcut('Escape', onClose, visible);
 */
export function useKeyboardShortcut(key: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key || event.ctrlKey || event.metaKey || event.altKey) return;
      if (key !== 'Escape' && isTypingTarget(event.target)) return;
      handler(event);
    };

    // Faza capture: TextInput z react-native-web zatrzymuje propagację klawiszy, więc w fazie bubble Escape z pola by nie dotarł
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [key, handler, enabled]);
}
