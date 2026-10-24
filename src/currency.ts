/**
 * Waluta instrumentu bywa mylona z giełdą, na której jest notowany.
 * Yahoo Finance zwraca ticker z sufiksem rynku (np. `PKN.WA`, `CEZ.PR`),
 * więc walutę wyznaczamy najpierw z sufiksu, potem z kodu giełdy,
 * a na końcu z jej nazwy. Dzięki temu ORLEN na GPW dostaje PLN,
 * a ten sam emitent na giełdzie praskiej CZK - bez zgadywania "USD".
 */

const CURRENCY_BY_SUFFIX: Record<string, string> = {
  WA: 'PLN',
  PR: 'CZK',
  PA: 'EUR',
  L: 'GBP',
  DE: 'EUR',
  F: 'EUR',
  SG: 'EUR',
  MU: 'EUR',
  BE: 'EUR',
  DU: 'EUR',
  HM: 'EUR',
  HA: 'EUR',
  SW: 'CHF',
  ST: 'SEK',
  OL: 'NOK',
  CO: 'DKK',
  HE: 'EUR',
  VI: 'EUR',
  LS: 'EUR',
  MC: 'EUR',
  AS: 'EUR',
  BR: 'EUR',
  MI: 'EUR',
  BD: 'HUF',
  IS: 'TRY',
  TA: 'ILS',
  TO: 'CAD',
  V: 'CAD',
  AX: 'AUD',
  HK: 'HKD',
  T: 'JPY',
  SS: 'CNY',
  SZ: 'CNY',
  NS: 'INR',
  BO: 'INR',
  JO: 'ZAR',
  SA: 'BRL',
  MX: 'MXN',
};

const CURRENCY_BY_EXCHANGE: Record<string, string> = {
  GPW: 'PLN',
  WSE: 'PLN',
  WAR: 'PLN',
  PRG: 'CZK',
  XPRA: 'CZK',
  NMS: 'USD',
  NYQ: 'USD',
  NGM: 'USD',
  NCM: 'USD',
  ASE: 'USD',
  PCX: 'USD',
  BATS: 'USD',
  US: 'USD',
  PAR: 'EUR',
  EURONEXT_PARIS: 'EUR',
  LSE: 'GBP',
  GER: 'EUR',
  XETRA: 'EUR',
  FRA: 'EUR',
  MIL: 'EUR',
  AMS: 'EUR',
  BRU: 'EUR',
  MCE: 'EUR',
  MAD: 'EUR',
  VIE: 'EUR',
  LIS: 'EUR',
  HEL: 'EUR',
  STO: 'SEK',
  OSL: 'NOK',
  CPH: 'DKK',
  COP: 'DKK',
  BUD: 'HUF',
  IST: 'TRY',
  TLV: 'ILS',
  TOR: 'CAD',
  VAN: 'CAD',
  ASX: 'AUD',
  HKG: 'HKD',
  TYO: 'JPY',
  SHA: 'CNY',
  SHH: 'CNY',
  NSI: 'INR',
  BSE: 'INR',
  JNB: 'ZAR',
  SAO: 'BRL',
  MEX: 'MXN',
};

/** Fragment nazwy giełdy (małe litery) -> waluta. */
const CURRENCY_BY_EXCHANGE_NAME: [string, string][] = [
  ['warsaw', 'PLN'],
  ['gpw', 'PLN'],
  ['prague', 'CZK'],
  ['praha', 'CZK'],
  ['london', 'GBP'],
  ['euronext', 'EUR'],
  ['paris', 'EUR'],
  ['amsterdam', 'EUR'],
  ['brussels', 'EUR'],
  ['milan', 'EUR'],
  ['madrid', 'EUR'],
  ['lisbon', 'EUR'],
  ['vienna', 'EUR'],
  ['helsinki', 'EUR'],
  ['xetra', 'EUR'],
  ['frankfurt', 'EUR'],
  ['stockholm', 'SEK'],
  ['oslo', 'NOK'],
  ['copenhagen', 'DKK'],
  ['budapest', 'HUF'],
  ['istanbul', 'TRY'],
  ['tel aviv', 'ILS'],
  ['toronto', 'CAD'],
  ['canada', 'CAD'],
  ['australia', 'AUD'],
  ['hong kong', 'HKD'],
  ['tokyo', 'JPY'],
  ['shanghai', 'CNY'],
  ['shenzhen', 'CNY'],
  ['india', 'INR'],
  ['johannesburg', 'ZAR'],
  ['sao paulo', 'BRL'],
  ['mexico', 'MXN'],
  ['nasdaq', 'USD'],
  ['nyse', 'USD'],
  ['new york', 'USD'],
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  PLN: 'zł',
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  CZK: 'Kč',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  HUF: 'Ft',
  JPY: '¥',
  CNY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  HKD: 'HK$',
  INR: '₹',
  ZAR: 'R',
  BRL: 'R$',
  MXN: 'MX$',
  TRY: '₺',
  ILS: '₪',
};

export type InstrumentCurrencyInput = {
  symbol?: string;
  exchange?: string;
  exchangeName?: string;
};

// Funkcja wyznaczająca walutę instrumentu giełdowego na podstawie symbolu, giełdy i nazwy giełdy
export function resolveCurrency({ symbol, exchange, exchangeName }: InstrumentCurrencyInput): string {
  const ticker = (symbol ?? '').trim().toUpperCase();
  const suffix = ticker.includes('.') ? ticker.split('.').pop() ?? '' : '';
  if (suffix && CURRENCY_BY_SUFFIX[suffix]) return CURRENCY_BY_SUFFIX[suffix];

  const exchangeCode = (exchange ?? '').trim().toUpperCase();
  if (CURRENCY_BY_EXCHANGE[exchangeCode]) return CURRENCY_BY_EXCHANGE[exchangeCode];

  const exchangeLabel = (exchangeName ?? '').trim().toLowerCase();
  for (const [fragment, currency] of CURRENCY_BY_EXCHANGE_NAME) {
    if (exchangeLabel.includes(fragment)) return currency;
  }

  return 'USD';
}

// Funkcja zwracająca symbol waluty na podstawie jej kodu (np. "PLN" -> "zł")
export function currencySymbol(value?: string): string {
  if (!value) return '';
  const key = value.trim().toUpperCase();
  return CURRENCY_SYMBOLS[key] ?? value;
}
