/**
 * Oddzielny moduł newsowy.
 *
 * Pobiera newsy Yahoo Finance przez endpoint `/api/news` (backend proxuje kanały RSS
 * Yahoo, dzięki czemu działa to także w wersji webowej bez problemów z CORS),
 * normalizuje odpowiedź i wykrywa język każdego artykułu (PL/EN).
 *
 * Moduł nie zależy od Reacta — można go używać w dowolnym miejscu aplikacji.
 */

import { notify } from "../notificationBus";
import { authenticatedFetch } from "./marketService";

export type NewsLanguage = "pl" | "en";
export type NewsTopic = "poland" | "world";

export const NEWS_TOPICS: readonly { id: NewsTopic; label: string }[] = [
  { id: "poland", label: "Polska" },
  { id: "world", label: "Świat" },
];

export interface YahooNewsItem {
  id: string;
  topic: NewsTopic;
  title: string;
  summary: string;
  publisher: string;
  link: string;
  publishedAt: string;
  language: NewsLanguage;
}

const PL_DIACRITICS = /[ąćęłńóśźż]/i;

// Najczęstsze słowa funkcyjne i tematyczne
const PL_WORDS = new Set([
  "i",
  "w",
  "we",
  "na",
  "z",
  "ze",
  "do",
  "dla",
  "jest",
  "są",
  "będzie",
  "nie",
  "się",
  "który",
  "która",
  "które",
  "oraz",
  "po",
  "od",
  "przez",
  "jak",
  "ale",
  "co",
  "tym",
  "tego",
  "tej",
  "rynku",
  "gospodarka",
  "gospodarki",
  "inflacja",
  "akcje",
  "spółka",
  "spółki",
  "bank",
  "prezes",
  "wzrost",
  "spadek",
  "procent",
  "mld",
  "mln",
  "tys",
  "rok",
  "roku",
  "lat",
  "dziś",
  "już",
  "także",
  "może",
  "przed",
  "między",
  "pod",
  "nad",
  "bez",
  "przy",
  "czy",
  "gdy",
  "bardzo",
  "nowe",
  "nowy",
  "polska",
  "polski",
  "polskie",
  "polsce",
]);

const EN_WORDS = new Set([
  "the",
  "and",
  "is",
  "are",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "as",
  "at",
  "by",
  "from",
  "this",
  "that",
  "will",
  "has",
  "have",
  "was",
  "were",
  "be",
  "its",
  "it",
  "or",
  "not",
  "but",
  "after",
  "before",
  "over",
  "about",
  "market",
  "markets",
  "stocks",
  "stock",
  "investors",
  "company",
  "companies",
  "shares",
  "price",
  "prices",
  "growth",
  "inflation",
  "bank",
  "week",
  "year",
  "years",
  "today",
  "new",
  "says",
  "said",
  "up",
  "down",
  "more",
  "than",
  "into",
  "while",
]);

/**
 * Wykrywa język tekstu newsa (tytuł + opis).
 * Zwraca `pl`, gdy tekst zawiera polskie znaki lub więcej polskich słów niż angielskich,
 * w przeciwnym razie `en`.
 */
export function detectNewsLanguage(
  ...parts: readonly (string | null | undefined)[]
): NewsLanguage {
  const text = parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
  if (!text) return "en";
  if (PL_DIACRITICS.test(text)) return "pl";

  const words = text.toLowerCase().match(/[a-ząćęłńóśźż]+/g) ?? [];
  let polishScore = 0;
  let englishScore = 0;

  for (const word of words) {
    if (PL_WORDS.has(word)) polishScore += 1;
    if (EN_WORDS.has(word)) englishScore += 1;
  }

  return polishScore > englishScore ? "pl" : "en";
}

interface RawNewsItem {
  id?: unknown;
  title?: unknown;
  summary?: unknown;
  publisher?: unknown;
  link?: unknown;
  publishedAt?: unknown;
}

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const toNewsItem = (raw: unknown, topic: NewsTopic): YahooNewsItem | null => {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as RawNewsItem;
  const title = asString(item.title).trim();
  const link = asString(item.link).trim();
  if (!title || !link) return null;

  const summary = asString(item.summary).trim();
  const publisher =
    asString(item.publisher, "Yahoo Finance").trim() || "Yahoo Finance";
  const publishedAtDate = new Date(asString(item.publishedAt));

  return {
    id: asString(item.id, link) || link,
    topic,
    title,
    summary,
    publisher,
    link,
    publishedAt: Number.isNaN(publishedAtDate.getTime())
      ? new Date().toISOString()
      : publishedAtDate.toISOString(),
    language: detectNewsLanguage(title, summary),
  };
};

/**
 * Pobiera newsy Yahoo Finance dla wybranego tematu.
 *
 * @param topic  `poland` (Polska) lub `world` (Świat)
 * @param limit  maksymalna liczba artykułów (1–30)
 * @param silent gdy `true`, błąd nie pokazuje powiadomienia (przydatne przy równoległym pobieraniu)
 */
export async function getYahooNews(
  topic: NewsTopic,
  limit = 15,
  { silent = false }: { silent?: boolean } = {},
): Promise<YahooNewsItem[]> {
  try {
    const response = await authenticatedFetch(
      `/api/news?topic=${encodeURIComponent(topic)}&limit=${Math.min(Math.max(limit, 1), 30)}`,
    );

    if (!response || !response.ok) {
      throw new Error(
        `Błąd pobierania newsów: ${response?.status ?? "brak odpowiedzi"}`,
      );
    }

    const data: unknown = await response.json();
    const items = (data as { items?: unknown } | null)?.items;
    if (!Array.isArray(items)) {
      throw new Error("Nieprawidłowy format listy newsów");
    }

    return items
      .map((item) => toNewsItem(item, topic))
      .filter((item): item is YahooNewsItem => item !== null);
  } catch (error) {
    console.error(`Błąd getYahooNews (${topic}):`, error);
    if (!silent) {
      notify({
        variant: "warning",
        title: "Brak newsów",
        message:
          "Nie udało się pobrać newsów z Yahoo Finance. Spróbuj ponownie za chwilę.",
      });
    }
    return [];
  }
}

/**
 * Pobiera obie kategorie newsów równolegle.
 * Zwraca obiekt z gotowymi listami
 */
export async function getYahooNewsByTopic(
  limit = 15,
): Promise<Record<NewsTopic, YahooNewsItem[]>> {
  const [poland, world] = await Promise.all([
    getYahooNews("poland", limit, { silent: true }),
    getYahooNews("world", limit, { silent: true }),
  ]);

  if (poland.length === 0 && world.length === 0) {
    notify({
      variant: "warning",
      title: "Brak newsów",
      message:
        "Nie udało się pobrać newsów z Yahoo Finance. Spróbuj ponownie za chwilę.",
    });
  }

  return { poland, world };
}
