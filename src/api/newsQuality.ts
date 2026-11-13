/**
 * Filtr jakości newsów po stronie aplikacji.
 *
 * Kopia reguł z `backend/newsQuality.js` — zabezpieczenie na wypadek starszego
 * backendu albo cache'u, który zwróci newsy bez treści. Opis z RSS to cała treść
 * artykułu w aplikacji, więc odrzucamy pozycje, w których nic nie ma.
 *
 * Wyrażenia regularne celowo bez `\p{...}`, żeby nie zależeć od obsługi
 * Unicode property escapes w silniku JS na urządzeniu.
 */

const MIN_SUMMARY_CHARS = 150;
const MIN_SUMMARY_WORDS = 25;
const DUPLICATE_KEY_CHARS = 120;

const EDITORIAL_PREFIX =
  /^\s*\((?:updates?|adds?|recasts?|corrects?)\b[^)]*\)?\s*/i;
const LEADING_HEADER = /^\s*key takeaways:?\s*/i;

const BOILERPLATE_PATTERNS: readonly RegExp[] = [
  /for questions about this article or underlying research/i,
  /released its [\w\s-]{0,40}investor letter/i,
];

const SENTENCE_END = /[.!?…"”')\]]\s*$/;
const UPPERCASE = "A-ZĄĆĘŁŃÓŚŹŻÀ-ÖØ-Þ";
const INNER_SENTENCE_END = new RegExp(
  `[.!?…]["”')\\]]?(?=\\s+["“(]?[${UPPERCASE}])`,
  "g",
);
const LETTER_OR_DIGIT = "a-z0-9ąćęłńóśźżà-öø-ÿ";
const NON_WORD = new RegExp(`[^${LETTER_OR_DIGIT}]+`, "g");
const WORD = new RegExp(`[${LETTER_OR_DIGIT}]+`, "g");

const normalize = (value: string): string =>
  value.toLowerCase().replace(NON_WORD, " ").trim();

const countWords = (value: string): number =>
  value.toLowerCase().match(WORD)?.length ?? 0;

const trimToLastSentence = (text: string): string => {
  if (SENTENCE_END.test(text)) return text;
  let lastEnd = -1;
  for (const match of text.matchAll(INNER_SENTENCE_END)) {
    lastEnd = (match.index ?? 0) + match[0].length;
  }
  return lastEnd > 0 ? text.slice(0, lastEnd) : text;
};

/**
 * Dzieli tekst na zdania. Kropka bez spacji i wielkiej litery po niej
 * (np. "5.6 billion", "Investing.com", "U.S. equities") nie kończy zdania.
 */
export const splitIntoSentences = (text: string): string[] => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  let start = 0;
  for (const match of normalized.matchAll(INNER_SENTENCE_END)) {
    const end = (match.index ?? 0) + match[0].length;
    sentences.push(normalized.slice(start, end).trim());
    start = end;
  }
  const rest = normalized.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences;
};

/** Usuwa notki redakcyjne i ucięty koniec, zostawiając pełne zdania. */
export const cleanNewsSummary = (summary: string): string =>
  trimToLastSentence(
    summary
      .replace(EDITORIAL_PREFIX, "")
      .replace(LEADING_HEADER, "")
      .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "…")
      .replace(/\s+/g, " ")
      .trim(),
  );

/** `true`, gdy oczyszczona treść jest wystarczająca do pokazania jako artykuł. */
export const hasReadableContent = ({
  title,
  summary,
}: {
  title: string;
  summary: string;
}): boolean => {
  if (!summary) return false;
  if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(summary))) {
    return false;
  }
  if (!SENTENCE_END.test(summary)) return false;
  if (
    summary.length < MIN_SUMMARY_CHARS ||
    countWords(summary) < MIN_SUMMARY_WORDS
  ) {
    return false;
  }

  const normalizedSummary = normalize(summary);
  const normalizedTitle = normalize(title);
  return !(
    normalizedSummary === normalizedTitle ||
    normalizedTitle.includes(normalizedSummary)
  );
};

/**
 * Czyści treść i zostawia tylko newsy z sensownym tekstem.
 * Opis powtarzający się pod różnymi tytułami odpada we wszystkich kopiach.
 */
export function filterNewsWithContent<
  T extends { title: string; summary: string },
>(items: readonly T[]): T[] {
  const cleaned = items.map((item) => ({
    ...item,
    summary: cleanNewsSummary(item.summary),
  }));

  const duplicateKey = (item: T) =>
    normalize(item.summary).slice(0, DUPLICATE_KEY_CHARS);

  const titlesBySummary = new Map<string, Set<string>>();
  for (const item of cleaned) {
    const key = duplicateKey(item);
    if (!key) continue;
    const titles = titlesBySummary.get(key) ?? new Set<string>();
    titles.add(normalize(item.title));
    titlesBySummary.set(key, titles);
  }

  return cleaned.filter((item) => {
    if (!hasReadableContent(item)) return false;
    const titles = titlesBySummary.get(duplicateKey(item));
    return !titles || titles.size <= 1;
  });
}
