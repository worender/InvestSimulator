/**
 * Filtr jakości newsów z RSS Yahoo Finance.
 *
 * RSS Yahoo udostępnia tylko pole `description`, które w aplikacji jest
 * wyświetlane jako cała treść artykułu. Moduł czyści ten tekst i odrzuca
 * pozycje, w których treść nic nie wnosi:
 * - obcięte w połowie zdania opisy,
 * - stałe stopki i szablony wydawców,
 * - ten sam opis opublikowany pod wieloma różnymi tytułami,
 * - opis, który jedynie powtarza tytuł,
 * - zbyt krótkie teksty.
 *
 * Używany przez `backend/server.js` przy budowaniu odpowiedzi `GET /api/news`.
 *
 * @module backend/newsQuality
 */

/**
 * Minimalna liczba znaków treści (po oczyszczeniu przez {@link cleanSummary}),
 * aby news został zaakceptowany.
 */
const MIN_SUMMARY_CHARS = 150;

/**
 * Minimalna liczba słów treści (po oczyszczeniu przez {@link cleanSummary}),
 * aby news został zaakceptowany.
 */
const MIN_SUMMARY_WORDS = 25;

/**
 * Długość znormalizowanego prefiksu opisu, po którym rozpoznajemy ten sam
 * opis opublikowany pod różnymi tytułami.
 */
const DUPLICATE_KEY_CHARS = 120;

/**
 * Notka redakcyjna na początku opisu, np. `"(Updates with index/price moves ...)"`.
 * Jest usuwana z treści.
 */
const EDITORIAL_PREFIX = /^\s*\((?:updates?|adds?|recasts?|corrects?)\b[^)]*\)?\s*/i;

/**
 * Wzorce stałych stopek i szablonów, które nie są treścią artykułu.
 * Dopasowanie któregokolwiek oznacza odrzucenie newsa z powodem `"szablon"`.
 */
const BOILERPLATE_PATTERNS = [
  /for questions about this article or underlying research/i,
  /released its [\w\s-]{0,40}investor letter/i,
];

/**
 * Nagłówek sklejony z treścią, np. `"Key TakeawaysIonQ shares are up..."`.
 * Jest usuwany z początku treści.
 */
const LEADING_HEADER = /^\s*key takeaways:?\s*/i;

/**
 * Sprawdza, czy tekst kończy się jak pełne zdanie: kropką, wykrzyknikiem,
 * pytajnikiem, wielokropkiem, cudzysłowem lub nawiasem zamykającym.
 */
const SENTENCE_END = /[.!?…"”')\]]\s*$/;

/**
 * Normalizuje tekst do porównań: małe litery, wszystko poza literami
 * i cyframi (dowolnego alfabetu) zamienione na pojedyncze spacje.
 *
 * @param {unknown} [value=""] Tekst do znormalizowania (inne typy są rzutowane na string).
 * @returns {string} Znormalizowany tekst bez wiodących i końcowych spacji.
 */
const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Liczy słowa w tekście. Słowem jest każdy ciąg liter lub cyfr.
 *
 * @param {string} value Tekst do policzenia.
 * @returns {number} Liczba słów.
 */
const countWords = (value) => (value.match(/[\p{L}\p{N}]+/gu) || []).length;

/**
 * Koniec zdania w środku tekstu: znak końca, opcjonalny cudzysłów lub nawias,
 * spacja i wielka litera. Wymóg wielkiej litery po spacji odsiewa skróty
 * i liczby, np. `"U.S. equities"` czy `"$153.44"`.
 */
const INNER_SENTENCE_END = /[.!?…]["”')\]]?(?=\s+["“(]?\p{Lu})/gu;

/**
 * Przycina tekst do ostatniego pełnego zdania.
 *
 * Yahoo ucina `description` w połowie zdania (ok. 100 albo 450–500 znaków).
 * Funkcja zostawia tylko pełne zdania. Jeśli tekst już kończy się jak zdanie,
 * zwraca go bez zmian. Gdy w tekście nie ma żadnego pełnego zdania, zwraca go
 * bez zmian — wtedy {@link getRejectionReason} odrzuci go jako obcięty.
 *
 * @param {string} text Oczyszczony tekst opisu.
 * @returns {string} Tekst zakończony na ostatnim pełnym zdaniu.
 */
const trimToLastSentence = (text) => {
  if (SENTENCE_END.test(text)) return text;
  let lastEnd = -1;
  for (const match of text.matchAll(INNER_SENTENCE_END)) {
    lastEnd = match.index + match[0].length;
  }
  return lastEnd > 0 ? text.slice(0, lastEnd) : text;
};

/**
 * Czyści treść newsa przed wyświetleniem i oceną jakości.
 *
 * Kolejno:
 * 1. usuwa notkę redakcyjną z początku (`"(Updates ...)"`),
 * 2. usuwa sklejony nagłówek `"Key Takeaways"`,
 * 3. zamienia końcowe `"[…]"` / `"[...]"` na wielokropek,
 * 4. scala wielokrotne białe znaki w pojedyncze spacje,
 * 5. przycina tekst do ostatniego pełnego zdania.
 *
 * @param {unknown} [summary=""] Surowy opis z RSS (`description`).
 * @returns {string} Oczyszczona treść.
 *
 * @example
 * cleanSummary("(Updates with prices) Stocks rose today. Investors were");
 * // => "Stocks rose today."
 */
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
 * Ocenia pojedynczy news i zwraca powód odrzucenia albo `null`, gdy treść
 * jest wystarczająca.
 *
 * Oczekuje treści już oczyszczonej przez {@link cleanSummary}. Nie sprawdza
 * duplikatów między newsami — to robi {@link filterNewsWithContent} na całej liście.
 *
 * Możliwe powody (sprawdzane w tej kolejności):
 * - `"brak treści"` — pusta treść,
 * - `"szablon"` — treść pasuje do znanej stopki lub szablonu wydawcy,
 * - `"obcięta treść"` — treść nie kończy się pełnym zdaniem,
 * - `"za krótka treść"` — mniej niż {@link MIN_SUMMARY_CHARS} znaków
 *   lub {@link MIN_SUMMARY_WORDS} słów,
 * - `"powtórzony tytuł"` — treść jest taka sama jak tytuł lub w nim zawarta.
 *
 * @param {{title?: string, summary?: string}} item News z tytułem i oczyszczoną treścią.
 * @param {string} [item.title=""] Tytuł newsa.
 * @param {string} [item.summary=""] Oczyszczona treść newsa.
 * @returns {string | null} Powód odrzucenia albo `null`, gdy news jest poprawny.
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
 * Czyści treść listy newsów i zostawia tylko te, które mają sensowny tekst.
 *
 * Każdy news przechodzi przez {@link cleanSummary}, a następnie jest oceniany
 * przez {@link getRejectionReason}. Dodatkowo opis, który powtarza się pod
 * różnymi tytułami (porównywany po pierwszych `DUPLICATE_KEY_CHARS` = 120
 * znakach po normalizacji), jest odrzucany we wszystkich kopiach z powodem
 * `"ten sam opis"`. Kolejność newsów jest zachowana.
 *
 * @template {{title: string, summary: string}} T
 * @param {T[]} items Lista newsów z RSS (pozostałe pola są przepisywane bez zmian).
 * @param {{onReject?: (item: T, reason: string) => void}} [options] Opcje filtra.
 * @param {(item: T, reason: string) => void} [options.onReject] Wywoływana dla
 *   każdego odrzuconego newsa (z już oczyszczoną treścią) wraz z powodem — np. do logowania.
 * @returns {T[]} Zaakceptowane newsy z oczyszczonym polem `summary`.
 *
 * @example
 * const accepted = filterNewsWithContent(items, {
 *   onReject: (item, reason) => console.log(`Odrzucono "${item.title}": ${reason}`),
 * });
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
