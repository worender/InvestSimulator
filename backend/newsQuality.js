/**
 * Filtr jakości newsów z RSS Yahoo.
 *
 * RSS daje tylko `description`, które w aplikacji jest całą treścią artykułu.
 * Odrzucamy pozycje, w których ta treść nic nie wnosi: obcięte zdania, stopki
 * wydawców, ten sam szablon pod wieloma tytułami albo powtórzony tytuł.
 */

// Minimalna długość treści po oczyszczeniu
const MIN_SUMMARY_CHARS = 150;
const MIN_SUMMARY_WORDS = 25;
// Długość prefiksu, po którym rozpoznajemy ten sam opis pod różnymi tytułami
const DUPLICATE_KEY_CHARS = 120;

// Notki redakcyjne na początku opisu, np. "(Updates with index/price moves ...)"
const EDITORIAL_PREFIX = /^\s*\((?:updates?|adds?|recasts?|corrects?)\b[^)]*\)?\s*/i;

// Stałe stopki / szablony, które nie są treścią artykułu
const BOILERPLATE_PATTERNS = [
  /for questions about this article or underlying research/i,
  /released its [\w\s-]{0,40}investor letter/i,
];

// Nagłówek sklejony z treścią, np. "Key TakeawaysIonQ shares are up..."
const LEADING_HEADER = /^\s*key takeaways:?\s*/i;

// Kończy się jak pełne zdanie (kropka, wykrzyknik, pytajnik, wielokropek, cudzysłów, nawias)
const SENTENCE_END = /[.!?…"”')\]]\s*$/;

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const countWords = (value) => (value.match(/[\p{L}\p{N}]+/gu) || []).length;

// Koniec zdania w środku tekstu: znak końca, opcjonalny cudzysłów/nawias, spacja i wielka litera.
// Wielka litera po spacji odsiewa skróty i liczby typu "U.S. equities" czy "$153.44".
const INNER_SENTENCE_END = /[.!?…]["”')\]]?(?=\s+["“(]?\p{Lu})/gu;

// Yahoo ucina `description` w połowie zdania (ok. 100 albo 450–500 znaków).
// Zostawiamy tylko pełne zdania; gdy żadnego nie ma, tekst zostaje i odpada jako obcięty.
const trimToLastSentence = (text) => {
  if (SENTENCE_END.test(text)) return text;
  let lastEnd = -1;
  for (const match of text.matchAll(INNER_SENTENCE_END)) {
    lastEnd = match.index + match[0].length;
  }
  return lastEnd > 0 ? text.slice(0, lastEnd) : text;
};

const cleanSummary = (summary = "") =>
  trimToLastSentence(
    String(summary)
      .replace(EDITORIAL_PREFIX, "")
      .replace(LEADING_HEADER, "")
      .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "…")
      .replace(/\s+/g, " ")
      .trim(),
  );

/**
 * Zwraca powód odrzucenia albo `null`, gdy treść jest wystarczająca.
 * Oczekuje treści po `cleanSummary`. Nie sprawdza duplikatów — to robi
 * `filterNewsWithContent` na całej liście.
 */
const getRejectionReason = ({ title = "", summary = "" }) => {
  if (!summary) return "brak treści";
  if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(summary))) {
    return "szablon";
  }
  if (!SENTENCE_END.test(summary)) return "obcięta treść";
  if (
    summary.length < MIN_SUMMARY_CHARS ||
    countWords(summary) < MIN_SUMMARY_WORDS
  ) {
    return "za krótka treść";
  }

  const normalizedSummary = normalize(summary);
  const normalizedTitle = normalize(title);
  if (
    normalizedSummary === normalizedTitle ||
    normalizedTitle.includes(normalizedSummary)
  ) {
    return "powtórzony tytuł";
  }

  return null;
};

/**
 * Czyści treść newsów i zostawia tylko te, które mają sensowny tekst.
 * Opis, który powtarza się pod różnymi tytułami, odrzucany jest we wszystkich kopiach.
 *
 * @param {Array<{title: string, summary: string}>} items
 * @param {{onReject?: (item: object, reason: string) => void}} [options]
 */
const filterNewsWithContent = (items, { onReject } = {}) => {
  const cleaned = items.map((item) => ({
    ...item,
    summary: cleanSummary(item.summary),
  }));

  const titlesBySummary = new Map();
  for (const item of cleaned) {
    const key = normalize(item.summary).slice(0, DUPLICATE_KEY_CHARS);
    if (!key) continue;
    const titles = titlesBySummary.get(key) || new Set();
    titles.add(normalize(item.title));
    titlesBySummary.set(key, titles);
  }

  return cleaned.filter((item) => {
    const key = normalize(item.summary).slice(0, DUPLICATE_KEY_CHARS);
    const reason =
      getRejectionReason(item) ??
      (key && titlesBySummary.get(key).size > 1 ? "ten sam opis" : null);
    if (reason) onReject?.(item, reason);
    return !reason;
  });
};

module.exports = {
  MIN_SUMMARY_CHARS,
  MIN_SUMMARY_WORDS,
  cleanSummary,
  getRejectionReason,
  filterNewsWithContent,
};
