/**
 * Przeliczanie i formatowanie kwot według ustawień walut użytkownika.
 *
 * Moduł trzyma globalny stan ustawień (tryb „Wiele walut”, waluta rozliczeniowa,
 * kursy) poza Reactem, więc funkcje mogą działać w dowolnym miejscu aplikacji.
 * `ThemeProvider` synchronizuje ten stan przez {@link setDisplayCurrencyState},
 * a komponenty subskrybują go hookiem {@link useDisplayCurrency}, żeby odświeżyć
 * się od razu po zmianie ustawień.
 *
 * Dwa tryby:
 * - **Wiele walut** (`multiCurrency: true`) — kwoty nie są przeliczane, każda jest
 *   pokazywana w swojej walucie źródłowej.
 * - **Jedna waluta** (`multiCurrency: false`) — wszystkie kwoty są przeliczane
 *   na walutę rozliczeniową `currency`.
 *
 * @module src/displayCurrency
 */

import { useMemo, useSyncExternalStore } from "react";
import { currencySymbol } from "./currency";
import type { Currency } from "./theme";

/**
 * Kursy walut: kod waluty -> wartość jednej jednostki w PLN
 * (np. `EUR: 4.3` oznacza 1 EUR = 4,30 zł). PLN ma zawsze kurs 1.
 */
export type ExchangeRates = Record<string, number>;

/** Kursy zapasowe na wypadek braku danych z API. */
export const FALLBACK_RATES: ExchangeRates = {
  PLN: 1,
  EUR: 4.3,
  USD: 4.0,
};

/** Ustawienia wyświetlania kwot. */
export type DisplayCurrencyState = {
  /** Tryb „Wiele walut” — kwoty w walucie źródłowej, bez przeliczania. */
  multiCurrency: boolean;
  /** Waluta rozliczeniowa (używana, gdy `multiCurrency` jest wyłączone). */
  currency: Currency;
  /** Kursy walut względem PLN. */
  rates: ExchangeRates;
};

/** Bieżący globalny stan ustawień. */
let displayState: DisplayCurrencyState = {
  multiCurrency: true,
  currency: "PLN",
  rates: FALLBACK_RATES,
};

/** Subskrybenci powiadamiani o każdej zmianie ustawień. */
const listeners = new Set<() => void>();

/**
 * Porównuje dwa zestawy kursów (te same klucze i wartości).
 *
 * @param a Pierwszy zestaw.
 * @param b Drugi zestaw.
 * @returns `true`, gdy zestawy są równe.
 */
function sameRates(a: ExchangeRates, b: ExchangeRates): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Uzupełnia brakujące kursy wartościami z {@link FALLBACK_RATES}.
 *
 * @param next Nowy stan.
 * @returns Stan z kompletnymi kursami.
 */
function normalizeState(next: DisplayCurrencyState): DisplayCurrencyState {
  return {
    ...next,
    rates: { ...FALLBACK_RATES, ...next.rates },
  };
}

/**
 * Ustawia globalny stan wyświetlania kwot i powiadamia subskrybentów.
 *
 * Brakujące kursy są uzupełniane wartościami zapasowymi. Gdy stan się nie
 * zmienił, subskrybenci nie są powiadamiani (brak zbędnych renderów).
 * Wywoływana przez `ThemeProvider` po zmianie ustawień lub kursów.
 *
 * @param next Nowe ustawienia.
 */
export function setDisplayCurrencyState(next: DisplayCurrencyState): void {
  const normalized = normalizeState(next);
  if (
    displayState.multiCurrency === normalized.multiCurrency &&
    displayState.currency === normalized.currency &&
    sameRates(displayState.rates, normalized.rates)
  ) {
    return;
  }

  displayState = normalized;
  for (const listener of listeners) listener();
}

/**
 * Zwraca bieżący globalny stan wyświetlania kwot.
 *
 * @returns Bieżące ustawienia (ten sam obiekt do czasu następnej zmiany).
 */
export function getDisplayCurrencyState(): DisplayCurrencyState {
  return displayState;
}

/**
 * Rejestruje subskrybenta zmian ustawień (dla `useSyncExternalStore`).
 *
 * @param listener Funkcja wywoływana po każdej zmianie.
 * @returns Funkcja wyrejestrowująca subskrybenta.
 */
function subscribeDisplayCurrency(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Przelicza kwotę według podanego stanu (wspólna logika {@link convertForDisplay} i hooka).
 *
 * @param state Ustawienia wyświetlania.
 * @param value Kwota w walucie źródłowej.
 * @param sourceCurrency Waluta źródłowa; domyślnie PLN.
 * @returns Kwota w walucie wyświetlania.
 */
function convertWithState(
  state: DisplayCurrencyState,
  value: number,
  sourceCurrency?: string,
): number {
  if (!Number.isFinite(value)) return value;
  if (state.multiCurrency) return value;

  const source = (sourceCurrency ?? "PLN").toUpperCase();
  const fromRate = state.rates[source] ?? 1;
  const toRate = state.rates[state.currency] ?? 1;
  if (!fromRate || !toRate) return value;

  return (value * fromRate) / toRate;
}

/**
 * Sprawdza, czy tekst wygląda na trzyliterowy kod waluty (np. `USD`).
 *
 * @param value Sprawdzany tekst.
 * @returns `true` dla trzech liter (dowolnej wielkości).
 */
function isCurrencyCode(value: string): boolean {
  return /^[a-z]{3}$/i.test(value);
}

/**
 * Wyznacza walutę wyświetlania według podanego stanu (patrz {@link displayCurrency}).
 *
 * @param state Ustawienia wyświetlania.
 * @param sourceCurrency Waluta źródłowa.
 * @returns Kod waluty albo oryginalny tekst, jeśli nie jest kodem.
 */
function displayCurrencyWithState(
  state: DisplayCurrencyState,
  sourceCurrency?: string,
): string {
  if (!state.multiCurrency) return state.currency;
  if (!sourceCurrency) return state.currency;
  return isCurrencyCode(sourceCurrency)
    ? sourceCurrency.toUpperCase()
    : sourceCurrency;
}

/**
 * Wyznacza symbol waluty wyświetlania według podanego stanu (patrz {@link displaySymbol}).
 *
 * @param state Ustawienia wyświetlania.
 * @param sourceCurrency Waluta źródłowa.
 * @returns Symbol waluty.
 */
function displaySymbolWithState(
  state: DisplayCurrencyState,
  sourceCurrency?: string,
): string {
  const currency = displayCurrencyWithState(state, sourceCurrency);
  return isCurrencyCode(currency) ? currencySymbol(currency) : currency;
}

/**
 * Formatuje kwotę według podanego stanu (patrz {@link formatMoneyForDisplay}).
 *
 * @param state Ustawienia wyświetlania.
 * @param value Kwota w walucie źródłowej.
 * @param sourceCurrency Waluta źródłowa.
 * @param options Opcje `Intl.NumberFormat` nadpisujące domyślne 2 miejsca po przecinku.
 * @returns Sformatowana kwota z symbolem waluty.
 */
function formatMoneyWithState(
  state: DisplayCurrencyState,
  value: number,
  sourceCurrency?: string,
  options?: Intl.NumberFormatOptions,
): string {
  const converted = convertWithState(state, value, sourceCurrency);
  const formatted = Math.abs(converted).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
  return `${formatted} ${displaySymbolWithState(state, sourceCurrency)}`;
}

/**
 * Przelicza kwotę na walutę wyświetlania.
 *
 * W trybie „Wiele walut” zwraca kwotę bez zmian. W trybie jednej waluty liczy
 * `value * kurs(źródłowa) / kurs(rozliczeniowa)`. Nieznana waluta ma kurs 1,
 * a wartości nieskończone i `NaN` są zwracane bez zmian.
 *
 * Nie odświeża komponentu po zmianie ustawień — w komponentach używaj
 * {@link useDisplayCurrency}.
 *
 * @param value Kwota w walucie źródłowej.
 * @param sourceCurrency Waluta źródłowa; domyślnie PLN.
 * @returns Kwota w walucie wyświetlania.
 *
 * @example
 * // tryb jednej waluty, waluta rozliczeniowa PLN, kurs USD = 4
 * convertForDisplay(10, "USD"); // 40
 */
export function convertForDisplay(
  value: number,
  sourceCurrency?: string,
): number {
  return convertWithState(displayState, value, sourceCurrency);
}

/**
 * Zwraca walutę, w której zostanie pokazana kwota.
 *
 * W trybie jednej waluty, a także gdy waluta źródłowa nie jest podana, zwraca
 * walutę rozliczeniową. W trybie „Wiele walut” zwraca walutę źródłową
 * (trzyliterowy kod wielkimi literami, inny tekst bez zmian).
 *
 * @param sourceCurrency Waluta źródłowa.
 * @returns Kod waluty wyświetlania.
 */
export function displayCurrency(sourceCurrency?: string): string {
  return displayCurrencyWithState(displayState, sourceCurrency);
}

/**
 * Zwraca symbol waluty, w której zostanie pokazana kwota (np. `zł`, `$`).
 *
 * @param sourceCurrency Waluta źródłowa.
 * @returns Symbol waluty (dla tekstu, który nie jest kodem — sam tekst).
 */
export function displaySymbol(sourceCurrency?: string): string {
  return displaySymbolWithState(displayState, sourceCurrency);
}

/**
 * Przelicza kwotę i formatuje ją po polsku z symbolem waluty.
 *
 * Domyślnie 2 miejsca po przecinku. **Uwaga:** formatowana jest wartość
 * bezwzględna — znak minus jest pomijany, więc znak (`+`/`-`) musi dodać
 * wywołujący.
 *
 * @param value Kwota w walucie źródłowej.
 * @param sourceCurrency Waluta źródłowa; domyślnie PLN.
 * @param options Opcje `Intl.NumberFormat` nadpisujące domyślne.
 * @returns Tekst, np. `"1 234,50 $"`.
 */
export function formatMoneyForDisplay(
  value: number,
  sourceCurrency?: string,
  options?: Intl.NumberFormatOptions,
): string {
  return formatMoneyWithState(displayState, value, sourceCurrency, options);
}

/** Wartość zwracana przez {@link useDisplayCurrency}: ustawienia i funkcje związane z bieżącym stanem. */
export type DisplayCurrencyValue = DisplayCurrencyState & {
  /** Jak {@link convertForDisplay}. */
  convertForDisplay: (value: number, sourceCurrency?: string) => number;
  /** Jak {@link displayCurrency}. */
  displayCurrency: (sourceCurrency?: string) => string;
  /** Jak {@link displaySymbol}. */
  displaySymbol: (sourceCurrency?: string) => string;
  /** Jak {@link formatMoneyForDisplay}. */
  formatMoneyForDisplay: (
    value: number,
    sourceCurrency?: string,
    options?: Intl.NumberFormatOptions,
  ) => string;
};

/**
 * Hook subskrybujący ustawienia waluty.
 *
 * Komponent odświeży się natychmiast po zmianie trybu „Wiele walut”, waluty
 * rozliczeniowej lub kursów. Zwrócone funkcje działają na stanie z bieżącego
 * renderu.
 *
 * @returns Ustawienia i funkcje przeliczające (patrz {@link DisplayCurrencyValue}).
 *
 * @example
 * const { formatMoneyForDisplay } = useDisplayCurrency();
 * return <Text>{formatMoneyForDisplay(price, "USD")}</Text>;
 */
export function useDisplayCurrency(): DisplayCurrencyValue {
  const state = useSyncExternalStore(
    subscribeDisplayCurrency,
    getDisplayCurrencyState,
    getDisplayCurrencyState,
  );

  return useMemo(
    () => ({
      ...state,
      convertForDisplay: (value: number, sourceCurrency?: string) =>
        convertWithState(state, value, sourceCurrency),
      displayCurrency: (sourceCurrency?: string) =>
        displayCurrencyWithState(state, sourceCurrency),
      displaySymbol: (sourceCurrency?: string) =>
        displaySymbolWithState(state, sourceCurrency),
      formatMoneyForDisplay: (
        value: number,
        sourceCurrency?: string,
        options?: Intl.NumberFormatOptions,
      ) => formatMoneyWithState(state, value, sourceCurrency, options),
    }),
    [state],
  );
}

/**
 * Tworzy etykietę kursu waluty względem złotego.
 *
 * @param currency Waluta.
 * @param rates Kursy; brakujący kurs jest brany z {@link FALLBACK_RATES} (a w ostateczności 1).
 * @returns Tekst z 4 miejscami po przecinku, np. `"1 EUR = 4,3000 zł"`.
 */
export function displayRateLabel(
  currency: Currency,
  rates: ExchangeRates,
): string {
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return `1 ${currency} = ${rate.toLocaleString("pl-PL", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })} zł`;
}
