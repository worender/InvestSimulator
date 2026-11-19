/**
 * Oddzielny moduł newsowy.
 *
 * Pobiera newsy Yahoo Finance przez endpoint `/api/news` (backend proxuje kanały RSS
 * Yahoo, dzięki czemu działa to także w wersji webowej bez problemów z CORS),
 * normalizuje odpowiedź i wykrywa język każdego artykułu (PL/EN).
 *
 * Moduł nie zależy od Reacta — można go używać w dowolnym miejscu aplikacji.
 * Hook Reacta z odświeżaniem listy: `useNewsFeed`.
 *
 * @module src/api/newsService
 */

import { NOTIFICATION_GROUPS, notify } from "../notificationBus";
import { authenticatedFetch } from "./marketService";

/** Język artykułu: `pl` — polski, `en` — angielski. */
export type NewsLanguage = "pl" | "en";

/** Temat newsów: `poland` — rynek polski, `world` — rynki światowe. */
export type NewsTopic = "poland" | "world";

/** Tematy newsów z etykietami do przełącznika kategorii w interfejsie. */
export const NEWS_TOPICS: readonly { id: NewsTopic; label: string }[] = [
  { id: "poland", label: "Polska" },
  { id: "world", label: "Świat" },
];

/** Znormalizowany artykuł z Yahoo Finance, gotowy do wyświetlenia. */
export interface YahooNewsItem {
  /** Unikalny identyfikator (`guid` z RSS albo link). */
  id: string;
  /** Temat, w ramach którego pobrano artykuł. */
  topic: NewsTopic;
  /** Tytuł artykułu. */
  title: string;
  /** Treść (opis z RSS oczyszczony przez backend); może być pusta. */
  summary: string;
  /** Nazwa wydawcy, domyślnie `"Yahoo Finance"`. */
  publisher: string;
  /** Adres artykułu u wydawcy. */
  link: string;
  /** Data publikacji w ISO 8601 (bieżąca, gdy brak poprawnej daty). */
  publishedAt: string;
  /** Wykryty język artykułu (patrz {@link detectNewsLanguage}). */
  language: NewsLanguage;
}

/** Polskie znaki diakrytyczne — ich obecność od razu oznacza tekst polski. */
const PL_DIACRITICS = /[ąćęłńóśźż]/i;

/** Najczęstsze polskie słowa funkcyjne i tematyczne (do wykrywania języka). */
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

/** Najczęstsze angielskie słowa funkcyjne i tematyczne (do wykrywania języka). */
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
 *
 * Zwraca `pl`, gdy tekst zawiera polskie znaki (`PL_DIACRITICS`) lub
 * więcej słów z `PL_WORDS` niż z `EN_WORDS`; w przeciwnym razie
 * (także dla pustego tekstu) `en`.
 *
 * @param parts Fragmenty tekstu do połączenia; puste i `null` są pomijane.
 * @returns Wykryty język.
 *
 * @example
 * detectNewsLanguage("Stocks rise", "Investors cheer the news"); // "en"
 * detectNewsLanguage("Akcje PKO rosną");                          // "pl"
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

/**
 * Element listy `items` z odpowiedzi `GET /api/news` przed walidacją —
 * każde pole może mieć dowolny typ.
 */
interface RawNewsItem {
  id?: unknown;
  title?: unknown;
  summary?: unknown;
  publisher?: unknown;
  link?: unknown;
  publishedAt?: unknown;
}

/**
 * Zwraca wartość, jeśli jest tekstem, a w przeciwnym razie wartość zastępczą.
 *
 * @param value Dowolna wartość z odpowiedzi API.
 * @param fallback Wartość zastępcza (domyślnie pusty tekst).
 * @returns Tekst.
 */
const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

/**
 * Waliduje i normalizuje surowy element odpowiedzi `/api/news`.
 *
 * Elementy bez tytułu lub linku są odrzucane. Brak wydawcy → `"Yahoo Finance"`,
 * niepoprawna data → bieżąca data, brak `id` → link. Dodaje temat
 * i wykryty język ({@link detectNewsLanguage}).
 *
 * @param raw Surowy element z odpowiedzi.
 * @param topic Temat, dla którego pobrano newsy.
 * @returns Artykuł albo `null`, gdy element jest niepoprawny.
 */
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
 * Pobiera newsy Yahoo Finance dla wybranego tematu (`GET /api/news`).
 *
 * Newsy bez sensownej treści są odrzucane już przez backend. Przy błędzie
 * zwraca pustą listę i (o ile nie `silent`) pokazuje powiadomienie.
 *
 * @param topic `poland` (Polska) lub `world` (Świat).
 * @param limit Maksymalna liczba artykułów; wartość jest ograniczana do 1–30 (domyślnie 15).
 * @param options Opcje pobierania.
 * @param options.silent Gdy `true`, błąd nie pokazuje powiadomienia (przydatne przy równoległym pobieraniu).
 * @returns Lista artykułów od najnowszego; pusta przy błędzie.
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

    // Newsy bez treści odfiltrowuje backend (`backend/newsQuality.js`)
    return items
      .map((item) => toNewsItem(item, topic))
      .filter((item): item is YahooNewsItem => item !== null);
  } catch (error) {
    console.error(`Błąd getYahooNews (${topic}):`, error);
    if (!silent) {
      notify({
        variant: "warning",
        title: "Brak newsów",
        category: NOTIFICATION_GROUPS.newsFeed,
        message:
          "Nie udało się pobrać newsów z Yahoo Finance. Spróbuj ponownie za chwilę.",
      });
    }
    return [];
  }
}

/**
 * Pobiera obie kategorie newsów równolegle.
 *
 * Pojedyncze błędy są wyciszone — powiadomienie pojawia się tylko raz, gdy
 * obie listy są puste (i nie ustawiono `silent`).
 *
 * @param limit Maksymalna liczba artykułów w każdej kategorii (domyślnie 15).
 * @param options Opcje pobierania.
 * @param options.silent Gdy `true`, brak newsów nie pokazuje powiadomienia (np. przy odświeżaniu w tle).
 * @returns Obiekt `{ poland, world }` z listami artykułów.
 */
export async function getYahooNewsByTopic(
  limit = 15,
  { silent = false }: { silent?: boolean } = {},
): Promise<Record<NewsTopic, YahooNewsItem[]>> {
  const [poland, world] = await Promise.all([
    getYahooNews("poland", limit, { silent: true }),
    getYahooNews("world", limit, { silent: true }),
  ]);

  if (!silent && poland.length === 0 && world.length === 0) {
    notify({
      variant: "warning",
      title: "Brak newsów",
      category: NOTIFICATION_GROUPS.newsFeed,
      message:
        "Nie udało się pobrać newsów z Yahoo Finance. Spróbuj ponownie za chwilę.",
    });
  }

  return { poland, world };
}
