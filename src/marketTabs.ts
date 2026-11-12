export type MarketInstrument = {
  symbol: string;
  name: string;
  exchange: string;
  exchangeName?: string;
  currency?: string;
};

export type MarketTabKey =
  | "watchlist"
  | "pl"
  | "world"
  | "cfd"
  | "crypto"
  | "gainers"
  | "active";

export type FixedMarketTabKey = "pl" | "world" | "cfd" | "crypto";
export type DynamicMarketTabKey = "gainers" | "active";

export const MARKET_TABS = [
  { key: "watchlist", label: "Obserwowane" },
  { key: "pl", label: "Polska" },
  { key: "world", label: "Liderzy" },
  { key: "cfd", label: "CFD" },
  { key: "crypto", label: "Krypto" },
  { key: "gainers", label: "Zyskujące" },
  { key: "active", label: "Najaktywniejsze" },
] as const satisfies readonly { key: MarketTabKey; label: string }[];

export const MARKET_SECTION_LABELS: Record<MarketTabKey, string> = {
  watchlist: "Obserwowane instrumenty",
  pl: "Polska · WIG20",
  world: "Największe firmy świata",
  cfd: "CFD · najważniejsze instrumenty",
  crypto: "Krypto · najważniejsze waluty",
  gainers: "Zyskujące · Yahoo Finance",
  active: "Najaktywniejsze · Yahoo Finance",
};

export const isFixedMarketTab = (tab: MarketTabKey): tab is FixedMarketTabKey =>
  tab === "pl" || tab === "world" || tab === "cfd" || tab === "crypto";

export const isDynamicMarketTab = (
  tab: MarketTabKey,
): tab is DynamicMarketTabKey => tab === "gainers" || tab === "active";

// Polska: aktualny skład WIG20
export const POLISH_INSTRUMENTS: MarketInstrument[] = [
  {
    symbol: "PKO",
    name: "PKO Bank Polski",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "PKN",
    name: "ORLEN",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "PEO",
    name: "Bank Pekao",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "KGH",
    name: "KGHM Polska Miedź",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "PZU",
    name: "Grupa PZU",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "LPP",
    name: "LPP",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "EBP",
    name: "Erste Bank Polska",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "ALE",
    name: "Allegro",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "CDR",
    name: "CD Projekt",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "DNP",
    name: "Dino Polska",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "MBK",
    name: "mBank",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "ZAB",
    name: "Żabka Group",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "ALR",
    name: "Alior Bank",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "KTY",
    name: "Grupa Kęty",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "TPE",
    name: "Tauron Polska Energia",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "PGE",
    name: "PGE Polska Grupa Energetyczna",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "BDX",
    name: "Budimex",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "KRU",
    name: "Kruk",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "PCO",
    name: "Pepco Group",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
  {
    symbol: "MDV",
    name: "Modivo",
    exchange: "GPW",
    exchangeName: "Warszawa GPW",
    currency: "PLN",
  },
];

// Świat: najbardziej znaczące spółki z głównych rynków
export const WORLD_INSTRUMENTS: MarketInstrument[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "AVGO",
    name: "Broadcom Inc.",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "LLY",
    name: "Eli Lilly and Company",
    exchange: "NYSE",
    exchangeName: "NYSE",
    currency: "USD",
  },
  {
    symbol: "BRK-B",
    name: "Berkshire Hathaway",
    exchange: "NYSE",
    exchangeName: "NYSE",
    currency: "USD",
  },
  {
    symbol: "WMT",
    name: "Walmart Inc.",
    exchange: "NYSE",
    exchangeName: "NYSE",
    currency: "USD",
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    exchange: "NYSE",
    exchangeName: "NYSE",
    currency: "USD",
  },
  {
    symbol: "V",
    name: "Visa Inc.",
    exchange: "NYSE",
    exchangeName: "NYSE",
    currency: "USD",
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil",
    exchange: "NYSE",
    exchangeName: "NYSE",
    currency: "USD",
  },
  {
    symbol: "TSM",
    name: "Taiwan Semiconductor",
    exchange: "NYSE",
    exchangeName: "NYSE",
    currency: "USD",
  },
  {
    symbol: "ASML",
    name: "ASML Holding",
    exchange: "NASDAQ",
    exchangeName: "NASDAQ",
    currency: "USD",
  },
  {
    symbol: "2222.SR",
    name: "Saudi Aramco",
    exchange: "SAU",
    exchangeName: "Tadawul",
    currency: "SAR",
  },
  {
    symbol: "0700.HK",
    name: "Tencent Holdings",
    exchange: "HKG",
    exchangeName: "Hong Kong",
    currency: "HKD",
  },
  {
    symbol: "NESN.SW",
    name: "Nestlé",
    exchange: "SWX",
    exchangeName: "SIX Swiss",
    currency: "CHF",
  },
  {
    symbol: "MC.PA",
    name: "LVMH",
    exchange: "EURONEXT_PARIS",
    exchangeName: "Euronext Paris",
    currency: "EUR",
  },
];

// CFD: 12 najważniejszych indeksów, surowców i par walutowych
export const CFD_INSTRUMENTS: MarketInstrument[] = [
  {
    symbol: "^GSPC",
    name: "S&P 500",
    exchange: "INDEX",
    exchangeName: "Indeksy CFD",
    currency: "USD",
  },
  {
    symbol: "^NDX",
    name: "NASDAQ 100",
    exchange: "INDEX",
    exchangeName: "Indeksy CFD",
    currency: "USD",
  },
  {
    symbol: "^DJI",
    name: "Dow Jones 30",
    exchange: "INDEX",
    exchangeName: "Indeksy CFD",
    currency: "USD",
  },
  {
    symbol: "^GDAXI",
    name: "DAX 40",
    exchange: "INDEX",
    exchangeName: "Indeksy CFD",
    currency: "EUR",
  },
  {
    symbol: "^FTSE",
    name: "FTSE 100",
    exchange: "INDEX",
    exchangeName: "Indeksy CFD",
    currency: "GBP",
  },
  {
    symbol: "GC=F",
    name: "Złoto",
    exchange: "COMEX",
    exchangeName: "COMEX",
    currency: "USD",
  },
  {
    symbol: "SI=F",
    name: "Srebro",
    exchange: "COMEX",
    exchangeName: "COMEX",
    currency: "USD",
  },
  {
    symbol: "CL=F",
    name: "Ropa WTI",
    exchange: "NYMEX",
    exchangeName: "NYMEX",
    currency: "USD",
  },
  {
    symbol: "BZ=F",
    name: "Ropa Brent",
    exchange: "NYMEX",
    exchangeName: "NYMEX",
    currency: "USD",
  },
  {
    symbol: "NG=F",
    name: "Gaz ziemny",
    exchange: "NYMEX",
    exchangeName: "NYMEX",
    currency: "USD",
  },
  {
    symbol: "EURUSD=X",
    name: "EUR/USD",
    exchange: "FOREX",
    exchangeName: "Forex",
    currency: "USD",
  },
  {
    symbol: "USDJPY=X",
    name: "USD/JPY",
    exchange: "FOREX",
    exchangeName: "Forex",
    currency: "JPY",
  },
];

// Krypto: 12 najważniejszych kryptowalut
export const CRYPTO_INSTRUMENTS: MarketInstrument[] = [
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "ETH-USD",
    name: "Ethereum",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "SOL-USD",
    name: "Solana",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "XRP-USD",
    name: "XRP",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "BNB-USD",
    name: "BNB",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "ADA-USD",
    name: "Cardano",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "DOGE-USD",
    name: "Dogecoin",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "AVAX-USD",
    name: "Avalanche",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "LINK-USD",
    name: "Chainlink",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "DOT-USD",
    name: "Polkadot",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "LTC-USD",
    name: "Litecoin",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
  {
    symbol: "BCH-USD",
    name: "Bitcoin Cash",
    exchange: "CCC",
    exchangeName: "Kryptowaluty",
    currency: "USD",
  },
];

export const FIXED_MARKET_INSTRUMENTS: Record<
  FixedMarketTabKey,
  MarketInstrument[]
> = {
  pl: POLISH_INSTRUMENTS,
  world: WORLD_INSTRUMENTS,
  cfd: CFD_INSTRUMENTS,
  crypto: CRYPTO_INSTRUMENTS,
};
