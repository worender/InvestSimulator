import type { StockFinancialData } from "./api/marketService";
import type { AssetCategoryKey } from "./portfolio/types";

/**
 * Kategoria rynkowa instrumentu, używana w panelu szczegółów i w module kupna/sprzedaży.
 * Wartość ta jest ustalana na podstawie kategorii portfela, symbolu lub giełdy.
 * W przypadku braku jednoznacznej identyfikacji domyślnie przyjmowana jest kategoria "stocks".
 */
export type InstrumentMarketCategory =
  | "stocks"
  | "etf"
  | "bonds"
  | "cfd"
  | "crypto";

export type InstrumentFilterCategory =
  | "STOCKS"
  | "BONDS"
  | "CFD"
  | "CRYPTO"
  | "ETF";

// Sposób formatowania pojedynczego pola danych rynkowych
export type MarketDetailFormat =
  | "currency"
  | "change"
  | "changePercent"
  | "percent"
  | "ratio"
  | "number"
  | "date"
  | "split";

// Pojedyncze pole panelu szczegółów rynkowych
export interface MarketDetailField {
  key: keyof StockFinancialData;
  label: string;
  format: MarketDetailFormat;
  // Pola takie jak cena czy zmiana mogą legalnie mieć wartość 0
  zeroIsMissing?: boolean;
}

// Sekcja panelu szczegółów rynkowych z listą pól
export interface MarketDetailSection {
  key: string;
  label: string;
  fields: MarketDetailField[];
}

// Nazwy kategorii
export const MARKET_CATEGORY_LABELS: Record<InstrumentMarketCategory, string> =
  {
    stocks: "Akcje",
    etf: "ETF / Fundusze",
    bonds: "Obligacje",
    cfd: "CFD",
    crypto: "Krypto",
  };

// Poziom ryzyka
export type InstrumentRiskLevel =
  | "Niski"
  | "Umiarkowany"
  | "Wysoki"
  | "Bardzo wysoki";

// Opis i charakterystyka instrumentu
export interface MarketInstrumentInfo {
  description: string;
  riskLevel: InstrumentRiskLevel;
  assetClassInfo: string;
}

// Domyślne informacje o instrumencie dla każdej kategorii rynkowej
export const MARKET_INSTRUMENT_INFO: Record<
  InstrumentMarketCategory,
  MarketInstrumentInfo
> = {
  stocks: {
    description:
      "Instrument reprezentuje udział w spółce notowanej na giełdzie. Jego wycena zależy od wyników finansowych, otoczenia rynkowego i sentymentu inwestorów.",
    riskLevel: "Umiarkowany",
    assetClassInfo:
      "Akcje dają prawo do udziału w zyskach spółki i mogą przynosić dywidendę, ale wiążą się z ryzykiem rynkowym.",
  },
  etf: {
    description:
      "Fundusz ETF odwzorowuje wybrany indeks lub koszyk aktywów i jest notowany na giełdzie podobnie jak akcje.",
    riskLevel: "Umiarkowany",
    assetClassInfo:
      "ETF umożliwia szeroką dywersyfikację przy niższych kosztach niż klasyczne fundusze inwestycyjne.",
  },
  bonds: {
    description:
      "Instrument dłużny, w którym emitent zobowiązuje się do wypłaty odsetek i zwrotu kapitału w ustalonym terminie.",
    riskLevel: "Niski",
    assetClassInfo:
      "Obligacje są zwykle mniej zmienne niż akcje, ale niosą ryzyko stopy procentowej oraz ryzyko emitenta.",
  },
  cfd: {
    description:
      "Kontrakt na różnicę (CFD) pozwala spekulować na zmianę ceny instrumentu bazowego bez konieczności jego fizycznego posiadania.",
    riskLevel: "Wysoki",
    assetClassInfo:
      "CFD wykorzystują dźwignię finansową, która zwiększa zarówno potencjalne zyski, jak i straty.",
  },
  crypto: {
    description:
      "Kryptowaluta to cyfrowe aktywo oparte na technologii blockchain, działające w modelu zdecentralizowanym.",
    riskLevel: "Bardzo wysoki",
    assetClassInfo:
      "Kryptowaluty cechują się bardzo wysoką zmiennością i handlem przez całą dobę.",
  },
};

const MARKET_FIELDS: MarketDetailField[] = [
  { key: "price", label: "Cena", format: "currency", zeroIsMissing: false },
  { key: "change", label: "Zmiana", format: "change", zeroIsMissing: false },
  {
    key: "changePercent",
    label: "Zmiana %",
    format: "changePercent",
    zeroIsMissing: false,
  },
  { key: "volume", label: "Wolumen", format: "number" },
  { key: "averageVolume", label: "Wolumen średni 10d", format: "number" },
];

const VALUATION_FIELDS: MarketDetailField[] = [
  { key: "trailingPE", label: "P/E (trailing)", format: "ratio" },
  { key: "forwardPE", label: "P/E (forward)", format: "ratio" },
  { key: "priceToBook", label: "P/B", format: "ratio" },
  { key: "priceToSales", label: "P/S", format: "ratio" },
  { key: "enterpriseValueToEbitda", label: "EV/EBITDA", format: "ratio" },
  { key: "priceToFreeCashFlow", label: "P/FCF", format: "ratio" },
  { key: "profitMargins", label: "Marża zysku", format: "percent" },
];

const DIVIDEND_FIELDS: MarketDetailField[] = [
  { key: "dividendYield", label: "Stopa dywidendy", format: "percent" },
  { key: "dividendRate", label: "Kwota dywidendy", format: "currency" },
  { key: "exDividendDate", label: "Data ex-dividenda", format: "date" },
  { key: "payoutRatio", label: "Payout ratio", format: "percent" },
  {
    key: "fiveYearAvgDividendYield",
    label: "Średnia 5-letnia dywidenda",
    format: "percent",
  },
];

const SHARES_FIELDS: MarketDetailField[] = [
  { key: "marketCap", label: "Kapitalizacja rynkowa", format: "currency" },
  { key: "sharesOutstanding", label: "Liczba akcji", format: "number" },
  { key: "bookValue", label: "Wartość księgowa", format: "currency" },
  { key: "floatShares", label: "Akcje w obiegu", format: "number" },
  { key: "beta", label: "Beta", format: "ratio" },
];

const PERFORMANCE_FIELDS: MarketDetailField[] = [
  {
    key: "performance1Y",
    label: "1 rok",
    format: "percent",
    zeroIsMissing: false,
  },
  {
    key: "performance3Y",
    label: "3 lata",
    format: "percent",
    zeroIsMissing: false,
  },
  {
    key: "performance5Y",
    label: "5 lat",
    format: "percent",
    zeroIsMissing: false,
  },
  {
    key: "performanceYTD",
    label: "Rok bieżący (YTD)",
    format: "percent",
    zeroIsMissing: false,
  },
  {
    key: "oneYearAvgReturn",
    label: "Średni zwrot 1 rok",
    format: "percent",
    zeroIsMissing: false,
  },
  {
    key: "threeYearAvgReturn",
    label: "Średni zwrot 3 lata",
    format: "percent",
    zeroIsMissing: false,
  },
  {
    key: "fiveYearAvgReturn",
    label: "Średni zwrot 5 lat",
    format: "percent",
    zeroIsMissing: false,
  },
];

const ADDITIONAL_FIELDS: MarketDetailField[] = [
  {
    key: "enterpriseValue",
    label: "Wartość przedsiębiorstwa",
    format: "currency",
  },
  {
    key: "enterpriseValueToRevenue",
    label: "EV/Przychody",
    format: "ratio",
  },
  { key: "sharesShort", label: "Akcje krótkoterminowe", format: "number" },
  { key: "shortRatio", label: "Stosunek krótkich akcji", format: "ratio" },
  {
    key: "shortPercentOfFloat",
    label: "% krótkich akcji",
    format: "percent",
  },
  { key: "lastSplitFactor", label: "Ostatni split", format: "split" },
];

// Jawne szablony sekcji dla każdej kategorii
const MARKET_DETAIL_TEMPLATES: Record<
  InstrumentMarketCategory,
  MarketDetailSection[]
> = {
  stocks: [
    { key: "market", label: "Dane rynkowe", fields: MARKET_FIELDS },
    { key: "valuation", label: "Wskaźniki wyceny", fields: VALUATION_FIELDS },
    { key: "dividends", label: "Dywidendy", fields: DIVIDEND_FIELDS },
    { key: "shares", label: "Wycena i akcje", fields: SHARES_FIELDS },
    {
      key: "performance",
      label: "Wyniki historyczne",
      fields: PERFORMANCE_FIELDS,
    },
    { key: "additional", label: "Dane dodatkowe", fields: ADDITIONAL_FIELDS },
  ],
  etf: [
    { key: "market", label: "Dane rynkowe", fields: MARKET_FIELDS },
    { key: "dividends", label: "Dywidendy", fields: DIVIDEND_FIELDS },
    {
      key: "fund",
      label: "Informacje o funduszu",
      fields: SHARES_FIELDS.filter((field) =>
        ["marketCap", "sharesOutstanding", "beta"].includes(field.key),
      ),
    },
    {
      key: "performance",
      label: "Wyniki historyczne",
      fields: PERFORMANCE_FIELDS,
    },
  ],
  bonds: [
    {
      key: "market",
      label: "Dane rynkowe",
      fields: MARKET_FIELDS.filter((field) =>
        ["price", "change", "changePercent", "volume"].includes(field.key),
      ),
    },
    {
      key: "income",
      label: "Oprocentowanie i dochód",
      fields: DIVIDEND_FIELDS.filter((field) =>
        ["dividendYield", "dividendRate", "payoutRatio"].includes(field.key),
      ),
    },
    {
      key: "performance",
      label: "Wyniki historyczne",
      fields: PERFORMANCE_FIELDS,
    },
  ],
  cfd: [
    {
      key: "market",
      label: "Dane rynkowe",
      fields: MARKET_FIELDS.filter((field) =>
        [
          "price",
          "change",
          "changePercent",
          "volume",
          "averageVolume",
        ].includes(field.key),
      ),
    },
    {
      key: "performance",
      label: "Wyniki historyczne",
      fields: PERFORMANCE_FIELDS,
    },
  ],
  crypto: [
    {
      key: "market",
      label: "Dane rynkowe",
      fields: MARKET_FIELDS.filter((field) =>
        [
          "price",
          "change",
          "changePercent",
          "volume",
          "averageVolume",
        ].includes(field.key),
      ),
    },
    {
      key: "supply",
      label: "Kapitalizacja i podaż",
      fields: SHARES_FIELDS.filter((field) =>
        ["marketCap", "sharesOutstanding", "floatShares"].includes(field.key),
      ),
    },
    {
      key: "performance",
      label: "Wyniki historyczne",
      fields: PERFORMANCE_FIELDS,
    },
  ],
};

/**
 * Zwraca szablon sekcji danych rynkowych dla wybranej kategorii instrumentu
 * @param category
 * @returns
 */
export function getMarketDetailTemplate(
  category: InstrumentMarketCategory = "stocks",
): MarketDetailSection[] {
  return MARKET_DETAIL_TEMPLATES[category] ?? MARKET_DETAIL_TEMPLATES.stocks;
}

function isCryptoInstrument(symbol: string, exchange: string): boolean {
  const normalizedExchange = exchange.toUpperCase();
  if (normalizedExchange === "CCC" || normalizedExchange === "CRYPTO") {
    return true;
  }
  return /-USD$/i.test(symbol);
}

function isCfdInstrument(symbol: string, exchange: string): boolean {
  const normalizedExchange = exchange.toUpperCase();
  if (["INDEX", "COMEX", "NYMEX", "FOREX"].includes(normalizedExchange)) {
    return true;
  }
  return symbol.startsWith("^") || /(?:=F|=X)$/i.test(symbol);
}

/**
 * Ustala kategorię instrumentu na podstawie kategorii portfela, symbolu lub giełdy
 * @param input
 * @returns
 */
export function resolveMarketCategory(input: {
  category?:
    | AssetCategoryKey
    | InstrumentFilterCategory
    | InstrumentMarketCategory;
  symbol?: string;
  exchange?: string;
}): InstrumentMarketCategory {
  const { category, symbol = "", exchange = "" } = input;

  switch (category) {
    case "stocks":
    case "STOCKS":
      return "stocks";
    case "etf":
    case "etf_funds":
      return "etf";
    case "bonds":
    case "BONDS":
      return "bonds";
    case "cfd":
    case "CFD":
      return "cfd";
    case "crypto":
    case "CRYPTO":
      return "crypto";
    case "cfd_crypto":
      return isCryptoInstrument(symbol, exchange) ? "crypto" : "cfd";
  }

  if (isCryptoInstrument(symbol, exchange)) return "crypto";
  if (isCfdInstrument(symbol, exchange)) return "cfd";
  return "stocks";
}
