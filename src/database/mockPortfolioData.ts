export type AssetCategoryKey = 'stocks' | 'bonds' | 'cfd_crypto' | 'etf_funds';

export interface TransactionHistoryItem {
  id: string;
  date: string;
  type: 'BUY' | 'SELL';
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
  riskLevel: 'Niski' | 'Umiarkowany' | 'Wysoki' | 'Bardzo wysoki';
  purchaseHistory: TransactionHistoryItem[];
  salesHistory: TransactionHistoryItem[];
}

export interface PortfolioCategory {
  id: AssetCategoryKey;
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

export interface MockPortfolio {
  id: string;
  name: string;
  currency: string;
  currencySymbol: string;
  cashBalance: number;
  totalValue: number;
  profitCurrency: number;
  profitPercent: number;
  categories: PortfolioCategory[];
}

export const MOCK_PORTFOLIOS: MockPortfolio[] = [
  {
    id: 'port-1',
    name: 'Główny Portfel Zrównoważony',
    currency: 'PLN',
    currencySymbol: 'zł',
    cashBalance: 14500.0,
    totalValue: 124850.0,
    profitCurrency: 18450.0,
    profitPercent: 17.34,
    categories: [
      {
        id: 'stocks',
        title: 'Akcje',
        subtitle: 'GPW i rynki rozwinięte',
        pastelBgLight: 'rgba(219, 234, 254, 0.75)', // pastel blue
        pastelBgDark: 'rgba(30, 58, 138, 0.40)',
        accentColor: '#3b82f6',
        totalValue: 56400.0,
        profitCurrency: 11200.0,
        profitPercent: 24.78,
        items: [
          {
            id: 'stock-pko',
            symbol: 'PKO',
            name: 'PKO Bank Polski',
            exchange: 'GPW',
            category: 'stocks',
            currency: 'PLN',
            ownedQuantity: 400,
            averageBuyPrice: 48.5,
            currentPrice: 59.2,
            totalValue: 23680.0,
            profitCurrency: 4280.0,
            profitPercent: 22.06,
            firstPurchasedDate: '2023-04-12',
            returns: {
              oneMonth: 3.4,
              threeMonths: 8.9,
              oneYear: 28.5,
              threeYears: 42.1,
            },
            description:
              'Największy bank uniwersalny w Polsce z dominującą pozycją w segmencie detalicznym i korporacyjnym.',
            assetClassInfo:
              'Akcje reprezentują ułamkową własność w spółce akcyjnej. Dają prawo do dywidendy oraz udziału w zyskach kapitałowych.',
            riskLevel: 'Umiarkowany',
            purchaseHistory: [
              {
                id: 'tx-pko-1',
                date: '2023-04-12',
                type: 'BUY',
                quantity: 250,
                price: 46.0,
                total: 11500.0,
              },
              {
                id: 'tx-pko-2',
                date: '2023-11-20',
                type: 'BUY',
                quantity: 150,
                price: 52.67,
                total: 7900.0,
              },
            ],
            salesHistory: [],
          },
          {
            id: 'stock-cdr',
            symbol: 'CDR',
            name: 'CD Projekt',
            exchange: 'GPW',
            category: 'stocks',
            currency: 'PLN',
            ownedQuantity: 120,
            averageBuyPrice: 125.0,
            currentPrice: 152.4,
            totalValue: 18288.0,
            profitCurrency: 3288.0,
            profitPercent: 21.92,
            firstPurchasedDate: '2022-09-15',
            returns: {
              oneMonth: 5.1,
              threeMonths: 12.3,
              oneYear: 31.8,
              threeYears: 18.4,
            },
            description:
              'Wiodący polski producent gier wideo, twórca serii Wiedźmin oraz Cyberpunk 2077.',
            assetClassInfo:
              'Akcje spółek gamingowych charakteryzują się wyższą zmiennością związaną z cyklem premier produktów.',
            riskLevel: 'Wysoki',
            purchaseHistory: [
              {
                id: 'tx-cdr-1',
                date: '2022-09-15',
                type: 'BUY',
                quantity: 160,
                price: 120.0,
                total: 19200.0,
              },
            ],
            salesHistory: [
              {
                id: 'tx-cdr-s1',
                date: '2023-06-10',
                type: 'SELL',
                quantity: 40,
                price: 145.0,
                total: 5800.0,
              },
            ],
          },
          {
            id: 'stock-nvda',
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            exchange: 'NASDAQ',
            category: 'stocks',
            currency: 'USD',
            ownedQuantity: 10,
            averageBuyPrice: 98.0,
            currentPrice: 135.5,
            totalValue: 14432.0,
            profitCurrency: 3632.0,
            profitPercent: 38.27,
            firstPurchasedDate: '2024-01-10',
            returns: {
              oneMonth: 4.8,
              threeMonths: 16.2,
              oneYear: 78.4,
            },
            description:
              'Globalny lider technologii obliczeniowych AI, procesorów graficznych (GPU) i układów scalonych.',
            assetClassInfo:
              'Spółka technologiczna wzrostowa (Growth) korzystająca z globalnego trendu sztucznej inteligencji.',
            riskLevel: 'Wysoki',
            purchaseHistory: [
              {
                id: 'tx-nvda-1',
                date: '2024-01-10',
                type: 'BUY',
                quantity: 10,
                price: 98.0,
                total: 980.0,
              },
            ],
            salesHistory: [],
          },
        ],
      },
      {
        id: 'bonds',
        title: 'Obligacje',
        subtitle: 'Skarbowe i korporacyjne',
        pastelBgLight: 'rgba(254, 243, 199, 0.75)', // pastel amber/gold
        pastelBgDark: 'rgba(146, 64, 14, 0.35)',
        accentColor: '#f59e0b',
        totalValue: 34200.0,
        profitCurrency: 2450.0,
        profitPercent: 7.72,
        items: [
          {
            id: 'bond-edos',
            symbol: 'EDO10Y',
            name: 'Obligacje Skarbowe 10-letnie EDO',
            exchange: 'GPW Catalyst',
            category: 'bonds',
            currency: 'PLN',
            ownedQuantity: 200,
            averageBuyPrice: 100.0,
            currentPrice: 108.4,
            totalValue: 21680.0,
            profitCurrency: 1680.0,
            profitPercent: 8.4,
            firstPurchasedDate: '2023-01-05',
            returns: {
              oneMonth: 0.6,
              threeMonths: 1.8,
              oneYear: 7.2,
            },
            description:
              'Emerytalne dziesięcioletnie oszczędnościowe obligacje skarbowe z oprocentowaniem indeksowanym inflacją.',
            assetClassInfo:
              'Obligacje skarbowe to dłużne papiery wartościowe gwarantowane przez Skarb Państwa, oferujące stały lub zmienny kupon.',
            riskLevel: 'Niski',
            purchaseHistory: [
              {
                id: 'tx-edo-1',
                date: '2023-01-05',
                type: 'BUY',
                quantity: 200,
                price: 100.0,
                total: 20000.0,
              },
            ],
            salesHistory: [],
          },
          {
            id: 'bond-pkr',
            symbol: 'PKR0428',
            name: 'Obligacje Korporacyjne PKN Orlen 2028',
            exchange: 'GPW Catalyst',
            category: 'bonds',
            currency: 'PLN',
            ownedQuantity: 120,
            averageBuyPrice: 100.0,
            currentPrice: 106.4,
            totalValue: 12520.0,
            profitCurrency: 770.0,
            profitPercent: 6.4,
            firstPurchasedDate: '2023-05-18',
            returns: {
              oneMonth: 0.5,
              threeMonths: 1.5,
              oneYear: 6.8,
            },
            description:
              'Papiery dłużne wyemitowane przez Grupę Orlen oparte na wskaźniku WIBOR 6M plus marża inwestycyjna.',
            assetClassInfo:
              'Obligacje korporacyjne oferują wyższą stopę zwrotu niż skarbowe przy umiarkowanym ryzyku emitenta.',
            riskLevel: 'Umiarkowany',
            purchaseHistory: [
              {
                id: 'tx-pkr-1',
                date: '2023-05-18',
                type: 'BUY',
                quantity: 120,
                price: 100.0,
                total: 12000.0,
              },
            ],
            salesHistory: [],
          },
        ],
      },
      {
        id: 'cfd_crypto',
        title: 'CFD / Krypto',
        subtitle: 'Cyfrowe aktywa i kontrakty',
        pastelBgLight: 'rgba(237, 233, 254, 0.80)', // pastel purple
        pastelBgDark: 'rgba(91, 33, 182, 0.38)',
        accentColor: '#8b5cf6',
        totalValue: 18750.0,
        profitCurrency: 3950.0,
        profitPercent: 26.69,
        items: [
          {
            id: 'crypto-btc',
            symbol: 'BTC',
            name: 'Bitcoin',
            exchange: 'CRYPTO',
            category: 'cfd_crypto',
            currency: 'PLN',
            ownedQuantity: 0.045,
            averageBuyPrice: 240000.0,
            currentPrice: 285000.0,
            totalValue: 12825.0,
            profitCurrency: 2025.0,
            profitPercent: 18.75,
            firstPurchasedDate: '2023-08-10',
            returns: {
              oneMonth: 7.2,
              threeMonths: 18.5,
              oneYear: 62.0,
            },
            description:
              'Zdecentralizowana cyfrowa waluta bazująca na sieci peer-to-peer i technologii blockchain.',
            assetClassInfo:
              'Kryptowaluty cechują się bardzo wysoką zmiennością cenową i specyfiką rynku działającego 24/7.',
            riskLevel: 'Bardzo wysoki',
            purchaseHistory: [
              {
                id: 'tx-btc-1',
                date: '2023-08-10',
                type: 'BUY',
                quantity: 0.045,
                price: 240000.0,
                total: 10800.0,
              },
            ],
            salesHistory: [],
          },
          {
            id: 'crypto-eth',
            symbol: 'ETH',
            name: 'Ethereum',
            exchange: 'CRYPTO',
            category: 'cfd_crypto',
            currency: 'PLN',
            ownedQuantity: 0.45,
            averageBuyPrice: 8800.0,
            currentPrice: 13166.0,
            totalValue: 5925.0,
            profitCurrency: 1925.0,
            profitPercent: 48.12,
            firstPurchasedDate: '2023-03-22',
            returns: {
              oneMonth: 4.1,
              threeMonths: 14.8,
              oneYear: 51.3,
            },
            description:
              'Platforma smart kontraktów umożliwiająca tworzenie aplikacji zdecentralizowanych (dApps) i protokołów DeFi.',
            assetClassInfo:
              'Aktywo cyfrowe oparte na mechanizmie Proof of Stake, umożliwiające staking i generowanie dochodu pasywnego.',
            riskLevel: 'Bardzo wysoki',
            purchaseHistory: [
              {
                id: 'tx-eth-1',
                date: '2023-03-22',
                type: 'BUY',
                quantity: 0.7,
                price: 8800.0,
                total: 6160.0,
              },
            ],
            salesHistory: [
              {
                id: 'tx-eth-s1',
                date: '2024-02-14',
                type: 'SELL',
                quantity: 0.25,
                price: 12400.0,
                total: 3100.0,
              },
            ],
          },
        ],
      },
      {
        id: 'etf_funds',
        title: 'ETF / Fundusze',
        subtitle: 'Pasywne indeksy i fundusze',
        pastelBgLight: 'rgba(209, 250, 229, 0.75)', // pastel emerald/mint
        pastelBgDark: 'rgba(6, 78, 59, 0.40)',
        accentColor: '#10b981',
        totalValue: 15500.0,
        profitCurrency: 850.0,
        profitPercent: 5.8,
        items: [
          {
            id: 'etf-vwce',
            symbol: 'VWCE',
            name: 'Vanguard FTSE All-World UCITS ETF',
            exchange: 'XETRA',
            category: 'etf_funds',
            currency: 'EUR',
            ownedQuantity: 28,
            averageBuyPrice: 108.0,
            currentPrice: 115.2,
            totalValue: 9800.0,
            profitCurrency: 610.0,
            profitPercent: 6.67,
            firstPurchasedDate: '2023-10-01',
            returns: {
              oneMonth: 1.8,
              threeMonths: 4.5,
              oneYear: 16.4,
            },
            description:
              'Fundusz ETF inwestujący w ponad 3700 spółek o dużej i średniej kapitalizacji z rynków rozwiniętych i wschodzących.',
            assetClassInfo:
              'ETF (Exchange Traded Fund) to fundusz notowany na giełdzie replikujący dany indeks przy niskich kosztach zarządzania (TER).',
            riskLevel: 'Umiarkowany',
            purchaseHistory: [
              {
                id: 'tx-vwce-1',
                date: '2023-10-01',
                type: 'BUY',
                quantity: 28,
                price: 108.0,
                total: 3024.0,
              },
            ],
            salesHistory: [],
          },
          {
            id: 'etf-betasp500',
            symbol: 'BETASP500',
            name: 'BETA ETF S&P 500 PLN-Hedged',
            exchange: 'GPW',
            category: 'etf_funds',
            currency: 'PLN',
            ownedQuantity: 40,
            averageBuyPrice: 136.0,
            currentPrice: 142.5,
            totalValue: 5700.0,
            profitCurrency: 240.0,
            profitPercent: 4.4,
            firstPurchasedDate: '2024-02-01',
            returns: {
              oneMonth: 2.1,
              threeMonths: 5.8,
              oneYear: 19.2,
            },
            description:
              'Polski fundusz ETF odzwierciedlający wyniki amerykańskiego indeksu S&P 500 z zabezpieczeniem ryzyka walutowego do PLN.',
            assetClassInfo:
              'Umożliwia inwestowanie na giełdzie amerykańskiej bez bezpośredniego wpływu wahań kursu USD/PLN.',
            riskLevel: 'Umiarkowany',
            purchaseHistory: [
              {
                id: 'tx-sp500-1',
                date: '2024-02-01',
                type: 'BUY',
                quantity: 40,
                price: 136.0,
                total: 5440.0,
              },
            ],
            salesHistory: [],
          },
        ],
      },
    ],
  },
  {
    id: 'port-2',
    name: 'Portfel Emerytalny IKE/IKZE',
    currency: 'PLN',
    currencySymbol: 'zł',
    cashBalance: 8200.0,
    totalValue: 86400.0,
    profitCurrency: 12300.0,
    profitPercent: 16.6,
    categories: [
      {
        id: 'stocks',
        title: 'Akcje Dywidendowe',
        subtitle: 'Stabilne spółki z dywidendą',
        pastelBgLight: 'rgba(219, 234, 254, 0.75)',
        pastelBgDark: 'rgba(30, 58, 138, 0.40)',
        accentColor: '#3b82f6',
        totalValue: 36000.0,
        profitCurrency: 6200.0,
        profitPercent: 20.8,
        items: [],
      },
      {
        id: 'bonds',
        title: 'Obligacje Skarbowe',
        subtitle: 'Długoterminowa ochrona kapitału',
        pastelBgLight: 'rgba(254, 243, 199, 0.75)',
        pastelBgDark: 'rgba(146, 64, 14, 0.35)',
        accentColor: '#f59e0b',
        totalValue: 35000.0,
        profitCurrency: 4100.0,
        profitPercent: 13.27,
        items: [],
      },
      {
        id: 'cfd_crypto',
        title: 'CFD / Krypto',
        subtitle: 'Znikoma alokacja hedgingowa',
        pastelBgLight: 'rgba(237, 233, 254, 0.80)',
        pastelBgDark: 'rgba(91, 33, 182, 0.38)',
        accentColor: '#8b5cf6',
        totalValue: 2400.0,
        profitCurrency: 400.0,
        profitPercent: 20.0,
        items: [],
      },
      {
        id: 'etf_funds',
        title: 'ETF Globalne',
        subtitle: 'Szeroka dywersyfikacja',
        pastelBgLight: 'rgba(209, 250, 229, 0.75)',
        pastelBgDark: 'rgba(6, 78, 59, 0.40)',
        accentColor: '#10b981',
        totalValue: 13000.0,
        profitCurrency: 1600.0,
        profitPercent: 14.04,
        items: [],
      },
    ],
  },
  {
    id: 'port-3',
    name: 'Portfel Wzrostowy Global Tech',
    currency: 'USD',
    currencySymbol: '$',
    cashBalance: 4200.0,
    totalValue: 48900.0,
    profitCurrency: -1450.0, // negative profit example!
    profitPercent: -2.88,
    categories: [
      {
        id: 'stocks',
        title: 'Akcje Big Tech',
        subtitle: 'Spółki amerykańskie',
        pastelBgLight: 'rgba(219, 234, 254, 0.75)',
        pastelBgDark: 'rgba(30, 58, 138, 0.40)',
        accentColor: '#3b82f6',
        totalValue: 28000.0,
        profitCurrency: -900.0,
        profitPercent: -3.11,
        items: [],
      },
      {
        id: 'bonds',
        title: 'Obligacje US Treasuries',
        subtitle: 'Bony skarbowe USA',
        pastelBgLight: 'rgba(254, 243, 199, 0.75)',
        pastelBgDark: 'rgba(146, 64, 14, 0.35)',
        accentColor: '#f59e0b',
        totalValue: 8000.0,
        profitCurrency: 320.0,
        profitPercent: 4.17,
        items: [],
      },
      {
        id: 'cfd_crypto',
        title: 'Krypto & Web3',
        subtitle: 'Wysokie ryzyko i zmienność',
        pastelBgLight: 'rgba(237, 233, 254, 0.80)',
        pastelBgDark: 'rgba(91, 33, 182, 0.38)',
        accentColor: '#8b5cf6',
        totalValue: 8500.0,
        profitCurrency: -1100.0,
        profitPercent: -11.46,
        items: [],
      },
      {
        id: 'etf_funds',
        title: 'ETF Sektorowe (Semiconductors)',
        subtitle: 'Półprzewodniki i chmura',
        pastelBgLight: 'rgba(209, 250, 229, 0.75)',
        pastelBgDark: 'rgba(6, 78, 59, 0.40)',
        accentColor: '#10b981',
        totalValue: 4400.0,
        profitCurrency: 230.0,
        profitPercent: 5.52,
        items: [],
      },
    ],
  },
];

