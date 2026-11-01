import { currencySymbol } from "./currency";
import type { Currency } from "./theme";

export type ExchangeRates = Record<string, number>;

// Wartośći zapasowe na wypadek braku danych z API
export const FALLBACK_RATES: ExchangeRates = {
  PLN: 1,
  EUR: 4.3,
  USD: 4.0,
};

type DisplayCurrencyState = {
  multiCurrency: boolean;
  currency: Currency;
  rates: ExchangeRates;
};

let displayState: DisplayCurrencyState = {
  multiCurrency: true,
  currency: "PLN",
  rates: FALLBACK_RATES,
};

export function setDisplayCurrencyState(next: DisplayCurrencyState): void {
  displayState = {
    ...next,
    rates: { ...FALLBACK_RATES, ...next.rates },
  };
}

export function getDisplayCurrencyState(): DisplayCurrencyState {
  return displayState;
}

export function convertForDisplay(
  value: number,
  sourceCurrency?: string,
): number {
  if (!Number.isFinite(value)) return value;
  if (displayState.multiCurrency) return value;

  const source = (sourceCurrency ?? "PLN").toUpperCase();
  const fromRate = displayState.rates[source] ?? 1;
  const toRate = displayState.rates[displayState.currency] ?? 1;
  if (!fromRate || !toRate) return value;

  return (value * fromRate) / toRate;
}

function isCurrencyCode(value: string): boolean {
  return /^[a-z]{3}$/i.test(value);
}

export function displayCurrency(sourceCurrency?: string): string {
  if (!displayState.multiCurrency) return displayState.currency;
  if (!sourceCurrency) return displayState.currency;
  return isCurrencyCode(sourceCurrency)
    ? sourceCurrency.toUpperCase()
    : sourceCurrency;
}

export function displaySymbol(sourceCurrency?: string): string {
  const currency = displayCurrency(sourceCurrency);
  return isCurrencyCode(currency) ? currencySymbol(currency) : currency;
}

export function formatMoneyForDisplay(
  value: number,
  sourceCurrency?: string,
  options?: Intl.NumberFormatOptions,
): string {
  const converted = convertForDisplay(value, sourceCurrency);
  const formatted = Math.abs(converted).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
  return `${formatted} ${displaySymbol(sourceCurrency)}`;
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
