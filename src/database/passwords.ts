/**
 * Lokalne hasła kont w aplikacji.
 *
 * Hasło nie jest zapisywane wprost. W SecureStore pod kluczem
 * `investsimulator.password.<userId>` trzymany jest tekst `"<sól>:<skrót>"`,
 * gdzie skrót to SHA-256 z `"<sól>:<hasło>"`, a sól to losowy UUID.
 * Konto bez zapisanego hasła nie wymaga hasła przy logowaniu.
 *
 * @module src/database/passwords
 */
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

/**
 * Klucz SecureStore z hasłem danego konta.
 *
 * @param userId Identyfikator użytkownika.
 * @returns Klucz, np. `"investsimulator.password.1"`.
 */
const passwordKey = (userId: number) => `investsimulator.password.${userId}`;

/**
 * Liczy skrót SHA-256 hasła z solą.
 *
 * @param password Hasło w postaci jawnej.
 * @param salt Sól (losowy UUID).
 * @returns Skrót w postaci szesnastkowej.
 */
async function hash(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

/**
 * Sprawdza, czy konto ma ustawione hasło.
 *
 * @param userId Identyfikator użytkownika.
 * @returns `true`, gdy hasło jest zapisane; `false` także przy błędzie magazynu.
 */
export async function hasPassword(userId: number): Promise<boolean> {
  try {
    return Boolean(await SecureStore.getItemAsync(passwordKey(userId)));
  } catch {
    return false;
  }
}

/**
 * Ustawia lub zmienia hasło konta. Za każdym razem losowana jest nowa sól.
 *
 * @param userId Identyfikator użytkownika.
 * @param password Nowe hasło w postaci jawnej.
 * @throws Gdy SecureStore jest niedostępny.
 */
export async function setPassword(
  userId: number,
  password: string,
): Promise<void> {
  const salt = Crypto.randomUUID();
  const digest = await hash(password, salt);
  await SecureStore.setItemAsync(passwordKey(userId), `${salt}:${digest}`);
}

/**
 * Sprawdza, czy podane hasło jest poprawne dla konta.
 *
 * @param userId Identyfikator użytkownika.
 * @param password Wpisane hasło.
 * @returns `true`, gdy hasło się zgadza lub konto nie ma hasła; `false`, gdy
 *   hasło jest błędne, zapis jest uszkodzony albo wystąpił błąd magazynu.
 */
export async function verifyPassword(
  userId: number,
  password: string,
): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(passwordKey(userId));
    if (!stored) return true;

    const [salt, digest] = stored.split(":");
    if (!salt || !digest) return false;

    const candidate = await hash(password, salt);
    return candidate === digest;
  } catch {
    return false;
  }
}

/**
 * Usuwa hasło konta — logowanie nie będzie go wymagać. Błąd magazynu jest ignorowany.
 *
 * @param userId Identyfikator użytkownika.
 */
export async function clearPassword(userId: number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(passwordKey(userId));
  } catch {
    // Brak magazynu bezpiecznego
  }
}
