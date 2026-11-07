/**
 * Treści artykułów edukacyjnych dostarczane razem z aplikacją.
 *
 * Ten plik NIE jest czytany przez ekrany. Przy starcie aplikacji
 * `initializeDatabase()` zapisuje te dane do tabel `category_article`,
 * `article` i `article_source`, a ekran „Nauka” pobiera artykuły wyłącznie
 * z bazy przez `getEducationalArticles()`.
 *
 * Konwencje w `content`:
 *  - akapit zaczynający się od "## " jest renderowany jako śródtytuł,
 *  - akapit zaczynający się od "• " jest punktem listy.
 */

export type ArticleSource = {
  author: string;
  title: string;
  publisher: string;
  year: number;
  url?: string;
};

export type EducationalArticle = {
  id: string;
  title: string;
  summary: string;
  content: readonly string[];
  readMinutes: number;
  language: "pl" | "en";
  author: string;
  category: string;
  sources: readonly ArticleSource[];
};

export type EducationalArticleSeed = Omit<EducationalArticle, "readMinutes">;

/** Separator akapitów w kolumnie `article.text`. */
export const ARTICLE_PARAGRAPH_SEPARATOR = "\n\n";

// Tempo uważnego czytania tekstu edukacyjnego po polsku (słowa / minutę).
// Niższe niż dla prozy, bo artykuły zawierają definicje, wzory i liczby.
const WORDS_PER_MINUTE = 150;

/** Szacowany czas czytania na podstawie liczby słów (min. 1 minuta). */
export const estimateReadMinutes = (
  article: Pick<EducationalArticleSeed, "title" | "content">,
): number => {
  const words = [article.title, ...article.content]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const AUTHOR = "Redakcja InvestSimulator";

// Źródła używane w kilku artykułach
const GRAHAM: ArticleSource = {
  author: "Benjamin Graham",
  title: "The Intelligent Investor (wyd. popr., komentarz Jason Zweig)",
  publisher: "HarperBusiness",
  year: 2003,
};
const DAMODARAN: ArticleSource = {
  author: "Aswath Damodaran",
  title: "Investment Valuation (wyd. 3)",
  publisher: "Wiley",
  year: 2012,
};
const BODIE: ArticleSource = {
  author: "Zvi Bodie, Alex Kane, Alan J. Marcus",
  title: "Investments (wyd. 12)",
  publisher: "McGraw-Hill Education",
  year: 2021,
};
const MALKIEL: ArticleSource = {
  author: "Burton G. Malkiel",
  title: "A Random Walk Down Wall Street (wyd. 13)",
  publisher: "W. W. Norton & Company",
  year: 2023,
};
const BOGLE: ArticleSource = {
  author: "John C. Bogle",
  title: "The Little Book of Common Sense Investing (wyd. jubileuszowe)",
  publisher: "Wiley",
  year: 2017,
};
const HOUSEL: ArticleSource = {
  author: "Morgan Housel",
  title: "The Psychology of Money",
  publisher: "Harriman House",
  year: 2020,
};
const BERKSHIRE_LETTERS: ArticleSource = {
  author: "Warren E. Buffett",
  title: "Listy do akcjonariuszy Berkshire Hathaway (1977-2023)",
  publisher: "Berkshire Hathaway Inc.",
  year: 2024,
  url: "https://www.berkshirehathaway.com/letters/letters.html",
};
const KNF_WARNINGS: ArticleSource = {
  author: "Komisja Nadzoru Finansowego",
  title: "Lista ostrzeżeń publicznych",
  publisher: "KNF",
  year: 2024,
  url: "https://www.knf.gov.pl/dla_rynku/Ostrzezenia_publiczne",
};

export const EDUCATIONAL_ARTICLE_SEED: readonly EducationalArticleSeed[] = [
  {
    id: "edu-01",
    title: "Czym jest akcja i skąd bierze się jej cena?",
    summary:
      "Akcja to kawałek prawdziwej firmy. Na krótką metę jej kurs zależy od nastrojów, na długą od tego, ile firma zarabia.",
    category: "Podstawy",
    language: "pl",
    author: AUTHOR,
    content: [
      "Kupując akcję, kupujesz mały udział w spółce. Razem z nim dostajesz konkretne prawa: możesz otrzymywać dywidendy, głosować na walnym zgromadzeniu, a gdyby firmę zlikwidowano, masz prawo do części tego, co zostanie po spłacie wierzycieli. Jedna akcja PKN Orlen czy CD Projektu to ułamek procenta, ale zasada jest ta sama jak przy udziale w rodzinnej piekarni.",
      "## Kto dostaje Twoje pieniądze?",
      "Spółka zbiera pieniądze tylko wtedy, gdy emituje nowe akcje, na przykład w debiucie giełdowym (IPO). Gdy potem kupujesz akcje na Giełdzie Papierów Wartościowych w Warszawie, płacisz innemu inwestorowi, który właśnie je sprzedaje. Firma nie dostaje z tej transakcji ani złotówki. Nad całym rynkiem czuwa Komisja Nadzoru Finansowego.",
      "## Cena to nie to samo co wartość",
      "Kurs, który widzisz w aplikacji, to po prostu cena ostatniej transakcji. Wartość firmy to coś innego. W podręcznikach finansów (bardzo przystępnie robi to Aswath Damodaran) definiuje się ją jako dzisiejszą wartość pieniędzy, które spółka zarobi dla właścicieli w przyszłości. Dlatego na kurs tak mocno wpływają oczekiwania i stopy procentowe. Gdy stopy rosną, przyszłe zyski są dziś warte mniej, i kursy często spadają nawet wtedy, gdy firmie idzie dobrze.",
      "Dobrze to widać przy publikacji wyników. Zdarza się, że spółka ogłasza rekordowy zysk, a jej akcje tanieją o kilka procent. Inwestorzy liczyli po prostu na jeszcze więcej i ceny zdążyły to uwzględnić.",
      "## Pan Rynek",
      "Benjamin Graham, nauczyciel Warrena Buffetta, wymyślił postać pana Rynka. To wspólnik, który codziennie przychodzi i proponuje, że odkupi Twoje udziały albo sprzeda Ci swoje. Jednego dnia jest w euforii i żąda absurdalnej ceny, innego wpada w panikę i oddaje wszystko za bezcen. Nie musisz przyjmować żadnej z tych ofert. Graham radził porównywać cenę z własną, ostrożną oceną wartości i kupować dopiero wtedy, gdy różnica daje margines bezpieczeństwa.",
      "W symulatorze możesz to przetestować bez ryzyka: wybierz spółkę, sprawdź, jak zmieniała się jej cena po wynikach kwartalnych, i zastanów się, czy firma naprawdę zmieniła się tak bardzo jak jej kurs.",
    ],
    sources: [
      GRAHAM,
      DAMODARAN,
      {
        author: "Giełda Papierów Wartościowych w Warszawie",
        title: "Materiały edukacyjne dla inwestorów",
        publisher: "GPW",
        year: 2024,
        url: "https://www.gpw.pl",
      },
    ],
  },
  {
    id: "edu-02",
    title: "Ryzyko i zysk idą w parze",
    summary:
      "Wyższy oczekiwany zysk to zapłata za znoszenie większych wahań. Dane z ponad stu lat rynków to potwierdzają, ale pokazują też, jak bolesne bywają złe dekady.",
    category: "Ryzyko",
    language: "pl",
    author: AUTHOR,
    content: [
      "Jeśli ktoś obiecuje Ci wysoki zysk bez ryzyka, prawie na pewno coś ukrywa. Inwestorzy żądają wyższej stopy zwrotu za to, że wynik jest niepewny. Ta premia za ryzyko jest powodem, dla którego akcje w długim terminie dawały więcej niż lokaty, ale też powodem, dla którego potrafią w rok stracić jedną trzecią wartości.",
      "## Jak mierzy się ryzyko?",
      "Najczęściej używa się zmienności, czyli odchylenia standardowego rocznych stóp zwrotu. Szerokie indeksy akcji mają ją zwykle na poziomie kilkunastu do dwudziestu kilku procent, obligacje skarbowe znacznie niższą, a krótkoterminowe bony skarbowe bliską zera.",
      "Dla zwykłego człowieka bardziej czytelne jest obsunięcie kapitału, czyli spadek od szczytu do dołka. Tu działa prosta, ale nieprzyjemna matematyka. Po spadku o 20% potrzebujesz wzrostu o 25%, żeby wyjść na zero. Po spadku o 50% potrzebujesz już 100%.",
      "## Co mówią dane z ponad stu lat",
      "Elroy Dimson, Paul Marsh i Mike Staunton z London Business School zebrali wyniki kilkudziesięciu rynków od 1900 roku. Akcje na świecie dawały w tym czasie około 5% rocznie ponad inflację, obligacje około 2%, a bony skarbowe około 1%. Ta przewaga nie była jednak równo rozłożona. Bywały całe dekady, w których akcje przegrywały z obligacjami, a giełdy w Rosji po 1917 roku i w Chinach po 1949 roku przestały istnieć, zabierając inwestorom wszystko.",
      "Polski przykład z bliższych czasów: indeks WIG stracił w kryzysie finansowym, od szczytu w lipcu 2007 roku do dołka w lutym 2009 roku, ponad 60% wartości. Ktoś, kto kupił na górce, czekał wiele lat na powrót do punktu wyjścia.",
      "## Ryzyko, za które nikt nie płaci",
      "William Sharpe, laureat Nobla z 1990 roku, rozdzielił ryzyko na dwie części. Ryzyko rynkowe dotyczy wszystkich spółek naraz i za nie rynek płaci premię. Ryzyko konkretnej firmy (zła decyzja zarządu, afera, utrata klienta) da się prawie całkowicie usunąć, kupując wiele różnych spółek. Dlatego rynek za nie nie wynagradza. Trzymając całe oszczędności w jednej spółce, bierzesz więc dodatkowe ryzyko bez obietnicy dodatkowego zysku.",
      "Zanim kupisz cokolwiek, zadaj sobie pytanie, ile możesz stracić, zanim zaczniesz panikować. Odpowiedź mówi o Twojej tolerancji ryzyka więcej niż jakakolwiek ankieta. A jeśli oferta wygląda zbyt dobrze, sprawdź firmę na liście ostrzeżeń publicznych KNF.",
    ],
    sources: [
      BODIE,
      {
        author: "Elroy Dimson, Paul Marsh, Mike Staunton",
        title: "Triumph of the Optimists: 101 Years of Global Investment Returns",
        publisher: "Princeton University Press",
        year: 2002,
      },
      {
        author: "William F. Sharpe",
        title:
          "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk",
        publisher: "The Journal of Finance, 19(3), 425-442",
        year: 1964,
        url: "https://doi.org/10.1111/j.1540-6261.1964.tb02865.x",
      },
      KNF_WARNINGS,
    ],
  },
  {
    id: "edu-03",
    title: "Dywersyfikacja, czyli jak nie stracić wszystkiego naraz",
    summary:
      "Łączenie aktywów, które nie spadają jednocześnie, obniża ryzyko portfela. Historie pracowników Enronu i obligatariuszy GetBacku pokazują, co się dzieje bez tego.",
    category: "Portfel",
    language: "pl",
    author: AUTHOR,
    content: [
      "W 2001 roku amerykański koncern energetyczny Enron zbankrutował po ujawnieniu oszustw księgowych. Akcje, które rok wcześniej kosztowały ponad 90 dolarów, stały się praktycznie bezwartościowe. Najbardziej ucierpieli pracownicy firmy. Wielu z nich trzymało w akcjach Enronu dużą część oszczędności emerytalnych, więc w jednej chwili stracili i pracę, i emeryturę.",
      "W Polsce podobną lekcję przyniosła sprawa GetBacku z 2018 roku. Firma windykacyjna sprzedawała swoje obligacje klientom indywidualnym, często jako „bezpieczną lokatę”. Gdy wyszły na jaw problemy finansowe, około 9 tysięcy osób zostało z papierami, za które nie dostali obiecanych pieniędzy. Najbardziej stracili ci, którzy postawili na nie większość oszczędności.",
      "## Matematyka, która stoi za dywersyfikacją",
      "W 1952 roku Harry Markowitz opisał w artykule „Portfolio Selection”, dlaczego ryzyko portfela nie jest zwykłą średnią ryzyk jego składników. Kluczowa jest korelacja, czyli to, na ile aktywa poruszają się razem. Jeśli jedna spółka traci, gdy druga stoi w miejscu albo rośnie, wahania częściowo się znoszą. Za tę pracę Markowitz dostał w 1990 roku Nagrodę Nobla, a jego wniosek często streszcza się zdaniem, że dywersyfikacja to jedyny darmowy obiad w finansach.",
      "Ile spółek wystarczy? Meir Statman pokazał w 1987 roku, że każda kolejna losowo dodana spółka zmniejsza ryzyko coraz mniej. Kilkadziesiąt firm z różnych branż usuwa większość ryzyka pojedynczych przedsiębiorstw. Ryzyka całego rynku nie usunie żadna liczba akcji.",
      "## O czym łatwo zapomnieć",
      "Pięć banków w portfelu to wciąż jedna branża, która reaguje na te same stopy procentowe. Portfel złożony wyłącznie ze spółek z GPW to zakład na jedną gospodarkę, która stanowi niewielki ułamek światowego rynku. Warto więc myśleć szerzej: o różnych branżach, krajach i klasach aktywów, takich jak akcje i obligacje.",
      "Dywersyfikacja ma też granice. W czasie paniki, jak jesienią 2008 roku czy w marcu 2020 roku, niemal wszystkie akcje spadają razem. W takich chwilach portfel ratują raczej obligacje skarbowe i gotówka niż kolejna spółka. Z drugiej strony dziesięć funduszy o niemal identycznym składzie daje tylko złudzenie bezpieczeństwa, a płacisz dziesięć razy za zarządzanie.",
      "Spróbuj w symulatorze kupić najpierw jedną spółkę, a potem kilka z różnych sektorów, i porównaj, jak bardzo wahała się wartość obu portfeli.",
    ],
    sources: [
      {
        author: "Harry Markowitz",
        title: "Portfolio Selection",
        publisher: "The Journal of Finance, 7(1), 77-91",
        year: 1952,
        url: "https://doi.org/10.1111/j.1540-6261.1952.tb01525.x",
      },
      {
        author: "Meir Statman",
        title: "How Many Stocks Make a Diversified Portfolio?",
        publisher: "Journal of Financial and Quantitative Analysis, 22(3), 353-363",
        year: 1987,
      },
      MALKIEL,
      {
        author: "Bethany McLean, Peter Elkind",
        title: "The Smartest Guys in the Room: The Amazing Rise and Scandalous Fall of Enron",
        publisher: "Portfolio",
        year: 2003,
      },
    ],
  },
  {
    id: "edu-04",
    title: "Jak czytać wykres świecowy?",
    summary:
      "Jedna świeca pokazuje cztery ceny z danego okresu: otwarcia, zamknięcia, najwyższą i najniższą. Uczy czytania nastrojów, ale nie przewiduje przyszłości.",
    category: "Analiza techniczna",
    language: "pl",
    author: AUTHOR,
    content: [
      "Wykresy świecowe wymyślili japońscy kupcy handlujący ryżem w XVIII wieku. Na Zachód trafiły dopiero w 1991 roku dzięki książce Steve'a Nisona. Dziś są domyślnym widokiem w większości aplikacji inwestycyjnych, również w InvestSimulatorze.",
      "## Z czego składa się świeca",
      "Każda świeca opisuje jeden okres: minutę, godzinę albo dzień. Zawiera cztery ceny, które w skrócie nazywa się OHLC: otwarcia (open), najwyższą (high), najniższą (low) i zamknięcia (close).",
      "• Korpus, czyli gruba część, rozciąga się między ceną otwarcia a zamknięcia.",
      "• Kolor mówi o kierunku. Zielona świeca oznacza, że zamknięcie było wyżej niż otwarcie, czerwona, że niżej.",
      "• Cienie (knoty) to cienkie kreski nad i pod korpusem. Sięgają do najwyższej i najniższej ceny w tym okresie.",
      "## Co można wyczytać z kształtu",
      "Długi zielony korpus znaczy, że kupujący przeważali przez cały dzień. Długi górny cień pokazuje, że cena próbowała iść w górę, ale sprzedający ją zepchnęli. Świeca typu doji, w której otwarcie i zamknięcie są prawie równe, wygląda jak krzyżyk i sygnalizuje, że rynek się waha.",
      "Analitycy techniczni nazywają też całe układy świec. Młot to mały korpus z długim dolnym cieniem pojawiający się po spadkach. Objęcie hossy to duża zielona świeca, której korpus całkowicie zakrywa korpus poprzedniej, czerwonej. Oba bywają odczytywane jako możliwy koniec spadków.",
      "## Kontekst zmienia znaczenie",
      "John J. Murphy w podręczniku analizy technicznej powtarza, że pojedyncza świeca niewiele znaczy bez tła. Liczy się, czy pojawiła się po długim wzroście czy w środku konsolidacji, przy dużym czy małym obrocie i blisko jakiego poziomu ceny.",
      "Trzeba też uczciwie powiedzieć, że badania naukowe nie potwierdzają, by proste formacje świecowe dawały trwałą przewagę po uwzględnieniu prowizji. Wykres to zapis tego, co już się stało. Świetnie nadaje się do zrozumienia, jak zachowywali się inni inwestorzy, ale nie jest kryształową kulą.",
      "Otwórz w zakładce Rynek wykres dowolnej spółki i spróbuj opisać ostatnie pięć świec własnymi słowami. To najlepsze ćwiczenie na początek.",
    ],
    sources: [
      {
        author: "Steve Nison",
        title: "Japanese Candlestick Charting Techniques (wyd. 2)",
        publisher: "Prentice Hall Press",
        year: 2001,
      },
      {
        author: "John J. Murphy",
        title: "Technical Analysis of the Financial Markets",
        publisher: "New York Institute of Finance",
        year: 1999,
      },
    ],
  },
  {
    id: "edu-05",
    title: "Obligacje, czyli pożyczasz i dostajesz odsetki",
    summary:
      "Kupując obligację, pożyczasz pieniądze państwu albo firmie. Dowiedz się, dlaczego ich ceny spadają, gdy rosną stopy procentowe, i czym różnią się obligacje skarbowe od korporacyjnych.",
    category: "Instrumenty",
    language: "pl",
    author: AUTHOR,
    content: [
      "Obligacja to papier dłużny. Emitent, czyli Skarb Państwa, samorząd albo firma, pożycza od Ciebie pieniądze. W zamian płaci odsetki, nazywane kuponem, a w dniu wykupu oddaje wartość nominalną. Akcjonariusz jest współwłaścicielem firmy, a obligatariusz jej wierzycielem. W razie kłopotów wierzyciele są spłacani przed właścicielami.",
      "## Kilka pojęć, które warto znać",
      "• Wartość nominalna to kwota zwracana przy wykupie, na przykład 100 albo 1000 zł.",
      "• Kupon może być stały, zmienny (zależny od stóp rynkowych) albo powiązany z inflacją.",
      "• Rentowność do wykupu (YTM) mówi, ile zarobisz rocznie, jeśli kupisz obligację po dzisiejszej cenie i potrzymasz ją do końca.",
      "## Dlaczego cena obligacji się zmienia",
      "Cena i rentowność poruszają się w przeciwnych kierunkach. Weźmy obligację dziesięcioletnią o nominale 100 zł z kuponem 5% rocznie. Jeśli stopy na rynku wzrosną do 6%, nikt nie zapłaci za nią pełnych 100 zł, skoro nowe obligacje płacą więcej. Jej cena spadnie do około 92,64 zł, czyli do poziomu, przy którym kupujący też zarobi 6% rocznie. Im dłuższy okres do wykupu, tym mocniej cena reaguje na zmianę stóp.",
      "W latach 2021-2022 przekonało się o tym wielu posiadaczy funduszy obligacji. Stopy procentowe w Polsce szybko rosły, a fundusze z długimi obligacjami traciły, choć wcześniej uchodziły za spokojne.",
      "## Skarbowe i korporacyjne",
      "Obligacje firm płacą więcej niż skarbowe, bo ryzyko, że pieniądze nie wrócą, jest wyższe. Afera GetBacku z 2018 roku pokazała, jak realne jest to ryzyko, zwłaszcza gdy papiery sprzedaje się jako „pewną lokatę”. Przy obligacjach korporacyjnych warto sprawdzać sytuację finansową emitenta i nie wkładać w jedną firmę dużej części oszczędności.",
      "Ministerstwo Finansów sprzedaje osobom fizycznym detaliczne obligacje skarbowe o nominale 100 zł. Nie są notowane na giełdzie, kupuje się je przez serwis obligacjeskarbowe.pl lub w PKO BP. Są wśród nich papiery o stałym oprocentowaniu (trzyletnie TOS), zmiennym (dwuletnie DOR) i powiązane z inflacją (czteroletnie COI i dziesięcioletnie EDO). Przy wcześniejszym wykupie płaci się niewielką opłatę, a od odsetek pobierany jest podatek 19%.",
      "W portfelu obligacje skarbowe pełnią rolę amortyzatora. Gdy akcje gwałtownie spadają, zwykle trzymają wartość znacznie lepiej.",
    ],
    sources: [
      {
        author: "Frank J. Fabozzi",
        title: "Bond Markets, Analysis, and Strategies (wyd. 10)",
        publisher: "Pearson",
        year: 2021,
      },
      {
        author: "Ministerstwo Finansów",
        title: "Obligacje skarbowe: oferta i warunki emisji",
        publisher: "obligacjeskarbowe.pl",
        year: 2024,
        url: "https://www.obligacjeskarbowe.pl",
      },
      BODIE,
    ],
  },
  {
    id: "edu-06",
    title: "ETF-y i fundusze indeksowe",
    summary:
      "Fundusz indeksowy kupuje cały rynek zamiast szukać najlepszych spółek. Dzięki niskim kosztom w długim terminie wyprzedza większość funduszy aktywnych, co potwierdził nawet słynny zakład Buffetta.",
    category: "Instrumenty",
    language: "pl",
    author: AUTHOR,
    content: [
      "Fundusz indeksowy nie próbuje zgadywać, które spółki wypadną najlepiej. Kupuje po prostu wszystkie firmy z danego indeksu, na przykład WIG20, S&P 500 albo MSCI World, w takich proporcjach, w jakich są w indeksie. ETF (Exchange Traded Fund) to fundusz, zwykle właśnie indeksowy, którego jednostki kupuje się na giełdzie tak samo jak akcje.",
      "## Skąd się wziął ten pomysł",
      "W 1975 roku John C. Bogle założył firmę Vanguard, a rok później uruchomił pierwszy fundusz indeksowy dla zwykłych inwestorów. Konkurencja nazywała go „szaleństwem Bogle'a”. Jego rozumowanie było proste. Wszyscy inwestorzy razem, przed kosztami, osiągają dokładnie wynik rynku. Po odjęciu opłat przeciętny inwestor musi więc wypaść gorzej od rynku. Najtańszym sposobem na wynik rynku jest kupienie całego rynku.",
      "## Zakład o milion dolarów",
      "W 2007 roku Warren Buffett założył się z firmą Protégé Partners, że przez dziesięć lat zwykły fundusz indeksowy na S&P 500 pobije starannie wybrane fundusze hedgingowe. Zakład trwał od 2008 do 2017 roku. Fundusz indeksowy dał średnio około 7,1% rocznie, a wybrane fundusze hedgingowe średnio około 2,2%. Buffett wygrał, a nagroda trafiła do organizacji charytatywnej z Omaha.",
      "Podobne wnioski od ponad 20 lat przynoszą raporty SPIVA przygotowywane przez S&P Dow Jones Indices. W okresach 10-15 lat zdecydowana większość aktywnie zarządzanych funduszy akcyjnych wypada gorzej niż indeks, z którym się porównuje. A te, które wygrywają w jednym okresie, rzadko powtarzają sukces w kolejnym.",
      "## Na co zwrócić uwagę przy wyborze ETF-u",
      "• Roczna opłata (TER). W dużych ETF-ach to często ułamek procenta.",
      "• Czy fundusz kupuje akcje fizycznie, czy odwzorowuje indeks syntetycznie przez umowy z bankiem.",
      "• Czy dywidendy są reinwestowane (fundusz akumulujący), czy wypłacane (dystrybuujący).",
      "• Waluta funduszu i rzeczywista różnica między jego wynikiem a wynikiem indeksu.",
      "ETF nie chroni przed spadkami. Gdy indeks traci 30%, fundusz traci tyle samo. Szczególnie ostrożnie trzeba podchodzić do ETF-ów lewarowanych i odwrotnych, które służą do krótkoterminowej spekulacji, a nie do długiego oszczędzania. Przed zakupem warto przeczytać dokument z kluczowymi informacjami (KID).",
    ],
    sources: [
      BOGLE,
      {
        author: "S&P Dow Jones Indices",
        title: "SPIVA: raporty porównujące fundusze aktywne z indeksami",
        publisher: "S&P Global",
        year: 2024,
        url: "https://www.spglobal.com/spdji/en/research-insights/spiva/",
      },
      { ...BERKSHIRE_LETTERS, title: "List do akcjonariuszy Berkshire Hathaway za rok 2017 (wynik zakładu)", year: 2018 },
      MALKIEL,
    ],
  },
  {
    id: "edu-07",
    title: "Inflacja, czyli dlaczego 5% zysku może być stratą",
    summary:
      "Liczy się nie to, ile masz złotych, ale co możesz za nie kupić. W lutym 2023 roku inflacja w Polsce sięgnęła 18,4%, a większość lokat przegrywała z nią z kretesem.",
    category: "Ekonomia",
    language: "pl",
    author: AUTHOR,
    content: [
      "Inflacja to ogólny wzrost cen. Gdy rośnie, za te same pieniądze kupisz mniej. W Polsce mierzy ją Główny Urząd Statystyczny wskaźnikiem cen towarów i usług konsumpcyjnych (CPI), który śledzi koszyk typowych wydatków gospodarstw domowych: od chleba, przez czynsz, po bilety na pociąg.",
      "Przez większość lat 2010-2020 inflacja w Polsce była niska i mało kto o niej myślał. Potem przyszło przyspieszenie. W lutym 2023 roku ceny były o 18,4% wyższe niż rok wcześniej. Ktoś, kto trzymał oszczędności na koncie oprocentowanym na 2%, w ciągu jednego roku stracił realnie mniej więcej jedną szóstą siły nabywczej.",
      "## Co robi NBP",
      "Narodowy Bank Polski od 2004 roku stara się utrzymać inflację w pobliżu 2,5%, z tolerancją jednego punktu procentowego w każdą stronę. Głównym narzędziem są stopy procentowe. Ich podwyżki schładzają popyt i z czasem hamują wzrost cen, ale wpływają też na raty kredytów oraz wyceny obligacji i akcji.",
      "## Zysk nominalny i realny",
      "Ekonomista Irving Fisher opisał zależność, której używa się do dziś. Realna stopa zwrotu = (1 + stopa nominalna) / (1 + inflacja) - 1. Przy małych liczbach wystarczy odjąć inflację od zysku.",
      "Przykład: lokata dała 8%, a inflacja wyniosła 5%. Realnie wzbogaciłeś się o (1,08 / 1,05) - 1, czyli około 2,86%. Jeśli lokata dała 3% przy inflacji 5%, na koncie widzisz więcej złotych, ale kupisz za nie mniej niż rok temu.",
      "## Jak różne aktywa znoszą inflację",
      "Gotówka i nisko oprocentowane konta tracą najszybciej. Obligacje ze stałym kuponem tracą, gdy inflacja okazuje się wyższa, niż zakładano przy zakupie. Detaliczne obligacje skarbowe COI i EDO mają od drugiego roku oprocentowanie równe inflacji plus marża, dlatego w latach 2022-2023 cieszyły się ogromnym zainteresowaniem. Akcje w długim terminie zwykle wyprzedzały inflację, bo firmy mogą podnosić ceny swoich produktów, ale w krótkim okresie gwałtowna inflacja i rosnące stopy często im szkodzą.",
      "Planując cel finansowy, na przykład emeryturę, licz kwoty w dzisiejszych pieniądzach. 500 tysięcy złotych za 25 lat będzie warte znacznie mniej niż 500 tysięcy dziś.",
    ],
    sources: [
      {
        author: "Narodowy Bank Polski",
        title: "Strategia polityki pieniężnej i cel inflacyjny",
        publisher: "NBP",
        year: 2024,
        url: "https://nbp.pl/polityka-pieniezna/",
      },
      {
        author: "Główny Urząd Statystyczny",
        title: "Wskaźniki cen towarów i usług konsumpcyjnych",
        publisher: "GUS",
        year: 2024,
        url: "https://stat.gov.pl",
      },
      {
        author: "Frederic S. Mishkin",
        title: "The Economics of Money, Banking, and Financial Markets (wyd. 13)",
        publisher: "Pearson",
        year: 2022,
      },
      {
        author: "Irving Fisher",
        title: "The Theory of Interest",
        publisher: "Macmillan",
        year: 1930,
      },
    ],
  },
  {
    id: "edu-08",
    title: "Procent składany, czyli czas pracuje za Ciebie",
    summary:
      "Gdy zyski są reinwestowane, same zaczynają zarabiać. Przy 7% rocznie 10 tysięcy złotych zamienia się po 30 latach w ponad 76 tysięcy. Najważniejszym składnikiem jest czas.",
    category: "Podstawy",
    language: "pl",
    author: AUTHOR,
    content: [
      "Procent składany działa tak, że zarobione odsetki nie są wypłacane, tylko dopisywane do kapitału. W następnym roku zarabiasz więc także na tym, co zarobiłeś wcześniej. Wzór wygląda niewinnie: wartość końcowa = kapitał × (1 + r) do potęgi n, gdzie r to roczna stopa zwrotu, a n to liczba lat.",
      "## Jak to wygląda w liczbach",
      "Wpłacasz jednorazowo 10 000 zł, a inwestycja zarabia średnio 7% rocznie. Po 10 latach masz około 19 672 zł, po 20 latach około 38 697 zł, a po 30 latach około 76 123 zł. W pierwszej dekadzie przybywa mniej niż 10 tysięcy złotych, w trzeciej ponad 37 tysięcy. Kapitał rośnie coraz szybciej, bo coraz większa część zysku to odsetki od odsetek.",
      "Przy regularnym oszczędzaniu efekt jest jeszcze wyraźniejszy. Odkładając 500 zł miesięcznie przy 7% rocznie, po 20 latach masz około 262 tysięcy złotych, z czego 120 tysięcy to Twoje wpłaty. Po 30 latach jest to już około 614 tysięcy przy wpłatach 180 tysięcy. Dziesięć dodatkowych lat ponad dwukrotnie zwiększa wynik.",
      "## Buffett i jego późne miliardy",
      "Warren Buffett jest dziś jednym z najbogatszych ludzi świata, ale Morgan Housel zwraca uwagę na ciekawy szczegół. Ogromna większość majątku Buffetta powstała już po jego 50. urodzinach, a znaczna część dopiero po 65. Nie dlatego, że późno nauczył się inwestować. Zaczął jako nastolatek i po prostu nie przestawał przez ponad 70 lat. Gdyby zaczął w wieku 30 lat i skończył w wieku 60, prawie nikt by o nim nie słyszał.",
      "## Reguła 72",
      "Szybki sposób, żeby oszacować, kiedy pieniądze się podwoją: podziel 72 przez roczną stopę zwrotu. Przy 6% rocznie kapitał podwoi się po mniej więcej 12 latach (dokładnie 1,06 do potęgi 12 to około 2,01). Ta sama reguła działa w drugą stronę. Przy inflacji 6% siła nabywcza gotówki spada o połowę w około 12 lat.",
      "## Haczyki",
      "Procent składany działa także na koszty. Opłata 1% rocznie, pobierana przez 30 lat, potrafi zjeść kilkanaście tysięcy złotych z każdych zainwestowanych 10 tysięcy (więcej o tym w artykule o kosztach). Poza tym 7% to średnia z wielu lat, a pojedyncze lata mogą przynieść minus 30% albo plus 30%. Każda wypłata zysków albo paniczna sprzedaż w czasie spadków przerywa cały mechanizm.",
      "Jeremy Siegel w książce „Stocks for the Long Run” pokazuje, że w okresach kilkudziesięcioletnich akcje amerykańskie dawały realnie około 6-7% rocznie. Najważniejsza nie była umiejętność wyboru momentu, tylko cierpliwość.",
    ],
    sources: [
      {
        author: "Jeremy J. Siegel",
        title: "Stocks for the Long Run (wyd. 6)",
        publisher: "McGraw-Hill",
        year: 2022,
      },
      HOUSEL,
      BODIE,
    ],
  },
  {
    id: "edu-09",
    title: "Psychologia inwestowania: dlaczego sami sobie szkodzimy",
    summary:
      "Strata boli dwa razy bardziej niż cieszy zysk, a zbyt częste transakcje obniżają wyniki. Badania Kahnemana, Tversky'ego oraz Barbera i Odeana pokazują, jak emocje kosztują nas pieniądze.",
    category: "Psychologia",
    language: "pl",
    author: AUTHOR,
    content: [
      "Przez długi czas ekonomiści zakładali, że inwestorzy podejmują racjonalne decyzje. Psycholodzy Daniel Kahneman i Amos Tversky pokazali, że w sytuacjach niepewności ludzie popełniają wciąż te same, przewidywalne błędy. W 2002 roku Kahneman dostał za te badania Nagrodę Nobla z ekonomii.",
      "## Strata boli bardziej",
      "Według teorii perspektywy z 1979 roku strata 1000 zł boli mniej więcej dwa razy mocniej, niż cieszy zysk 1000 zł. W praktyce wygląda to tak: inwestor szybko sprzedaje akcje, które trochę zarobiły, żeby „zamknąć zysk”, a latami trzyma te, które straciły, bo sprzedaż oznaczałaby przyznanie się do błędu. Hersh Shefrin i Meir Statman nazwali to w 1985 roku efektem dyspozycji.",
      "## Im więcej transakcji, tym gorzej",
      "Brad Barber i Terrance Odean przeanalizowali konta ponad 66 tysięcy gospodarstw domowych w amerykańskim domu maklerskim w latach 1991-1996. Osoby, które handlowały najczęściej, zarabiały średnio około 11,4% rocznie. W tym samym czasie rynek dał około 17,9%. Swoją pracę zatytułowali „Handlowanie szkodzi Twojemu majątkowi”. Częste transakcje nie dawały przewagi, za to generowały prowizje i podatki.",
      "## Kilka innych pułapek",
      "Zakotwiczenie to przywiązanie do ceny, po której kupiłeś akcje. Rynek o niej nie wie i nic go ona nie obchodzi. Owczy pęd sprawia, że kupujemy to, co ostatnio mocno wzrosło, bo wszyscy o tym mówią. Tak było z akcjami internetowymi w 1999 roku i z kryptowalutami w 2021 roku. Efekt potwierdzenia każe nam szukać tylko tych informacji, które pasują do naszej tezy. A złudzenie kontroli podpowiada, że ciągłe sprawdzanie notowań poprawia wyniki.",
      "## Myślenie szybkie i wolne",
      "W książce „Pułapki myślenia” Kahneman opisuje dwa tryby myślenia. Szybki działa automatycznie i emocjonalnie, wolny jest analityczny i męczący. Decyzja o sprzedaży podjęta po zobaczeniu czerwonego nagłówka to robota trybu szybkiego. Najlepszym zabezpieczeniem jest podjęcie decyzji wcześniej, na spokojnie, zanim emocje w ogóle się pojawią.",
      "Pomaga spisany plan: cel, horyzont, podział między akcje i obligacje oraz zasady, kiedy coś sprzedajesz. Warto też prowadzić krótki dziennik decyzji i zapisywać, dlaczego kupujesz. Po roku łatwo sprawdzić, co było analizą, a co nastrojem dnia. Symulator to dobre miejsce, żeby poznać swoje reakcje na spadki, zanim w grę wejdą prawdziwe pieniądze.",
    ],
    sources: [
      {
        author: "Daniel Kahneman",
        title:
          "Thinking, Fast and Slow (wyd. pol. „Pułapki myślenia. O myśleniu szybkim i wolnym”, Media Rodzina 2012)",
        publisher: "Farrar, Straus and Giroux",
        year: 2011,
      },
      {
        author: "Daniel Kahneman, Amos Tversky",
        title: "Prospect Theory: An Analysis of Decision under Risk",
        publisher: "Econometrica, 47(2), 263-291",
        year: 1979,
        url: "https://doi.org/10.2307/1914185",
      },
      {
        author: "Brad M. Barber, Terrance Odean",
        title:
          "Trading Is Hazardous to Your Wealth: The Common Stock Investment Performance of Individual Investors",
        publisher: "The Journal of Finance, 55(2), 773-806",
        year: 2000,
        url: "https://doi.org/10.1111/0022-1082.00226",
      },
      {
        author: "Hersh Shefrin, Meir Statman",
        title:
          "The Disposition to Sell Winners Too Early and Ride Losers Too Long",
        publisher: "The Journal of Finance, 40(3), 777-790",
        year: 1985,
      },
    ],
  },
  {
    id: "edu-10",
    title: "Koszty i podatki, o których łatwo zapomnieć",
    summary:
      "Prowizje, opłaty funduszy i podatek Belki potrafią zabrać dużą część zysku. Różnica 0,8 punktu procentowego w opłatach to po 30 latach więcej niż wpłacony kapitał. Pomagają IKE i IKZE.",
    category: "Koszty i podatki",
    language: "pl",
    author: AUTHOR,
    content: [
      "Nie wiesz, ile zarobi rynek w przyszłym roku. Wiesz natomiast dokładnie, ile zapłacisz za prowizje i opłaty. John Bogle mówił o „tyranii składanych kosztów”. Każda opłata pobrana dziś to pieniądze, które przez kolejne lata już nie będą pracować, więc jej prawdziwy koszt rośnie z czasem.",
      "## Za co płacisz",
      "• Prowizja maklerska przy każdym kupnie i sprzedaży.",
      "• Spread, czyli różnica między najlepszą ofertą kupna i sprzedaży. Nie widać go na rachunku, ale przy mało płynnych spółkach potrafi być wysoki.",
      "• Opłata za zarządzanie funduszem (TER), pobierana codziennie z wartości jednostek.",
      "• Przewalutowanie przy zakupie zagranicznych akcji i ETF-ów.",
      "## Ile to kosztuje naprawdę",
      "Inwestujesz 10 000 zł na 30 lat, a rynek daje 7% rocznie. Jeśli fundusz pobiera 1% rocznie, realnie zarabiasz 6% i kończysz z około 57,4 tysiąca złotych. Przy opłacie 0,2% (czyli 6,8% netto) masz około 72 tysięcy. Różnica w opłatach wynosi zaledwie 0,8 punktu procentowego rocznie, a w złotówkach to ponad 14 tysięcy, czyli więcej, niż wpłaciłeś na początku.",
      "## Podatek Belki",
      "W Polsce zyski ze sprzedaży akcji, dywidendy i odsetki są opodatkowane stawką 19%. Potocznie mówi się na to podatek Belki, od nazwiska ministra finansów, który go wprowadził w 2002 roku (przepisy znajdziesz w ustawie o podatku dochodowym od osób fizycznych, art. 30a i 30b). Podatek od dywidend i odsetek zwykle pobiera za Ciebie bank albo dom maklerski. Zyski ze sprzedaży akcji rozliczasz sam w zeznaniu PIT-38 do 30 kwietnia następnego roku. Straty z poprzednich lat można w określonych granicach odliczyć.",
      "## IKE i IKZE",
      "Specjalna ustawa z 2004 roku daje dwa rodzaje kont z ulgą podatkową. Na IKE, jeśli wypłacisz pieniądze po spełnieniu warunków (między innymi po 60. roku życia), nie płacisz w ogóle podatku od zysków. Na IKZE wpłaty możesz odliczyć od dochodu w rocznym PIT, a przy wypłacie po 65. roku życia płacisz zryczałtowane 10%. Na oba konta obowiązują roczne limity wpłat, które zmieniają się co roku, więc przed wpłatą sprawdź aktualne kwoty.",
      "Na wyniki rynku nie masz wpływu, na koszty masz. Porównuj opłaty funduszy, nie handluj bez potrzeby i korzystaj z kont emerytalnych, jeśli oszczędzasz na długo. Ten tekst ma charakter edukacyjny i nie zastępuje porady doradcy podatkowego.",
    ],
    sources: [
      BOGLE,
      {
        author: "Sejm RP",
        title:
          "Ustawa z dnia 26 lipca 1991 r. o podatku dochodowym od osób fizycznych (art. 30a, 30b)",
        publisher: "Internetowy System Aktów Prawnych",
        year: 1991,
        url: "https://isap.sejm.gov.pl",
      },
      {
        author: "Sejm RP",
        title:
          "Ustawa z dnia 20 kwietnia 2004 r. o indywidualnych kontach emerytalnych oraz indywidualnych kontach zabezpieczenia emerytalnego",
        publisher: "Internetowy System Aktów Prawnych",
        year: 2004,
        url: "https://isap.sejm.gov.pl",
      },
    ],
  },
  {
    id: "edu-11",
    title: "Czy da się pobić rynek?",
    summary:
      "Hipoteza rynku efektywnego mówi, że ceny szybko uwzględniają nowe informacje. W 2013 roku Nobla dostali jednocześnie jej twórca i jej najsłynniejszy krytyk.",
    category: "Teoria rynku",
    language: "pl",
    author: AUTHOR,
    content: [
      "W 1970 roku Eugene Fama opublikował pracę, w której opisał hipotezę rynku efektywnego. Jej sedno jest proste: ceny akcji szybko uwzględniają wszystkie dostępne informacje. Jeśli tak jest, to korzystając z tych samych informacji co wszyscy, nie da się systematycznie zarabiać więcej niż rynek, bo wszystko, co wiesz, już jest w cenie.",
      "## Trzy wersje",
      "Wersja słaba mówi, że w cenach zawiera się cała historia notowań, więc sama analiza wykresów nie da trwałej przewagi. Wersja półsilna dodaje, że ceny uwzględniają też wszystkie publiczne informacje: raporty, wiadomości, dane z gospodarki. Wersja silna twierdzi, że w cenach są nawet informacje poufne. W tę ostatnią prawie nikt nie wierzy i dlatego handel na podstawie informacji poufnych jest przestępstwem.",
      "## Argumenty zwolenników",
      "Na rynku działają tysiące analityków, funduszy i algorytmów, które walczą o każdą okazję. Gdy jakaś się pojawia, szybko znika. Najlepszym dowodem są wyniki funduszy aktywnych: większość z nich w długim terminie przegrywa ze swoimi indeksami. Burton Malkiel ujął to złośliwie, pisząc, że małpa rzucająca lotkami w stronę z notowaniami wybrałaby portfel nie gorszy niż przeciętny ekspert.",
      "## Argumenty krytyków",
      "Robert Shiller pokazał, że ceny akcji wahają się znacznie mocniej, niż uzasadniałyby to późniejsze zmiany dywidend. Rynki co jakiś czas przeżywają bańki. W 1999 roku spółki internetowe bez przychodów wyceniano na miliardy dolarów, a indeks Nasdaq po pęknięciu bańki stracił w ciągu dwóch i pół roku blisko 80%. Shiller opisał to w książce „Irrational Exuberance”, która ukazała się w marcu 2000 roku, prawie dokładnie na szczycie.",
      "W 2013 roku Komitet Noblowski przyznał nagrodę jednocześnie Famie, Shillerowi i Larsowi Peterowi Hansenowi. To dobrze oddaje stan wiedzy: rynki są w dużej mierze efektywne, ale nie zawsze i nie całkowicie.",
      "## Co z tego wynika dla Ciebie",
      "Rynek nie musi być idealny, żeby był trudny do pobicia dla kogoś, kto inwestuje po pracy. Nawet jeśli istnieją okazje, ich wykorzystanie wymaga wiedzy, czasu i niskich kosztów, a konkurujesz z profesjonalistami. Dla większości ludzi rozsądną bazą jest szeroko zdywersyfikowany, tani portfel. Własne pomysły na konkretne spółki mogą być jego mniejszą częścią, jeśli sprawiają Ci frajdę.",
    ],
    sources: [
      {
        author: "Eugene F. Fama",
        title: "Efficient Capital Markets: A Review of Theory and Empirical Work",
        publisher: "The Journal of Finance, 25(2), 383-417",
        year: 1970,
        url: "https://doi.org/10.2307/2325486",
      },
      {
        author: "Robert J. Shiller",
        title: "Irrational Exuberance",
        publisher: "Princeton University Press",
        year: 2000,
      },
      MALKIEL,
    ],
  },
  {
    id: "edu-12",
    title: "Wskaźniki wyceny: C/Z, C/WK i stopa dywidendy",
    summary:
      "Sama cena akcji nic nie mówi. Wskaźniki pozwalają porównać ją z zyskami, majątkiem i dywidendą spółki. To dobry początek analizy, ale nie gotowa odpowiedź.",
    category: "Analiza fundamentalna",
    language: "pl",
    author: AUTHOR,
    content: [
      "Akcja za 20 zł może być droga, a akcja za 2000 zł tania. Żeby ocenić wycenę, porównuje się kapitalizację spółki (cena jednej akcji pomnożona przez liczbę akcji) z jej wynikami. Służą do tego wskaźniki, które znajdziesz w każdym serwisie giełdowym.",
      "## C/Z, czyli cena do zysku",
      "Dzielisz cenę akcji przez zysk netto przypadający na jedną akcję za ostatnie 12 miesięcy. C/Z równe 15 oznacza, że płacisz 15 zł za każdą złotówkę rocznego zysku. Wysoki wskaźnik może oznaczać, że rynek spodziewa się szybkiego wzrostu, albo że akcje są przewartościowane. Niski może być okazją albo sygnałem, że inwestorzy boją się kłopotów. Zysk z jednego roku bywa zaburzony jednorazowymi zdarzeniami, dlatego lepiej patrzeć na kilka lat.",
      "Robert Shiller zaproponował wskaźnik CAPE, w którym cenę dzieli się przez średni zysk z dziesięciu lat skorygowany o inflację. Wygładza on wahania koniunktury i stosuje się go głównie do oceny, czy cały rynek jest drogi czy tani.",
      "## C/WK, czyli cena do wartości księgowej",
      "Porównujesz kapitalizację z kapitałem własnym z bilansu, czyli z tym, co zostaje po odjęciu długów od majątku. Ten wskaźnik dobrze sprawdza się przy bankach i ubezpieczycielach, których majątek to głównie aktywa finansowe. Przy firmach technologicznych jest mało przydatny, bo ich wartość tkwi w ludziach, kodzie i markach, których bilans prawie nie pokazuje.",
      "## Stopa dywidendy",
      "Roczna dywidenda na akcję podzielona przez cenę. Stopa 5% oznacza, że przy niezmienionym kursie dostajesz co roku 5% w gotówce, a po podatku Belki trochę ponad 4%. Bardzo wysoka stopa bywa pułapką. Często wynika z tego, że kurs mocno spadł, bo rynek spodziewa się obniżenia dywidendy.",
      "## Kilka innych przydatnych liczb",
      "ROE, czyli zwrot z kapitału własnego, mówi, ile zysku spółka wypracowuje z pieniędzy akcjonariuszy. EV/EBITDA porównuje wartość całej firmy razem z długiem z zyskiem operacyjnym, co ułatwia porównywanie firm o różnym zadłużeniu. Dług netto do EBITDA pokazuje, ile lat zajęłaby spłata zadłużenia z bieżących zysków.",
      "Benjamin Graham radził ostrożnym inwestorom wybierać spółki o umiarkowanym C/Z i C/WK, stabilnych zyskach i długiej historii wypłacania dywidend. Aswath Damodaran przypomina, że wskaźniki porównuje się w obrębie jednej branży, bo bank i firma informatyczna mają zupełnie inne „normalne” poziomy. Traktuj każdy wskaźnik jak pytanie: dlaczego jest tak nisko albo tak wysoko?",
    ],
    sources: [
      GRAHAM,
      DAMODARAN,
      {
        author: "Robert J. Shiller",
        title: "Irrational Exuberance (wyd. 3)",
        publisher: "Princeton University Press",
        year: 2015,
      },
    ],
  },
  {
    id: "edu-13",
    title: "Jak działa giełda: zlecenia, płynność i spread",
    summary:
      "Na giełdzie kupujesz od innego inwestora przez arkusz zleceń. Rodzaj zlecenia decyduje, po jakiej cenie i czy w ogóle dojdzie do transakcji.",
    category: "Podstawy",
    language: "pl",
    author: AUTHOR,
    content: [
      "Giełda to miejsce, w którym spotykają się zlecenia kupna i sprzedaży. Na GPW działa to w systemie transakcyjnym UTP, a Ty składasz zlecenia przez dom maklerski. Wszystkie zlecenia, które czekają na realizację, trafiają do arkusza zleceń, uporządkowanego według ceny, a przy tej samej cenie według kolejności złożenia.",
      "## Arkusz i spread",
      "Z jednej strony arkusza są oferty kupna, z drugiej sprzedaży. Różnicę między najtańszą ofertą sprzedaży a najdroższą ofertą kupna nazywa się spreadem. W dużych spółkach z WIG20 to zwykle grosz albo kilka groszy. W małych spółkach może sięgać kilku procent, a to koszt, który płacisz przy każdym wejściu i wyjściu.",
      "## Płynność",
      "Płynność to łatwość, z jaką kupisz lub sprzedasz akcje bez przesuwania ceny. Przy małej płynności w arkuszu jest niewiele ofert. Jeśli chcesz kupić dużo, Twoje zlecenie „zjada” kolejne, coraz droższe oferty i średnia cena wychodzi wyraźnie wyższa, niż sugerował ostatni kurs.",
      "## Rodzaje zleceń na GPW",
      "• Zlecenie z limitem ceny: podajesz najwyższą cenę, jaką zapłacisz, albo najniższą, za jaką sprzedasz. Masz kontrolę nad ceną, ale zlecenie może się nie wykonać.",
      "• PKC (po każdej cenie): realizuje się od razu po cenach z arkusza. Masz pewność wykonania, ale nie ceny, co przy małej płynności bywa bolesne.",
      "• PCR (po cenie rynkowej): realizuje się po najlepszej dostępnej cenie, a niewykonana reszta czeka w arkuszu z limitem tej ceny.",
      "• Stop loss i stop limit: uruchamiają się dopiero, gdy kurs dojdzie do ustalonego poziomu. Służą głównie do ograniczania strat.",
      "Każde zlecenie ma też termin ważności, na przykład do końca sesji, do wybranej daty albo do odwołania.",
      "## Jak wygląda sesja",
      "Dzień na rynku kasowym GPW zaczyna się fazą przed otwarciem, w której zbiera się zlecenia, a kurs otwarcia ustala się w jednym momencie (to tak zwany fixing). Potem trwają notowania ciągłe, a na koniec znowu zbiera się zlecenia i wyznacza kurs zamknięcia. Dokładne godziny poszczególnych faz GPW publikuje w zasadach obrotu.",
      "Przy mało płynnych spółkach lepiej używać zleceń z limitem i zerknąć do arkusza przed złożeniem większego zlecenia. Pamiętaj też, że rozliczenie transakcji na GPW następuje dwa dni robocze po jej zawarciu (tak zwane T+2).",
    ],
    sources: [
      {
        author: "Giełda Papierów Wartościowych w Warszawie",
        title: "Szczegółowe Zasady Obrotu Giełdowego w systemie UTP",
        publisher: "GPW",
        year: 2024,
        url: "https://www.gpw.pl/regulacje",
      },
      {
        author: "Larry Harris",
        title: "Trading and Exchanges: Market Microstructure for Practitioners",
        publisher: "Oxford University Press",
        year: 2003,
      },
    ],
  },
  {
    id: "edu-14",
    title: "Plan inwestycyjny w sześciu krokach",
    summary:
      "Spisany plan chroni przed decyzjami podjętymi w panice. Określa cel, horyzont, podział aktywów i zasady jego korygowania, zanim rynek zacznie się chwiać.",
    category: "Portfel",
    language: "pl",
    author: AUTHOR,
    content: [
      "Zawodowi zarządzający pracują według dokumentu nazywanego polityką inwestycyjną (po angielsku Investment Policy Statement). CFA Institute zachęca, żeby inwestorzy indywidualni spisywali własną, prostszą wersję. Plan nie przewidzi przyszłości, ale z góry odpowie na pytanie, co zrobisz, gdy rynek zachowa się nieprzyjemnie.",
      "## 1. Poduszka finansowa",
      "Zanim zaczniesz inwestować, odłóż rezerwę na nieprzewidziane wydatki, zwykle równowartość od trzech do sześciu miesięcy kosztów życia, i trzymaj ją w bezpiecznym, łatwo dostępnym miejscu. Dzięki temu zepsuty samochód nie zmusi Cię do sprzedaży akcji w najgorszym możliwym momencie.",
      "## 2. Cel i termin",
      "Zapisz, na co odkładasz i kiedy będziesz potrzebować pieniędzy. Im dłuższy horyzont, tym więcej czasu na odrobienie spadków i tym większa część portfela może być w akcjach. Pieniądze potrzebne w ciągu roku do trzech lat zwykle nie powinny być narażone na wahania giełdy.",
      "## 3. Podział aktywów",
      "Proporcja między akcjami, obligacjami i gotówką w największym stopniu decyduje o tym, jak bardzo portfel będzie się wahał. Badanie Brinsona, Hooda i Beebowera z 1986 roku pokazało, że to właśnie ten podział, a nie wybór konkretnych spółek, odpowiadał za większość wahań wyników dużych funduszy emerytalnych. Portfel 60% akcji i 40% obligacji jest znacznie spokojniejszy niż portfel złożony w całości z akcji, ale też ma niższy oczekiwany zysk.",
      "## 4. Od razu czy stopniowo?",
      "Vanguard w 2012 roku porównał wpłacanie całej kwoty od razu z rozkładaniem zakupów na kilka miesięcy. Na rynkach USA, Wielkiej Brytanii i Australii jednorazowa wpłata wypadała lepiej w około dwóch trzecich przypadków, bo rynki częściej rosną, niż spadają. Stopniowe kupowanie ma jednak swoją zaletę: mniej boli, gdy zaraz po zakupie przyjdzie spadek. Jest też naturalne, gdy inwestujesz co miesiąc z pensji.",
      "## 5. Rebalansowanie",
      "Z czasem portfel sam zmienia proporcje. Po dobrym roku na giełdzie akcje zajmują większą część, niż zakładałeś. Rebalansowanie to przywrócenie ustalonych proporcji, na przykład raz w roku albo gdy któraś część odjedzie od planu o więcej niż 5 punktów procentowych. W praktyce oznacza to sprzedaż tego, co podrożało, i dokupienie tego, co potaniało. Brzmi prosto, ale wymaga dyscypliny.",
      "## 6. Zasady na trudne chwile",
      "Zapisz, czego nie zrobisz, na przykład: „nie sprzedaję wszystkiego, gdy portfel spadnie o 20%”. W czasie krachu dużo łatwiej trzymać się decyzji podjętej na spokojnie niż wymyślać strategię pod presją.",
      "Przykładowy plan może zmieścić się w kilku zdaniach. Cel: wkład własny na mieszkanie za 8 lat. Podział: połowa w globalnych akcjach, 40% w obligacjach skarbowych, 10% w gotówce. Wpłaty: 800 zł co miesiąc, ustawione jako przelew stały zaraz po wypłacie. Rebalansowanie: raz w roku, w styczniu. Zmiana planu: tylko gdy zmieni się cel albo sytuacja życiowa, a nie nastroje na rynku.",
    ],
    sources: [
      {
        author: "CFA Institute",
        title: "Elements of an Investment Policy Statement for Individual Investors",
        publisher: "CFA Institute",
        year: 2010,
        url: "https://www.cfainstitute.org",
      },
      {
        author: "Anatoly Shtekhman, Christos Tasopoulos, Brian Wimmer",
        title: "Dollar-cost averaging just means taking risk later",
        publisher: "Vanguard Research",
        year: 2012,
      },
      {
        author: "Gary P. Brinson, L. Randolph Hood, Gilbert L. Beebower",
        title: "Determinants of Portfolio Performance",
        publisher: "Financial Analysts Journal, 42(4), 39-44",
        year: 1986,
      },
      HOUSEL,
    ],
  },
  {
    id: "edu-15",
    title: "Kryptowaluty: jak działają i na co uważać",
    summary:
      "Bitcoin powstał w 2009 roku jako cyfrowy pieniądz bez banku centralnego. Kryptowaluty potrafią w rok zyskać kilkaset procent i stracić ponad 70%, a upadki giełd takich jak FTX pokazały, gdzie leży największe ryzyko.",
    category: "Instrumenty",
    language: "pl",
    author: AUTHOR,
    content: [
      "W październiku 2008 roku ktoś podpisany jako Satoshi Nakamoto opublikował dziewięciostronicowy dokument opisujący Bitcoina, czyli „elektroniczny pieniądz przesyłany bezpośrednio między ludźmi, bez instytucji finansowej”. W styczniu 2009 roku sieć zaczęła działać. Do dziś nie wiadomo, kim był Nakamoto.",
      "## Jak to działa",
      "Wszystkie transakcje zapisuje się w blockchainie, czyli wspólnym rejestrze, którego kopię przechowują tysiące komputerów na całym świecie. Nowe bloki transakcji dopisują tak zwani górnicy, którzy w zamian dostają nowo wybite bitcoiny. Zasady sieci przewidują, że wszystkich bitcoinów może być najwyżej 21 milionów. Ta sztucznie ograniczona podaż jest jednym z głównych argumentów zwolenników.",
      "Ethereum, uruchomione w 2015 roku, poszło dalej. Pozwala zapisywać w blockchainie programy (smart kontrakty), na których zbudowano między innymi zdecentralizowane giełdy i pożyczki. Osobną grupą są stablecoiny, które mają utrzymywać stałą wartość, najczęściej jednego dolara.",
      "## Zmienność, jakiej nie ma na giełdzie",
      "Pod koniec 2017 roku bitcoin kosztował prawie 20 tysięcy dolarów, a rok później około 3,5 tysiąca. W listopadzie 2021 roku dotarł w okolice 69 tysięcy, a rok później znowu spadł poniżej 16 tysięcy. Spadki o 70-80% zdarzały się w historii bitcoina kilka razy. Dla porównania szeroki indeks akcji traci tyle bardzo rzadko.",
      "## Gdzie naprawdę leży ryzyko",
      "Wiele osób straciło pieniądze nie przez spadek kursu, ale przez upadek firmy, której je powierzyli. W 2014 roku z japońskiej giełdy Mt. Gox zniknęło kilkaset tysięcy bitcoinów klientów. W maju 2022 roku w kilka dni załamał się stablecoin TerraUSD i powiązana z nim waluta Luna, a inwestorzy stracili dziesiątki miliardów dolarów. W listopadzie 2022 roku upadła FTX, jedna z największych giełd kryptowalut na świecie, a jej założyciel został później skazany za oszustwo. W kryptowalutach powtarza się zasada: jeśli klucze do portfela trzyma ktoś inny, to tak naprawdę ufasz jemu.",
      "## Regulacje i podatki",
      "Od końca 2024 roku w całej Unii Europejskiej obowiązuje w pełni rozporządzenie MiCA, które nakłada na firmy oferujące kryptowaluty obowiązek licencji, ochrony środków klientów i ujawniania ryzyk. Już wcześniej, w 2022 roku, europejscy nadzorcy (EBA, ESMA i EIOPA) wspólnie ostrzegali, że inwestorzy mogą stracić wszystkie zainwestowane w kryptowaluty pieniądze. W Polsce zysk ze sprzedaży kryptowalut za złotówki lub inne zwykłe waluty opodatkowany jest stawką 19% i rozlicza się go w PIT-38. Wymiana jednej kryptowaluty na drugą nie jest zdarzeniem podatkowym.",
      "Jeśli chcesz mieć kryptowaluty, rozsądnie jest traktować je jak bardzo ryzykowną część portfela, której utratę zniesiesz bez problemu. W symulatorze możesz zobaczyć, jak ich wahania wpływają na wynik całego portfela, zanim zaryzykujesz prawdziwe pieniądze.",
    ],
    sources: [
      {
        author: "Satoshi Nakamoto",
        title: "Bitcoin: A Peer-to-Peer Electronic Cash System",
        publisher: "bitcoin.org",
        year: 2008,
        url: "https://bitcoin.org/bitcoin.pdf",
      },
      {
        author: "Arvind Narayanan, Joseph Bonneau, Edward Felten, Andrew Miller, Steven Goldfeder",
        title: "Bitcoin and Cryptocurrency Technologies",
        publisher: "Princeton University Press",
        year: 2016,
      },
      {
        author: "Parlament Europejski i Rada UE",
        title:
          "Rozporządzenie (UE) 2023/1114 w sprawie rynków kryptoaktywów (MiCA)",
        publisher: "Dziennik Urzędowy UE",
        year: 2023,
        url: "https://eur-lex.europa.eu/eli/reg/2023/1114/oj",
      },
      {
        author: "EBA, ESMA, EIOPA",
        title: "Wspólne ostrzeżenie dla konsumentów dotyczące ryzyka kryptoaktywów",
        publisher: "Europejskie Urzędy Nadzoru",
        year: 2022,
      },
      KNF_WARNINGS,
    ],
  },
  {
    id: "edu-16",
    title: "Krótka sprzedaż, czyli zarabianie na spadkach",
    summary:
      "Short polega na sprzedaży pożyczonych akcji z nadzieją, że odkupisz je taniej. Zysk jest ograniczony, strata teoretycznie nie. Pokazała to historia GameStop z 2021 roku.",
    category: "Instrumenty zaawansowane",
    language: "pl",
    author: AUTHOR,
    content: [
      "Zwykle zarabiasz, gdy kupisz taniej i sprzedasz drożej. Krótka sprzedaż (short) odwraca kolejność. Pożyczasz akcje, których nie masz, od razu je sprzedajesz, a później odkupujesz, żeby oddać pożyczkę. Jeśli w międzyczasie kurs spadł, zarabiasz na różnicy.",
      "## Przykład w liczbach",
      "Pożyczasz 100 akcji i sprzedajesz je po 50 zł, dostajesz 5000 zł. Kurs spada do 40 zł, więc odkupujesz akcje za 4000 zł i oddajesz je pożyczającemu. Zostaje Ci 1000 zł zysku, pomniejszone o opłatę za pożyczkę. Jeśli jednak kurs wzrośnie do 80 zł, odkupienie kosztuje 8000 zł i tracisz 3000 zł.",
      "Tu leży najważniejsza różnica w porównaniu z kupnem akcji. Kupując, możesz stracić najwyżej to, co wpłaciłeś, bo kurs nie spadnie poniżej zera. Przy shorcie zysk jest ograniczony (akcja może spaść najwyżej do zera), a strata nie ma górnej granicy, bo kurs może rosnąć bez końca.",
      "## Dodatkowe koszty",
      "Za pożyczenie akcji płaci się opłatę, która dla akcji trudno dostępnych bywa bardzo wysoka. Jeśli w czasie trwania pozycji spółka wypłaci dywidendę, to Ty musisz ją zapłacić właścicielowi akcji. Broker wymaga też depozytu zabezpieczającego, a gdy kurs rośnie, może zażądać dopłaty albo sam zamknąć pozycję ze stratą.",
      "## GameStop i short squeeze",
      "W styczniu 2021 roku wielu dużych funduszy grało na spadek akcji GameStop, amerykańskiej sieci sklepów z grami. Użytkownicy forum Reddit zaczęli masowo kupować akcje. Kurs, który na początku miesiąca wynosił około 20 dolarów, 28 stycznia na chwilę przekroczył 480 dolarów. Fundusze z otwartymi shortami musiały odkupywać akcje, żeby ograniczyć straty, a ich kupowanie dodatkowo pchało cenę w górę. To zjawisko nazywa się short squeeze. Fundusz Melvin Capital stracił w tym miesiącu ponad połowę wartości i potrzebował wsparcia innych firm. Amerykańska komisja papierów wartościowych (SEC) opisała te wydarzenia w osobnym raporcie.",
      "Podobna sytuacja zdarzyła się w październiku 2008 roku z Volkswagenem. Gdy Porsche ujawniło, że kontroluje znacznie więcej akcji, niż sądzono, krótko sprzedający zostali bez akcji do odkupienia, a Volkswagen na krótko stał się najdroższą spółką świata.",
      "## Kto i jak używa shortów",
      "Krótka sprzedaż ma też pożyteczną stronę. Analitycy grający na spadek nieraz pierwsi wykrywali oszustwa księgowe, tak jak przy niemieckim Wirecardzie. W Unii Europejskiej obowiązuje rozporządzenie o krótkiej sprzedaży, które między innymi wymaga zgłaszania nadzorcy większych pozycji krótkich. Inwestorzy indywidualni najczęściej grają na spadki nie przez klasyczny short, tylko przez kontrakty terminowe albo CFD, które mają własne, poważne ryzyka.",
      "Dla początkującego inwestora short to narzędzie, które łatwo zrozumieć na papierze i bardzo łatwo źle użyć w praktyce. Pozycja może przynieść stratę wielokrotnie większą niż spodziewany zysk.",
    ],
    sources: [
      BODIE,
      {
        author: "U.S. Securities and Exchange Commission",
        title: "Staff Report on Equity and Options Market Structure Conditions in Early 2021",
        publisher: "SEC",
        year: 2021,
      },
      {
        author: "Parlament Europejski i Rada UE",
        title:
          "Rozporządzenie (UE) nr 236/2012 w sprawie krótkiej sprzedaży i wybranych aspektów swapów ryzyka kredytowego",
        publisher: "Dziennik Urzędowy UE",
        year: 2012,
        url: "https://eur-lex.europa.eu/eli/reg/2012/236/oj",
      },
    ],
  },
  {
    id: "edu-17",
    title: "CFD: dźwignia, która działa w obie strony",
    summary:
      "Kontrakt na różnicę pozwala zarabiać na zmianach ceny bez kupowania instrumentu, ale dźwignia mnoży także straty. Według obowiązkowych ostrzeżeń brokerów większość klientów detalicznych traci na CFD pieniądze.",
    category: "Instrumenty zaawansowane",
    language: "pl",
    author: AUTHOR,
    content: [
      "CFD (contract for difference, kontrakt na różnicę kursową) to umowa między Tobą a brokerem. Nie kupujesz akcji, złota ani indeksu. Umawiasz się tylko, że rozliczycie różnicę między ceną w chwili otwarcia a ceną w chwili zamknięcia pozycji. Możesz grać zarówno na wzrost, jak i na spadek, i od razu kontrolować pozycję wielokrotnie większą niż wpłacone pieniądze.",
      "## Jak działa dźwignia",
      "Załóżmy, że wpłacasz 10 000 zł i otwierasz pozycję na indeks z dźwignią 20:1. Twoja ekspozycja to 200 000 zł. Jeśli indeks wzrośnie o 3%, zarabiasz 6000 zł, czyli 60% wpłaty. Jeśli spadnie o 3%, tracisz 6000 zł. A ruch indeksu o 3% w ciągu kilku dni to nic nadzwyczajnego. Przy spadku o 5% tracisz cały depozyt.",
      "## Ile osób na tym traci",
      "W 2018 roku Europejski Urząd Nadzoru Giełd i Papierów Wartościowych (ESMA) uznał, że CFD wyrządzają klientom detalicznym tak duże szkody, że trzeba ograniczyć ich sprzedaż. Od tego czasu w UE obowiązują limity dźwigni dla klientów detalicznych: 30:1 dla głównych par walutowych, 20:1 dla głównych indeksów i złota, 10:1 dla surowców, 5:1 dla akcji i 2:1 dla kryptowalut. Broker musi zamknąć pozycje, gdy Twój depozyt spadnie do połowy wymaganego minimum, a saldo rachunku nie może zejść poniżej zera.",
      "Każdy broker musi też publikować ostrzeżenie, jaki procent jego klientów detalicznych traci pieniądze. W praktyce te liczby zwykle mieszczą się w przedziale 70-80%. Komisja Nadzoru Finansowego regularnie publikuje własne analizy wyników klientów na rynku forex i CFD i od lat ostrzega przed agresywnym marketingiem tych produktów.",
      "## Ukryte koszty",
      "Oprócz spreadu płacisz za każdą noc utrzymywania pozycji (tak zwany punkt swapowy), bo w praktyce broker pożycza Ci pieniądze na dźwignię. Przy pozycjach trzymanych tygodniami ten koszt potrafi zjeść cały zysk. Do tego CFD nie są notowane na giełdzie: drugą stroną transakcji jest zwykle sam broker, więc to on ustala ceny i warunki.",
      "## Dla kogo to jest",
      "CFD bywają używane przez doświadczonych inwestorów, na przykład do krótkoterminowego zabezpieczenia portfela. Dla początkującego to jedno z najszybszych miejsc, w których można stracić oszczędności. Jeśli reklama obiecuje szybkie zyski z dźwigni, sprawdź firmę na liście ostrzeżeń KNF. Zanim spróbujesz CFD za prawdziwe pieniądze, przelicz w symulatorze, co z Twoim portfelem zrobiłby ruch rynku o 5% w niekorzystną stronę przy dźwigni 20:1.",
    ],
    sources: [
      {
        author: "European Securities and Markets Authority",
        title:
          "Decyzja ESMA (UE) 2018/796 w sprawie tymczasowego ograniczenia kontraktów na różnice kursowe",
        publisher: "Dziennik Urzędowy UE",
        year: 2018,
        url: "https://eur-lex.europa.eu/eli/dec/2018/796/oj",
      },
      {
        author: "Komisja Nadzoru Finansowego",
        title: "Analizy wyników klientów detalicznych na rynku OTC (forex i CFD)",
        publisher: "KNF",
        year: 2024,
        url: "https://www.knf.gov.pl",
      },
      KNF_WARNINGS,
    ],
  },
  {
    id: "edu-18",
    title: "Fundusze inwestycyjne w Polsce: jak działają TFI",
    summary:
      "Fundusz zbiera pieniądze wielu osób i inwestuje je według określonej strategii. Wyjaśniamy rodzaje funduszy, opłaty oraz to, czym różnią się od ETF-ów.",
    category: "Instrumenty",
    language: "pl",
    author: AUTHOR,
    content: [
      "Fundusz inwestycyjny łączy pieniądze wielu osób i inwestuje je wspólnie. W zamian dostajesz jednostki uczestnictwa, których wartość zmienia się razem z wartością portfela funduszu. W Polsce fundusze tworzą i prowadzą towarzystwa funduszy inwestycyjnych (TFI), a ich działanie reguluje ustawa o funduszach inwestycyjnych z 2004 roku i nadzoruje Komisja Nadzoru Finansowego.",
      "Ważna rzecz, o której mało kto wie: pieniądze funduszu nie należą do TFI. Przechowuje je osobna instytucja, depozytariusz (najczęściej bank). Nawet gdyby towarzystwo zbankrutowało, aktywa funduszu nie wchodzą do masy upadłościowej.",
      "## Rodzaje funduszy",
      "Fundusze pieniężne i krótkoterminowe dłużne inwestują w bardzo krótkie obligacje i lokaty. Są spokojne, ale zarabiają niewiele. Fundusze dłużne kupują obligacje skarbowe lub firmowe, a ich wynik mocno zależy od zmian stóp procentowych. Fundusze mieszane łączą akcje i obligacje. Fundusze akcyjne inwestują głównie w akcje i wahają się najbardziej. Osobną grupą są fundusze zamknięte, często o niestandardowych strategiach, przeznaczone raczej dla zamożniejszych inwestorów.",
      "## Opłaty",
      "Największym kosztem jest roczna opłata za zarządzanie, pobierana codziennie z wartości funduszu. Przez lata w polskich funduszach akcyjnych sięgała 3-4% rocznie, dlatego ustawodawca stopniowo obniżał jej dopuszczalny maksymalny poziom. Do tego mogą dojść opłata za nabycie jednostek (dystrybucyjna) i opłata za wynik, pobierana, gdy fundusz zarobi więcej niż ustalony próg.",
      "Różnica bywa ogromna. 10 000 zł inwestowane przez 20 lat przy 7% rocznie daje po odjęciu opłaty 2% około 26,5 tysiąca złotych, a po odjęciu opłaty 0,2% około 37,3 tysiąca. Jedenaście tysięcy złotych różnicy wynika wyłącznie z kosztów.",
      "## Fundusz czy ETF?",
      "Tradycyjny fundusz kupujesz i sprzedajesz po wycenie z danego dnia, bezpośrednio w TFI albo przez bank czy dystrybutora. ETF kupujesz na giełdzie przez rachunek maklerski w trakcie sesji. Fundusze aktywne próbują pobić rynek i zwykle są droższe. ETF-y najczęściej kopiują indeks i są tanie. Fundusze mają jednak jedną praktyczną zaletę: w ramach funduszu parasolowego możesz przenieść pieniądze z jednego subfunduszu do drugiego bez płacenia podatku od zysku w momencie zamiany.",
      "Przed zakupem przeczytaj dokument z kluczowymi informacjami (KID), sprawdź wysokość opłat i porównaj wyniki funduszu z jego benchmarkiem w okresie co najmniej pięciu lat. Dane o całym rynku funduszy w Polsce publikuje Izba Zarządzających Funduszami i Aktywami.",
    ],
    sources: [
      {
        author: "Sejm RP",
        title:
          "Ustawa z dnia 27 maja 2004 r. o funduszach inwestycyjnych i zarządzaniu alternatywnymi funduszami inwestycyjnymi",
        publisher: "Internetowy System Aktów Prawnych",
        year: 2004,
        url: "https://isap.sejm.gov.pl",
      },
      {
        author: "Izba Zarządzających Funduszami i Aktywami",
        title: "Statystyki rynku funduszy inwestycyjnych",
        publisher: "IZFiA",
        year: 2024,
        url: "https://www.izfia.pl",
      },
      BOGLE,
    ],
  },
  {
    id: "edu-19",
    title: "Warren Buffett: jak naprawdę powstał jego majątek",
    summary:
      "Buffett kupił pierwsze akcje w wieku 11 lat i inwestuje od ponad 80 lat. Jego sukces to połączenie metody Grahama, cierpliwości, ubezpieczeń i bardzo długiego czasu.",
    category: "Historie inwestorów",
    language: "pl",
    author: AUTHOR,
    content: [
      "Warren Buffett urodził się w 1930 roku w Omaha w stanie Nebraska. Pierwsze akcje kupił w wieku 11 lat. Jako nastolatek roznosił gazety i za oszczędności kupił kawałek ziemi uprawnej. Po przeczytaniu książki „Inteligentny inwestor” Benjamina Grahama poszedł studiować na Uniwersytet Columbia, gdzie Graham wykładał, a potem przez dwa lata u niego pracował.",
      "## Lata spółek partnerskich",
      "W 1956 roku Buffett założył spółkę inwestycyjną dla rodziny i znajomych. Przez 13 lat jej wyniki były znacznie lepsze od rynku. Kupował głównie spółki bardzo tanie w stosunku do majątku, dokładnie według metody Grahama. Jedną z najbardziej znanych inwestycji był American Express. W 1963 roku firma wpadła w skandal związany z oszustwem jednego z kontrahentów i jej akcje mocno spadły. Buffett sprawdził, czy klienci nadal używają kart i czeków podróżnych Amexu, uznał, że biznes jest zdrowy, i zainwestował w niego dużą część kapitału spółki.",
      "## Berkshire Hathaway",
      "W 1965 roku Buffett przejął kontrolę nad Berkshire Hathaway, upadającą firmą tekstylną. Później nazwał to jedną ze swoich najgorszych decyzji, bo przemysł tekstylny w USA powoli umierał. Zamienił jednak Berkshire w spółkę, która kupowała inne firmy. Kluczowe okazały się ubezpieczenia, na przykład GEICO. Ubezpieczyciel dostaje składki teraz, a odszkodowania wypłaca później. Pieniądze, które w międzyczasie leżą w firmie (Buffett nazywa je float), można inwestować.",
      "Pod wpływem swojego wspólnika Charliego Mungera Buffett odszedł od kupowania po prostu tanich firm. Zaczął szukać świetnych biznesów za rozsądną cenę. Najsłynniejszym przykładem jest Coca-Cola, w którą w 1988 roku zainwestował około miliarda dolarów i którą trzyma do dziś.",
      "## Liczby",
      "Według listu do akcjonariuszy za 2023 rok wartość rynkowa akcji Berkshire rosła w latach 1965-2023 średnio o 19,8% rocznie. Indeks S&P 500 razem z dywidendami dał w tym czasie 10,2% rocznie. Różnica wygląda na niewielką, ale dzięki procentowi składanemu dolar zainwestowany w Berkshire urósł ponad 40 tysięcy razy, a w indeksie około 300 razy.",
      "## Czego Buffett radzi innym",
      "Co ciekawe, Buffett nie zachęca zwykłych ludzi do naśladowania go. W liście z 2013 roku napisał, że w testamencie poleca, by pieniądze dla żony zainwestować w 90% w bardzo tani fundusz indeksowy na S&P 500, a w 10% w krótkoterminowe obligacje rządowe. Wygrał też słynny zakład, w którym fundusz indeksowy przez dziesięć lat pokonał wybrane fundusze hedgingowe.",
      "Z historii Buffetta da się wyciągnąć kilka praktycznych rzeczy: inwestować w biznesy, które się rozumie, nie panikować, gdy inni sprzedają, trzymać koszty nisko i przede wszystkim dać sobie bardzo dużo czasu. Ogromna część jego majątku powstała już po 60. urodzinach.",
    ],
    sources: [
      BERKSHIRE_LETTERS,
      {
        author: "Alice Schroeder",
        title: "The Snowball: Warren Buffett and the Business of Life",
        publisher: "Bantam Books",
        year: 2008,
      },
      GRAHAM,
      HOUSEL,
    ],
  },
  {
    id: "edu-20",
    title: "Peter Lynch: inwestuj w to, co znasz",
    summary:
      "W latach 1977-1990 Peter Lynch prowadził fundusz Magellan, który zarabiał średnio około 29% rocznie. Jego metoda zaczynała się od obserwacji zwykłego życia, ale nie kończyła się na niej.",
    category: "Historie inwestorów",
    language: "pl",
    author: AUTHOR,
    content: [
      "Peter Lynch zaczynał jako caddy na polu golfowym w Bostonie, gdzie nosił kije między innymi szefom firmy inwestycyjnej Fidelity. Dzięki temu trafił tam na staż, a w 1977 roku, mając 33 lata, przejął niewielki fundusz Magellan. Zarządzał nim przez 13 lat.",
      "## Wyniki",
      "W latach 1977-1990 Magellan zarabiał średnio około 29% rocznie, mniej więcej dwa razy więcej niż indeks S&P 500. Fundusz urósł z kilkunastu milionów do kilkunastu miliardów dolarów i stał się największym funduszem akcyjnym na świecie. W 1990 roku, u szczytu kariery, Lynch odszedł na emeryturę, żeby spędzać więcej czasu z rodziną.",
      "## Rajstopy, pączki i tacos",
      "W książce „One Up on Wall Street” Lynch przekonywał, że zwykły człowiek ma przewagę nad analitykami z Wall Street, bo wcześniej zauważa dobre produkty w codziennym życiu. Opisał, jak jego żona zachwyciła się rajstopami L'eggs sprzedawanymi w supermarketach, co zachęciło go do przyjrzenia się producentowi, firmie Hanes. Okazała się jedną z jego najlepszych inwestycji. Podobnie trafiał na sieci restauracji czy sklepów, które zobaczył w podróży, zanim zauważyli je analitycy. Akcje, które wzrosły dziesięciokrotnie, nazywał „tenbaggerami”.",
      "## To nie był przepis na łatwe pieniądze",
      "Hasło „kupuj to, co znasz” często jest upraszczane. Lynch zawsze podkreślał, że obserwacja to dopiero początek. Potem trzeba sprawdzić finanse firmy: czy rośnie, czy jest zadłużona, ile kosztują jej akcje w stosunku do zysków. Sam pracował po 80 godzin tygodniowo, spotykał się z setkami zarządów rocznie i w szczytowym momencie miał w funduszu ponad tysiąc spółek. Jego sukces wynikał z ogromnej pracy, a nie z pojedynczych trafień.",
      "Lynch mówił też, że więcej pieniędzy stracono, przygotowując się na korekty albo próbując je przewidzieć, niż w samych korektach. Uważał, że zamiast zgadywać, co zrobi rynek, lepiej skupić się na tym, co robią konkretne firmy.",
      "## Lekcja dla początkującego",
      "Z historii Lyncha warto wziąć ciekawość i nawyk zadawania pytań: dlaczego ten sklep jest zawsze pełny? Kto produkuje rzecz, którą wszyscy kupują? Ale zanim kupisz akcje, zajrzyj do raportów finansowych, porównaj wskaźniki wyceny i sprawdź, czy ta wiedza nie jest już dawno w cenie. W symulatorze możesz prowadzić własny mały „fundusz” i po roku porównać go z indeksem.",
    ],
    sources: [
      {
        author: "Peter Lynch, John Rothchild",
        title: "One Up on Wall Street",
        publisher: "Simon & Schuster",
        year: 1989,
      },
      {
        author: "Peter Lynch, John Rothchild",
        title: "Beating the Street",
        publisher: "Simon & Schuster",
        year: 1993,
      },
    ],
  },
  {
    id: "edu-21",
    title: "Gdy geniusze tracą: Newton, Livermore i LTCM",
    summary:
      "Isaac Newton stracił fortunę na bańce spekulacyjnej, legendarny spekulant Jesse Livermore kilka razy bankrutował, a fundusz dwóch noblistów upadł w kilka miesięcy. Inteligencja nie chroni przed rynkiem.",
    category: "Historie inwestorów",
    language: "pl",
    author: AUTHOR,
    content: [
      "Historie wielkich sukcesów kuszą, ale równie dużo uczą historie wielkich porażek. Łączy je jedno: bardzo inteligentni ludzie stracili pieniądze nie z braku wiedzy, ale przez dźwignię, zbyt dużą pewność siebie albo emocje.",
      "## Isaac Newton i bańka Mórz Południowych",
      "W 1720 roku w Anglii wybuchła gorączka akcji Kompanii Mórz Południowych. Ich cena wzrosła w kilka miesięcy wielokrotnie, choć firma nie miała ani znaczących zysków, ani realnych perspektyw. Isaac Newton, jeden z największych naukowców w historii, kupił akcje wcześnie i sprzedał je z zyskiem. Potem patrzył, jak kurs dalej rośnie, wrócił na rynek dużo drożej i stracił, gdy bańka pękła. Historyk Andrew Odlyzko na podstawie zachowanych dokumentów szacuje jego straty na około 20 tysięcy funtów, czyli majątek. Newtonowi przypisuje się zdanie, że potrafi obliczyć ruchy ciał niebieskich, ale nie szaleństwo ludzi, choć nie ma pewności, że naprawdę je wypowiedział.",
      "## Jesse Livermore: fortuna zdobyta i stracona",
      "Jesse Livermore był najsłynniejszym spekulantem początku XX wieku. Zarobił fortunę, grając na spadki w czasie paniki w 1907 roku, a w czasie krachu w 1929 roku jego majątek szacowano na około 100 milionów dolarów. Jego metody opisał Edwin Lefèvre w książce „Wspomnienia gracza giełdowego”, czytanej przez traderów do dziś. Livermore kilka razy w życiu tracił jednak wszystko, łamiąc własne zasady: grał zbyt dużymi pozycjami i z pożyczonych pieniędzy. Zmarł w 1940 roku, w trudnej sytuacji finansowej.",
      "## LTCM: dwóch noblistów i dźwignia",
      "Long-Term Capital Management powstał w 1994 roku. Wśród jego wspólników byli Myron Scholes i Robert Merton, którzy w 1997 roku dostali Nobla za prace nad wyceną opcji. Fundusz zarabiał na drobnych różnicach w cenach obligacji, a żeby te małe zyski były opłacalne, korzystał z ogromnej dźwigni: na każdego dolara kapitału przypadało ponad 25 dolarów pożyczonych.",
      "Przez pierwsze lata wyniki były znakomite. W sierpniu 1998 roku Rosja przestała spłacać swoje długi, inwestorzy w panice zaczęli uciekać do najbezpieczniejszych obligacji i ceny zachowały się zupełnie inaczej, niż przewidywały modele LTCM. W niecałe cztery miesiące fundusz stracił około 4,6 miliarda dolarów. Bank Rezerwy Federalnej w Nowym Jorku zorganizował ratunek, w którym 14 banków wyłożyło około 3,6 miliarda dolarów, żeby upadek funduszu nie wywołał kryzysu w całym systemie finansowym. Historię opisał Roger Lowenstein w książce „When Genius Failed”.",
      "## Co łączy te historie",
      "Newton dał się porwać tłumowi, mimo że wcześniej postąpił rozsądnie. Livermore znał swoje zasady, ale ich nie przestrzegał. LTCM miał najlepsze modele na świecie, ale dźwignia sprawiła, że jedno zdarzenie spoza modelu wystarczyło do katastrofy. Dla zwykłego inwestora płyną z tego proste wnioski: nie inwestuj pożyczonymi pieniędzmi, nie zwiększaj ryzyka tylko dlatego, że inni zarabiają, i zawsze zakładaj, że może wydarzyć się coś, czego nikt nie przewidział.",
    ],
    sources: [
      {
        author: "Andrew Odlyzko",
        title: "Newton's financial misadventures in the South Sea Bubble",
        publisher: "Notes and Records of the Royal Society, 73(1), 29-59",
        year: 2019,
      },
      {
        author: "Edwin Lefèvre",
        title: "Reminiscences of a Stock Operator",
        publisher: "George H. Doran Company",
        year: 1923,
      },
      {
        author: "Roger Lowenstein",
        title: "When Genius Failed: The Rise and Fall of Long-Term Capital Management",
        publisher: "Random House",
        year: 2000,
      },
      {
        author: "Charles Mackay",
        title: "Extraordinary Popular Delusions and the Madness of Crowds",
        publisher: "Richard Bentley",
        year: 1841,
      },
    ],
  },
];
