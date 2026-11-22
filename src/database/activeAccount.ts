/**
 * Zapamiętanie aktywnego konta i stanu zalogowania między uruchomieniami aplikacji.
 *
 * Wartości są trzymane w `expo-secure-store`. Gdy magazyn jest niedostępny
 * (np. web), odczyt zwraca wartości domyślne, a zapis jest pomijany — aplikacja
 * działa wtedy na koncie domyślnym (id 1).
 *
 * @module src/database/activeAccount
 */
import * as SecureStore from "expo-secure-store";

/**
 * Klucz w SecureStore z identyfikatorem aktywnego konta.
 */
const ACTIVE_ACCOUNT_KEY = "investsimulator.activeAccountId";
/**
 * Klucz w SecureStore ze stanem zalogowania (`"1"` / `"0"`).
 */
const LOGGED_IN_KEY = "investsimulator.loggedIn";

/**
 * Odczytuje wartość z SecureStore bez rzucania wyjątków.
 *
 * SecureStore nie jest dostępny na każdej platformie (np. web), dlatego błąd
 * odczytu jest traktowany jak brak wartości.
 *
 * @param key Klucz wartości.
 * @returns Zapisana wartość albo `null`.
 */
async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/**
 * Zapisuje wartość w SecureStore bez rzucania wyjątków — brak magazynu nie
 * blokuje zmiany ustawień.
 *
 * @param key Klucz wartości.
 * @param value Wartość do zapisania.
 */
async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Brak magazynu bezpiecznego nie powinien blokować ustawień.
  }
}

/**
 * Zwraca identyfikator konta, które było aktywne przy ostatnim użyciu aplikacji.
 *
 * @returns Identyfikator użytkownika; `1` (konto domyślne), gdy brak zapisanej
 *   lub poprawnej wartości.
 */
export async function getActiveAccountId(): Promise<number> {
  const stored = await safeGet(ACTIVE_ACCOUNT_KEY);
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Zapamiętuje aktywne konto (np. po przełączeniu konta w ustawieniach).
 *
 * @param userId Identyfikator użytkownika z tabeli `users`.
 */
export async function setActiveAccountId(userId: number): Promise<void> {
  await safeSet(ACTIVE_ACCOUNT_KEY, String(userId));
}

/**
 * Sprawdza, czy użytkownik był zalogowany przy ostatnim użyciu aplikacji.
 *
 * @returns `false` tylko po jawnym wylogowaniu; domyślnie `true`.
 */
export async function getLoggedIn(): Promise<boolean> {
  const stored = await safeGet(LOGGED_IN_KEY);
  return stored !== "0";
}

/**
 * Zapamiętuje stan zalogowania (wylogowanie pokazuje ekran logowania przy następnym starcie).
 *
 * @param value `true` — zalogowany, `false` — wylogowany.
 */
export async function setLoggedIn(value: boolean): Promise<void> {
  await safeSet(LOGGED_IN_KEY, value ? "1" : "0");
}
