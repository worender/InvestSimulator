import Ionicons from "@expo/vector-icons/Ionicons";
import { resolveMarketCategory } from "../instrumentCategories";
import type { PortfolioPillarKey } from "./types";

export type { PortfolioPillarKey } from "./types";

export interface PillarOption {
  key: PortfolioPillarKey;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  pastelLight: string;
  pastelDark: string;
}

export const PORTFOLIO_PILLARS: PillarOption[] = [
  {
    key: "stocks",
    title: "Akcje",
    description: "Udziały w spółkach notowanych na giełdach.",
    icon: "trending-up-outline",
    color: "#3b82f6",
    pastelLight: "rgba(219, 234, 254, 0.75)",
    pastelDark: "rgba(30, 58, 138, 0.40)",
  },
  {
    key: "bonds",
    title: "Obligacje",
    description: "Papiery dłużne emitowane przez państwa i firmy.",
    icon: "shield-checkmark-outline",
    color: "#f59e0b",
    pastelLight: "rgba(254, 243, 199, 0.75)",
    pastelDark: "rgba(146, 64, 14, 0.35)",
  },
  {
    key: "cfd",
    title: "CFD",
    description: "Kontrakty na różnicę kursu instrumentów bazowych.",
    icon: "swap-horizontal-outline",
    color: "#8b5cf6",
    pastelLight: "rgba(237, 233, 254, 0.80)",
    pastelDark: "rgba(91, 33, 182, 0.38)",
  },
  {
    key: "crypto",
    title: "Krypto",
    description: "Cyfrowe aktywa oparte na technologii blockchain.",
    icon: "logo-bitcoin",
    color: "#f97316",
    pastelLight: "rgba(255, 237, 213, 0.80)",
    pastelDark: "rgba(194, 65, 12, 0.38)",
  },
  {
    key: "etf",
    title: "ETF",
    description: "Fundusze ETF odwzorowujące indeksy i koszyki aktywów.",
    icon: "pie-chart-outline",
    color: "#10b981",
    pastelLight: "rgba(209, 250, 229, 0.75)",
    pastelDark: "rgba(6, 78, 59, 0.40)",
  },
];

export function getPillarOption(key: PortfolioPillarKey): PillarOption {
  return PORTFOLIO_PILLARS.find((pillar) => pillar.key === key) ?? PORTFOLIO_PILLARS[0];
}

export function resolvePillarKey(
  kind?: string | null,
  name?: string | null,
): PortfolioPillarKey {
  if (
    kind === "stocks" ||
    kind === "bonds" ||
    kind === "cfd" ||
    kind === "crypto" ||
    kind === "etf"
  ) {
    return kind;
  }

  const text = (name ?? "").toLowerCase();
  if (text.includes("obligac")) return "bonds";
  if (text.includes("krypto") || text.includes("crypto")) return "crypto";
  if (text.includes("cfd")) return "cfd";
  if (text.includes("etf") || text.includes("fundusz")) return "etf";
  return "stocks";
}

export function pillarKeyToAssetCategoryKey(
  key: PortfolioPillarKey,
): PortfolioPillarKey {
  return key;
}

export function resolvePillarFromQuoteType(
  quoteType?: string | null,
  symbol?: string,
  exchange?: string,
): PortfolioPillarKey {
  const type = (quoteType ?? "").trim().toUpperCase();

  if (type === "ETF" || type === "MUTUALFUND") return "etf";
  if (type === "CRYPTOCURRENCY" || type === "CRYPTO") return "crypto";
  if (type === "BOND" || type === "BONDS") return "bonds";
  if (
    type === "FUTURE" ||
    type === "INDEX" ||
    type === "CURRENCY" ||
    type === "OPTION"
  ) {
    return "cfd";
  }
  if (type === "EQUITY" || type === "STOCK") return "stocks";

  return resolveMarketCategory({ symbol, exchange });
}
