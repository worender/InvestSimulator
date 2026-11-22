/**
 * Blokada gestu przesuwania między zakładkami nawigacji.
 *
 * Komponent, który sam obsługuje poziome przesunięcia (np. przewijany wykres),
 * może zgłosić blokadę, aby gest nie przełączał jednocześnie zakładki.
 * Działa na liczniku, więc kilka blokad naraz jest obsługiwanych poprawnie.
 * Moduł nie zależy od Reacta — stan jest zwykłą zmienną modułu.
 *
 * @module src/navigationSwipeLock
 */
/** Liczba aktywnych blokad gestu (0 = gest dozwolony). */
let blockers = 0;

/**
 * Zakłada blokadę gestu przesuwania zakładek.
 *
 * @returns Funkcja zdejmująca tę blokadę; licznik nigdy nie spada poniżej zera.
 *
 * @example
 * const release = acquireNavigationSwipeLock();
 * // ... gest w komponencie ...
 * release();
 */
export function acquireNavigationSwipeLock() {
  blockers += 1;
  return () => {
    blockers = Math.max(blockers - 1, 0);
  };
}

/**
 * Sprawdza, czy gest przesuwania zakładek jest zablokowany.
 *
 * @returns `true`, gdy aktywna jest co najmniej jedna blokada.
 */
export function isNavigationSwipeLocked() {
  return blockers > 0;
}
