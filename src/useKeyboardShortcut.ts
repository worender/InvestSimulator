import { useEffect } from 'react';
import { Platform } from 'react-native';

// Czy użytkownik pisze w polu tekstowym — wtedy skróty (poza Escape) nie mogą przechwytywać klawiszy.
// Pola tylko do odczytu się nie liczą: wykresy wagmi pokazują etykiety w ukrytych <input readonly>, które łapią fokus po kliknięciu.
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
