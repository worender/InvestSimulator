export type PortfolioPillarKey = "stocks" | "bonds" | "cfd" | "crypto" | "etf";

export type AssetCategoryKey =
  | PortfolioPillarKey
  | "cfd_crypto"
  | "etf_funds";

export interface TransactionHistoryItem {
  id: string;
  date: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total: number;
}

export interface PortfolioAssetItem {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  category: AssetCategoryKey;
  currency: string;
  ownedQuantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  profitCurrency: number;
  profitPercent: number;
  firstPurchasedDate: string;
  returns: {
    oneMonth: number;
    threeMonths: number;
    oneYear: number;
    threeYears?: number;
    fiveYears?: number;
  };
  description: string;
  assetClassInfo: string;
  riskLevel: "Niski" | "Umiarkowany" | "Wysoki" | "Bardzo wysoki";
  purchaseHistory: TransactionHistoryItem[];
  salesHistory: TransactionHistoryItem[];
}

export interface PortfolioCategory {
  id: AssetCategoryKey;
  categoryId: number;
  kind: PortfolioPillarKey;
  title: string;
  subtitle: string;
  pastelBgLight: string;
  pastelBgDark: string;
  accentColor: string;
  totalValue: number;
  profitCurrency: number;
  profitPercent: number;
  items: PortfolioAssetItem[];
}

export interface Portfolio {
  id: string;
  walletId: number;
  name: string;
  currency: string;
  currencySymbol: string;
  cashBalance: number;
  totalValue: number;
  profitCurrency: number;
  profitPercent: number;
  categories: PortfolioCategory[];
}

export interface TradeInstrument {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  isMarketOpen: boolean;
  categoryLabel: string;
  pillarKey: PortfolioPillarKey;
  quoteType?: string;
  marketOpenTimeInfo?: string;
}
