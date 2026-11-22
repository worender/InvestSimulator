/**
 * Walidacja danych przed zapisem do bazy SQLite.
 *
 * Każda funkcja sprawdza jedną wartość i zwraca ją (czasem znormalizowaną),
 * a przy niepoprawnej wartości rzuca `Error` z polskim komunikatem, który
 * można pokazać użytkownikowi. Testy: `src/database/__tests__/checksecurityParam.test.ts`.
 *
 * @module src/database/checkSecurityParam
 */
/**
 * Normalizuje (przycięcie, wielkie litery) i sprawdza symbol instrumentu.
 *
 * Dozwolone: do 20 znaków, litery, cyfry, `.` i `-`, opcjonalne `^` na
 * początku (indeksy) i `=X` na końcu (waluty).
 *
 * @param value Symbol, np. `"pko.wa"`.
 * @returns Symbol wielkimi literami, np. `"PKO.WA"`.
 * @throws Gdy symbol jest pusty, za długi lub ma niedozwolone znaki.
 *
 * @example
 * normalizeAndValidateSymbol(" brk-b ");  // "BRK-B"
 * normalizeAndValidateSymbol("^GSPC");    // "^GSPC"
 * normalizeAndValidateSymbol("EURUSD=X"); // "EURUSD=X"
 */
export function normalizeAndValidateSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();

  // Przykłady: PKO.WA, BRK-B, ^GSPC, EURUSD=X
  if (
    symbol.length === 0 ||
    symbol.length > 20 ||
    !/^[A-Z0-9^][A-Z0-9.-]{0,18}(?:=[A-Z])?$/.test(symbol)
  ) {
    throw new Error("Nieprawidłowy symbol instrumentu");
  }

  return symbol;
}

/**
 * Sprawdza nazwę konta: 1–30 znaków (po przycięciu), tylko litery łacińskie,
 * cyfry, spacje, `.`, `_` i `-`.
 *
 * @param value Nazwa konta.
 * @returns Przycięta nazwa.
 * @throws Gdy nazwa jest pusta, za długa lub ma niedozwolone znaki.
 */
export function validateUserName(value: string): string {
  const userName = value.trim();

  if (userName.length === 0 || userName.length > 30) {
    throw new Error("Nieprawidłowa nazwa użytkownika");
  } else if (!/^[a-zA-Z0-9._ -]+$/.test(userName)) {
    throw new Error(
      "Nazwa użytkownika może zawierać tylko litery, cyfry, kropki, podkreślenia i myślniki",
    );
  }

  return userName;
}

/**
 * Sprawdza nazwę portfela — te same zasady co {@link validateUserName}.
 *
 * @param value Nazwa portfela.
 * @returns Przycięta nazwa.
 * @throws Gdy nazwa jest pusta, za długa lub ma niedozwolone znaki.
 */
export function validateWalletName(value: string): string {
  const userName = value.trim();

  if (userName.length === 0 || userName.length > 30) {
    throw new Error("Nieprawidłowa nazwa portfela");
  } else if (!/^[a-zA-Z0-9._ -]+$/.test(userName)) {
    throw new Error(
      "Nazwa portfela może zawierać tylko litery, cyfry, kropki, podkreślenia i myślniki",
    );
  }

  return userName;
}

/**
 * Sprawdza adres zdjęcia profilowego.
 *
 * Adres musi mieć 1–500 znaków, nie może zawierać znaków `<`, `>`, `"`, `'`
 * ani grawisu (ochrona przed wstrzyknięciem HTML) i musi być
 * poprawnym URL z protokołem `http:`, `https:`, `file:` lub `content:`
 * (`content:` to zdjęcia z galerii Androida).
 *
 * @param value Adres zdjęcia.
 * @returns Przycięty adres.
 * @throws Gdy adres jest niepoprawny lub ma nieobsługiwany protokół.
 */
export function validateAvatarUrl(value: string): string {
  const avatarUrl = value.trim();
  const allowedProtocols = ["http:", "https:", "file:", "content:"];

  if (avatarUrl.length === 0 || avatarUrl.length > 500) {
    throw new Error("Nieprawidłowy URL avatara");
  }

  if (/[<>"'`]/.test(avatarUrl)) {
    throw new Error("Nieprawidłowy URL avatara");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(avatarUrl);
  } catch {
    throw new Error("Nieprawidłowy URL avatara");
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new Error("Nieobsługiwany typ adresu zdjęcia");
  }

  return avatarUrl;
}

/**
 * Sprawdza, czy wartość jest skończoną liczbą (nie `NaN` i nie `Infinity`).
 * Nie sprawdza znaku — dodatniość weryfikuje wywołujący.
 *
 * @param value Liczba do sprawdzenia.
 * @returns Ta sama liczba.
 * @throws Gdy liczba nie jest skończona.
 */
export function validateNumberReal(value: number): number {
  if (isNaN(value) || !isFinite(value)) {
    throw new Error("Nieprawidłowa liczba");
  }

  return value;
}

/**
 * Normalizuje i sprawdza kod waluty: dokładnie 3 litery (ISO 4217).
 *
 * @param value Kod waluty, np. `"pln"`.
 * @returns Kod wielkimi literami, np. `"PLN"`.
 * @throws Gdy kod nie ma 3 liter.
 */
export function validateCurrencyCode(value: string): string {
  const currencyCode = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error("Nieprawidłowy kod waluty");
  }

  return currencyCode;
}

/**
 * Sprawdza nazwę ikony portfela (nazwa ikony Ionicons, np. `"wallet-outline"`):
 * 1–50 znaków, tylko małe litery, cyfry i `-`.
 *
 * @param value Nazwa ikony.
 * @returns Przycięta nazwa.
 * @throws Gdy nazwa jest pusta, za długa lub ma niedozwolone znaki.
 */
export function validateIconWallet(value: string): string {
  const iconWallet = value.trim();

  if (
    iconWallet.length === 0 ||
    iconWallet.length > 50 ||
    !/^[a-z0-9-]+$/.test(iconWallet)
  ) {
    throw new Error("Nieprawidłowa nazwa ikony portfela");
  }

  return iconWallet;
}

/**
 * Sprawdza znacznik czasu w milisekundach: skończona liczba, nie mniejsza niż 0.
 *
 * @param value Znacznik czasu (np. `Date.now()`).
 * @returns Ten sam znacznik.
 * @throws Gdy wartość nie jest poprawnym znacznikiem czasu.
 */
export function validateDate(value: number): number {
  if (isNaN(value) || !isFinite(value) || value < 0) {
    throw new Error("Nieprawidłowa data");
  }

  return value;
}

/**
 * Sprawdza identyfikator rekordu: dodatnia liczba całkowita.
 *
 * @param value Identyfikator.
 * @param label Opis identyfikatora do komunikatu błędu, np. `"identyfikator kategorii"`.
 * @returns Ten sam identyfikator.
 * @throws `Error("Nieprawidłowy <label>")`, gdy identyfikator jest niepoprawny.
 */
export function validateId(value: number, label: string): number {
  if (value <= 0 || !Number.isInteger(value)) {
    throw new Error(`Nieprawidłowy ${label}`);
  }

  return value;
}

/**
 * Sprawdza identyfikator użytkownika (patrz {@link validateId}).
 *
 * @param value Identyfikator użytkownika.
 * @returns Ten sam identyfikator.
 * @throws Gdy identyfikator nie jest dodatnią liczbą całkowitą.
 */
export function validateUserId(value: number): number {
  return validateId(value, "identyfikator użytkownika");
}

/**
 * Sprawdza identyfikator portfela (patrz {@link validateId}).
 *
 * @param value Identyfikator portfela.
 * @returns Ten sam identyfikator.
 * @throws Gdy identyfikator nie jest dodatnią liczbą całkowitą.
 */
export function validateWalletId(value: number): number {
  return validateId(value, "identyfikator portfela");
}

/**
 * Sprawdza wartość logiczną w formacie SQLite: `0` albo `1`.
 *
 * @param value Wartość do sprawdzenia.
 * @returns Ta sama wartość.
 * @throws Gdy wartość jest inna niż `0` lub `1`.
 */
export function validateBoolean(value: number): number {
  if (value !== 0 && value !== 1) {
    throw new Error("Nieprawidłowa wartość logiczna");
  }
  return value;
}