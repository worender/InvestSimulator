/**
 * Blokada bazy danych na webie: tylko jedna karta przeglądarki może używać bazy.
 *
 * `expo-sqlite` na webie trzyma bazę w OPFS, do której naraz ma dostęp tylko
 * jedna karta. Blokada korzysta z Web Locks API (`navigator.locks`). Na iOS
 * i Androidzie (brak `navigator.locks`) blokada jest zawsze przyznawana.
 *
 * @module src/database/dbLock
 */
/** Stan blokady współdzielony w obrębie karty. */
type DbLockState = {
  /** Trwająca lub zakończona próba przejęcia blokady. */
  acquisition: Promise<boolean> | null;
};

/**
 * Klucz stanu blokady w `globalThis`. Stan jest globalny, aby przetrwał
 * przeładowanie modułu (Fast Refresh) i nie próbował przejąć blokady drugi raz.
 */
const dbLockStateKey = "__investSimulatorDbLockState";
const globalState = globalThis as typeof globalThis & {
  [dbLockStateKey]?: DbLockState;
};

const state: DbLockState = globalState[dbLockStateKey] ?? { acquisition: null };
globalState[dbLockStateKey] = state;

/**
 * Próbuje przejąć blokadę bazy danych `"db-owner"` dla tej karty przeglądarki.
 *
 * Blokada jest przejmowana bez czekania (`ifAvailable`). Po przejęciu jest
 * trzymana do zamknięcia karty. Kolejne wywołania zwracają ten sam wynik;
 * po nieudanej próbie następne wywołanie spróbuje ponownie.
 *
 * @returns `true`, gdy karta ma dostęp do bazy (lub platforma nie wymaga
 *   blokady); `false`, gdy baza jest otwarta w innej karcie.
 */
export function acquireDbLock(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    return Promise.resolve(true);
  }

  if (!state.acquisition) {
    state.acquisition = new Promise<boolean>((resolve) => {
      navigator.locks.request("db-owner", { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return;
        }

        resolve(true);
        return new Promise<never>(() => {});
      });
    });

    state.acquisition.then((acquired) => {
      if (!acquired) {
        state.acquisition = null;
      }
    });
  }

  return state.acquisition;
}
