import { useMemo, useSyncExternalStore } from "react";
import { currencySymbol } from "./currency";
import type { Currency } from "./theme";

export type ExchangeRates = Record<string, number>;

// Wartośći zapasowe na wypadek braku danych z API
export const FALLBACK_RATES: ExchangeRates = {
  PLN: 1,
  EUR: 4.3,
  USD: 4.0,
};

export type DisplayCurrencyState = {
  multiCurrency: boolean;
  currency: Currency;
  rates: ExchangeRates;
};

let displayState: DisplayCurrencyState = {
  multiCurrency: true,
  currency: "PLN",
  rates: FALLBACK_RATES,
};

// Subskrybenci są powiadamiani  o każdej zmianie ustawień
const listeners = new Set<() => void>();

function sameRates(a: ExchangeRates, b: ExchangeRates): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function normalizeState(next: DisplayCurrencyState): DisplayCurrencyState {
  return {
    ...next,
    rates: { ...FALLBACK_RATES, ...next.rates },
  };
}

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

export function getDisplayCurrencyState(): DisplayCurrencyState {
  return displayState;
}

function subscribeDisplayCurrency(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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

function isCurrencyCode(value: string): boolean {
  return /^[a-z]{3}$/i.test(value);
}

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

function displaySymbolWithState(
  state: DisplayCurrencyState,
  sourceCurrency?: string,
): string {
  const currency = displayCurrencyWithState(state, sourceCurrency);
  return isCurrencyCode(currency) ? currencySymbol(currency) : currency;
}

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

export function convertForDisplay(
  value: number,
  sourceCurrency?: string,
): number {
  return convertWithState(displayState, value, sourceCurrency);
}

export function displayCurrency(sourceCurrency?: string): string {
  return displayCurrencyWithState(displayState, sourceCurrency);
}

export function displaySymbol(sourceCurrency?: string): string {
  return displaySymbolWithState(displayState, sourceCurrency);
}

export function formatMoneyForDisplay(
  value: number,
  sourceCurrency?: string,
  options?: Intl.NumberFormatOptions,
): string {
  return formatMoneyWithState(displayState, value, sourceCurrency, options);
}

export type DisplayCurrencyValue = DisplayCurrencyState & {
  convertForDisplay: (value: number, sourceCurrency?: string) => number;
  displayCurrency: (sourceCurrency?: string) => string;
  displaySymbol: (sourceCurrency?: string) => string;
  formatMoneyForDisplay: (
    value: number,
    sourceCurrency?: string,
    options?: Intl.NumberFormatOptions,
  ) => string;
};

// Hook subskrybuje ustawienia waluty. Komponent odświeży się natychmiast po
// zmianie "Wiele walut" lub waluty rozliczeniowej
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
