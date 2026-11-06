/**
 * Treści artykułów edukacyjnych zapisywanych do lokalnej bazy SQLite
 * (tabela `educational_articles`). Plik jest jedynie źródłem danych startowych
 * (seed) – ekran „Nauka” odczytuje artykuły z bazy przez `getEducationalArticles()`.
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

export const EDUCATIONAL_ARTICLE_SEED: readonly EducationalArticleSeed[] = [
  {
    id: "edu-01",
    title: "Czym jest akcja i skąd bierze się jej wartość?",
    summary:
      "Akcja to udział we własności spółki. Jej cena odzwierciedla oczekiwania rynku co do przyszłych zysków i przepływów pieniężnych firmy.",
    category: "Podstawy",
    language: "pl",
    author: AUTHOR,
    content: [
      "Akcja to papier wartościowy, który potwierdza posiadanie części spółki akcyjnej. Kupując nawet jedną akcję, stajesz się współwłaścicielem firmy – w bardzo małym ułamku, ale z realnymi prawami: do udziału w zysku (dywidendy), do głosu na walnym zgromadzeniu oraz do części majątku w razie likwidacji spółki, po zaspokojeniu wierzycieli.",
      "## Rynek pierwotny i wtórny",
      "Spółka pozyskuje pieniądze tylko wtedy, gdy emituje nowe akcje, np. w ofercie publicznej (IPO). Później akcje krążą między inwestorami na rynku wtórnym, czyli na giełdzie. W Polsce jest to Giełda Papierów Wartościowych w Warszawie (GPW), a nadzór nad rynkiem sprawuje Komisja Nadzoru Finansowego (KNF). Gdy kupujesz akcje na giełdzie, płacisz innemu inwestorowi, a nie spółce.",
      "## Skąd bierze się cena?",
      "Cena akcji w danej chwili to po prostu ostatnia cena, po której kupujący i sprzedający zawarli transakcję. Wartość spółki to jednak coś innego niż cena. Teoria finansów opisuje ją jako bieżącą wartość wszystkich przyszłych przepływów pieniężnych, jakie firma wygeneruje dla właścicieli, zdyskontowanych o czas i ryzyko. Takie podejście (model zdyskontowanych przepływów pieniężnych, DCF) szczegółowo opisuje Aswath Damodaran.",
      "W praktyce oznacza to, że na cenę wpływają głównie oczekiwania: jak szybko będą rosły przychody i zyski, jakie są stopy procentowe (wyższe stopy obniżają dziś wartość przyszłych zysków) i jak duże jest ryzyko biznesu. Dlatego kurs potrafi spaść po dobrych wynikach, jeśli rynek oczekiwał jeszcze lepszych.",
      "## Cena a wartość według Grahama",
      "Benjamin Graham, nauczyciel Warrena Buffetta, porównywał rynek do pana Rynka – kapryśnego wspólnika, który codziennie proponuje cenę odkupienia lub sprzedaży udziałów. Czasem jest euforyczny i żąda za dużo, czasem przygnębiony i oddaje akcje tanio. Inwestor nie musi przyjmować jego ofert; powinien porównywać cenę z własną, rozsądną oceną wartości i zostawiać sobie margines bezpieczeństwa.",
      "## Najważniejsze wnioski",
      "• Akcja to udział w realnym biznesie, a nie los na loterii.",
      "• Krótkoterminowo cenę kształtują emocje i nowe informacje, długoterminowo – zyski spółki.",
      "• Cena to to, co płacisz; wartość to to, co otrzymujesz.",
    ],
    sources: [
      {
        author: "Benjamin Graham",
        title: "The Intelligent Investor (wyd. popr., komentarz Jason Zweig)",
        publisher: "HarperBusiness",
        year: 2003,
      },
      {
        author: "Aswath Damodaran",
        title: "Investment Valuation: Tools and Techniques for Determining the Value of Any Asset (wyd. 3)",
        publisher: "Wiley",
        year: 2012,
      },
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
    title: "Ryzyko a stopa zwrotu — dlaczego nie ma darmowych obiadów",
    summary:
      "Wyższa oczekiwana stopa zwrotu jest zapłatą za akceptowanie większej zmienności i ryzyka straty. Historyczne dane z ponad stu lat to potwierdzają.",
    category: "Ryzyko",
    language: "pl",
    author: AUTHOR,
    content: [
      "Jedna z najlepiej udokumentowanych zasad finansów brzmi: nie da się systematycznie zarabiać więcej bez brania na siebie większego ryzyka. Inwestorzy żądają premii za to, że wynik jest niepewny – i właśnie ta premia sprawia, że akcje w długim okresie zarabiały więcej niż lokaty czy obligacje.",
      "## Jak mierzyć ryzyko?",
      "Najczęściej ryzyko utożsamia się ze zmiennością, czyli odchyleniem standardowym stóp zwrotu. Im szerzej wahają się wyniki wokół średniej, tym trudniej przewidzieć, ile będzie warta inwestycja za rok. Szerokie indeksy akcji mają zwykle roczne odchylenie standardowe rzędu kilkunastu–dwudziestu kilku procent, obligacje skarbowe znacznie mniejsze, a krótkoterminowe bony skarbowe – bliskie zera.",
      "Zmienność to nie wszystko. Dla zwykłego inwestora równie ważne jest obsunięcie kapitału (drawdown), czyli spadek od szczytu do dołka. Matematyka strat jest bezlitosna: po spadku o 20% potrzeba wzrostu o 25%, by wrócić do punktu wyjścia, a po spadku o 50% – aż o 100%.",
      "## Co mówią dane historyczne?",
      "Elroy Dimson, Paul Marsh i Mike Staunton z London Business School zebrali stopy zwrotu z kilkudziesięciu rynków od 1900 roku. Ich badania pokazują, że globalne akcje dały w tym czasie realny (po inflacji) zwrot rzędu 5% rocznie, obligacje około 2%, a bony skarbowe około 1%. Ta różnica to właśnie premia za ryzyko akcyjne – ale w poszczególnych dekadach bywała ujemna, a niektóre rynki (np. Rosja w 1917 r.) zostały całkowicie wymazane.",
      "## Ryzyko, za które rynek płaci",
      "Model CAPM Williama Sharpe’a (Nagroda Nobla w 1990 r.) rozróżnia ryzyko systematyczne, dotyczące całego rynku, oraz ryzyko specyficzne pojedynczej spółki. Rynek wynagradza tylko to pierwsze, bo ryzyko specyficzne można niemal za darmo usunąć dywersyfikacją. Inwestor, który trzyma jedną spółkę, ponosi więc dodatkowe ryzyko bez gwarancji dodatkowej nagrody.",
      "## Praktyczne wnioski",
      "• Obietnica wysokiego zysku „bez ryzyka” to sygnał ostrzegawczy – KNF prowadzi publiczną listę ostrzeżeń przed podmiotami podejrzanymi o nielegalne oferty.",
      "• Dobierz poziom ryzyka do horyzontu: pieniądze potrzebne za rok nie powinny być w akcjach.",
      "• Zapytaj siebie nie „ile mogę zarobić?”, ale „ile jestem w stanie stracić bez paniki?”.",
    ],
    sources: [
      {
        author: "Zvi Bodie, Alex Kane, Alan J. Marcus",
        title: "Investments (wyd. 12)",
        publisher: "McGraw-Hill Education",
        year: 2021,
      },
      {
        author: "Elroy Dimson, Paul Marsh, Mike Staunton",
        title: "Triumph of the Optimists: 101 Years of Global Investment Returns",
        publisher: "Princeton University Press",
        year: 2002,
      },
      {
        author: "William F. Sharpe",
        title: "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk",
        publisher: "The Journal of Finance, 19(3), 425–442",
        year: 1964,
        url: "https://doi.org/10.1111/j.1540-6261.1964.tb02865.x",
      },
      {
        author: "Komisja Nadzoru Finansowego",
        title: "Lista ostrzeżeń publicznych KNF",
        publisher: "KNF",
        year: 2024,
        url: "https://www.knf.gov.pl/dla_rynku/Ostrzezenia_publiczne",
      },
    ],
  },
  {
    id: "edu-03",
    title: "Dywersyfikacja portfela w praktyce",
    summary:
      "Łączenie aktywów, które nie poruszają się identycznie, obniża ryzyko portfela bez proporcjonalnej utraty oczekiwanego zysku. To jedyny „darmowy obiad” w finansach.",
    category: "Portfel",
    language: "pl",
    author: AUTHOR,
    content: [
      "Powiedzenie „nie wkładaj wszystkich jajek do jednego koszyka” zna każdy. W 1952 roku Harry Markowitz nadał mu ścisłą, matematyczną formę w artykule „Portfolio Selection”, za który w 1990 roku otrzymał Nagrodę Nobla. Jego kluczowe spostrzeżenie: ryzyko portfela nie jest średnią ryzyk jego składników.",
      "## Dlaczego to działa?",
      "O ryzyku portfela decyduje nie tylko zmienność poszczególnych aktywów, ale też ich korelacja, czyli to, jak bardzo poruszają się razem. Jeśli jedna spółka traci, gdy druga zyskuje, ich wahania częściowo się znoszą. Nawet aktywa o dodatniej, ale niepełnej korelacji obniżają łączną zmienność. Dlatego mówi się, że dywersyfikacja to jedyny darmowy obiad w finansach – zmniejsza ryzyko, nie obniżając proporcjonalnie oczekiwanego zysku.",
      "## Ile spółek wystarczy?",
      "Badania (m.in. Meir Statman, 1987) pokazały, że dodawanie kolejnych losowo wybranych spółek szybko zmniejsza ryzyko specyficzne, ale korzyść maleje z każdą kolejną pozycją. Kilkadziesiąt spółek z różnych branż eliminuje większość ryzyka pojedynczych firm. Pozostaje ryzyko rynkowe – tego nie da się usunąć, mając wyłącznie akcje.",
      "## Wymiary dywersyfikacji",
      "• Klasy aktywów: akcje, obligacje, gotówka, ewentualnie nieruchomości czy surowce.",
      "• Geografia: rynek polski stanowi niewielki ułamek światowej kapitalizacji; portfel tylko z GPW jest mocno skoncentrowany.",
      "• Branże: kilka banków to nadal jedna branża, wrażliwa na te same czynniki, np. stopy procentowe.",
      "• Waluty: aktywa zagraniczne dodają ryzyko kursowe, ale też uniezależniają od jednej gospodarki.",
      "• Czas: rozłożenie zakupów w czasie zmniejsza ryzyko wejścia w najgorszym momencie.",
      "## Pułapki",
      "Dywersyfikacja nie chroni przed wszystkim. W czasie kryzysów korelacje między akcjami zwykle rosną i niemal wszystko spada naraz – tak było w 2008 i w marcu 2020 roku. Dlatego w portfelu ważne są także aktywa o innym charakterze, np. obligacje skarbowe. Z drugiej strony nadmierne rozdrobnienie (dziesiątki funduszy o podobnym składzie) daje tylko złudzenie dywersyfikacji i podnosi koszty.",
      "W symulatorze sprawdź, jak zmienia się wynik portfela, gdy zamiast jednej spółki kupisz kilka z różnych sektorów.",
    ],
    sources: [
      {
        author: "Harry Markowitz",
        title: "Portfolio Selection",
        publisher: "The Journal of Finance, 7(1), 77–91",
        year: 1952,
        url: "https://doi.org/10.1111/j.1540-6261.1952.tb01525.x",
      },
      {
        author: "Meir Statman",
        title: "How Many Stocks Make a Diversified Portfolio?",
        publisher: "Journal of Financial and Quantitative Analysis, 22(3), 353–363",
        year: 1987,
      },
      {
        author: "Burton G. Malkiel",
        title: "A Random Walk Down Wall Street (wyd. 13)",
        publisher: "W. W. Norton & Company",
        year: 2023,
      },
    ],
  },
  {
    id: "edu-04",
    title: "Jak czytać wykres świecowy?",
    summary:
      "Każda świeca pokazuje cztery ceny z danego okresu: otwarcia, zamknięcia, maksimum i minimum. To czytelny obraz walki kupujących ze sprzedającymi.",
    category: "Analiza techniczna",
    language: "pl",
    author: AUTHOR,
    content: [
      "Wykresy świecowe wywodzą się z XVIII-wiecznej Japonii, gdzie używano ich do analizy cen ryżu. Na Zachodzie spopularyzował je Steve Nison książką z 1991 roku. Dziś to domyślny typ wykresu w większości platform inwestycyjnych – także w InvestSimulatorze.",
      "## Budowa świecy",
      "Każda świeca opisuje jeden okres: minutę, godzinę, dzień lub tydzień. Zawiera cztery ceny, w skrócie OHLC: otwarcia (Open), najwyższą (High), najniższą (Low) i zamknięcia (Close).",
      "• Korpus – prostokąt między ceną otwarcia a zamknięcia.",
      "• Kolor – zwykle zielony (lub biały), gdy zamknięcie jest wyżej niż otwarcie, i czerwony (lub czarny), gdy niżej.",
      "• Cienie (knoty) – cienkie linie nad i pod korpusem, sięgające do maksimum i minimum okresu.",
      "## Co mówi kształt?",
      "Długi zielony korpus oznacza, że przez cały okres przewagę mieli kupujący. Długi górny cień pokazuje, że cena próbowała rosnąć, ale sprzedający zepchnęli ją w dół. Doji – świeca, w której otwarcie i zamknięcie są prawie równe – sygnalizuje niezdecydowanie rynku.",
      "Analitycy wyróżniają też formacje, np. młot (mały korpus z długim dolnym cieniem po spadkach) czy objęcie hossy (duża zielona świeca całkowicie „obejmująca” korpus poprzedniej czerwonej). Interpretuje się je jako możliwe sygnały odwrócenia trendu.",
      "## Kontekst jest ważniejszy niż pojedyncza świeca",
      "John J. Murphy w swoim podręczniku analizy technicznej podkreśla, że formacje należy oceniać w kontekście trendu, poziomów wsparcia i oporu oraz wolumenu obrotu. Ta sama świeca znaczy co innego na szczycie długiego wzrostu, a co innego w środku konsolidacji.",
      "## Ograniczenia",
      "Wykres opisuje przeszłość, a nie przyszłość. Badania naukowe nie potwierdzają, by proste formacje świecowe dawały trwałą przewagę po uwzględnieniu kosztów transakcyjnych. Traktuj je jako narzędzie do czytania nastrojów rynku, a nie jako kryształową kulę. Sprawdź to sam: otwórz wykres dowolnej spółki w zakładce Rynek i spróbuj nazwać kilka ostatnich świec.",
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
    title: "Obligacje — pożyczka, która może zarabiać",
    summary:
      "Kupując obligację, pożyczasz pieniądze państwu lub firmie w zamian za odsetki i zwrot kapitału. Cena obligacji spada, gdy rosną stopy procentowe.",
    category: "Instrumenty",
    language: "pl",
    author: AUTHOR,
    content: [
      "Obligacja to dłużny papier wartościowy. Emitent – Skarb Państwa, samorząd lub przedsiębiorstwo – pożycza od inwestora pieniądze i zobowiązuje się wypłacać odsetki (kupon) oraz oddać wartość nominalną w dniu wykupu. W przeciwieństwie do akcjonariusza obligatariusz nie jest współwłaścicielem, lecz wierzycielem.",
      "## Podstawowe pojęcia",
      "• Wartość nominalna – kwota zwracana przy wykupie, np. 100 zł lub 1000 zł.",
      "• Kupon – odsetki: stałe, zmienne (np. oparte o stawkę rynkową) albo indeksowane inflacją.",
      "• Termin wykupu (zapadalność) – data zwrotu kapitału.",
      "• Rentowność do wykupu (YTM) – roczna stopa zwrotu, jaką osiągniesz, kupując obligację po bieżącej cenie i trzymając ją do końca.",
      "## Dlaczego ceny obligacji się zmieniają?",
      "Cena obligacji i rentowność poruszają się w przeciwnych kierunkach. Przykład: obligacja 10-letnia o nominale 100 zł płaci 5% rocznie. Jeśli rynkowe stopy wzrosną do 6%, nikt nie zapłaci za nią pełnych 100 zł, skoro nowe obligacje dają więcej. Jej cena spadnie do około 92,64 zł – dokładnie tyle, by kupujący osiągnął 6% rocznie. Im dłuższy termin do wykupu (dokładniej: im wyższa duracja), tym silniej cena reaguje na zmianę stóp.",
      "## Rodzaje ryzyka",
      "• Ryzyko stopy procentowej – opisane wyżej; nie dotyczy Cię, jeśli trzymasz obligację do wykupu.",
      "• Ryzyko kredytowe – emitent może nie spłacić długu. Obligacje firm płacą więcej właśnie dlatego, że to ryzyko jest wyższe niż w przypadku państwa.",
      "• Ryzyko inflacji – stały kupon traci realną wartość, gdy ceny rosną szybciej niż oczekiwano.",
      "## Obligacje skarbowe w Polsce",
      "Ministerstwo Finansów oferuje osobom fizycznym detaliczne obligacje skarbowe o nominale 100 zł, które nie są notowane na giełdzie i można je kupić bezpośrednio w serwisie obligacjeskarbowe.pl lub w PKO BP. Są wśród nich papiery o stałym oprocentowaniu (np. trzyletnie TOS), zmiennym (np. dwuletnie DOR) oraz indeksowane inflacją (czteroletnie COI i dziesięcioletnie EDO). Przy wcześniejszym wykupie pobierana jest opłata, a od odsetek – podatek 19%.",
      "Obligacje skarbowe są zwykle uznawane za najbezpieczniejszą część portfela: stabilizują jego wartość, gdy akcje gwałtownie spadają.",
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
        title: "Obligacje skarbowe – oferta i warunki emisji",
        publisher: "obligacjeskarbowe.pl",
        year: 2024,
        url: "https://www.obligacjeskarbowe.pl",
      },
      {
        author: "Zvi Bodie, Alex Kane, Alan J. Marcus",
        title: "Investments (wyd. 12), rozdz. o cenach i rentowności obligacji",
        publisher: "McGraw-Hill Education",
        year: 2021,
      },
    ],
  },
  {
    id: "edu-06",
    title: "ETF-y i fundusze indeksowe — proste narzędzie dywersyfikacji",
    summary:
      "Fundusz indeksowy kopiuje skład indeksu zamiast próbować go pokonać. Niskie koszty sprawiają, że w długim terminie wyprzedza większość funduszy aktywnych.",
    category: "Instrumenty",
    language: "pl",
    author: AUTHOR,
    content: [
      "Fundusz indeksowy nie próbuje wybierać „najlepszych” spółek. Zamiast tego kupuje wszystkie (lub prawie wszystkie) papiery z danego indeksu, np. WIG20, S&P 500 albo MSCI World, w proporcjach odpowiadających ich udziałowi w indeksie. ETF (Exchange Traded Fund) to fundusz – najczęściej indeksowy – którego jednostki są notowane na giełdzie i można je kupować jak zwykłe akcje.",
      "## Skąd ten pomysł?",
      "W 1975 roku John C. Bogle założył Vanguard, a rok później uruchomił pierwszy fundusz indeksowy dla inwestorów indywidualnych. Argument był prosty: przed kosztami wszyscy inwestorzy razem osiągają wynik rynku, więc po kosztach przeciętny inwestor musi wypaść gorzej od rynku. Najtańszy sposób, by dostać „wynik rynku”, to kupić cały rynek.",
      "## Co pokazują dane?",
      "S&P Dow Jones Indices od ponad 20 lat publikuje raporty SPIVA, porównujące fundusze aktywne z ich indeksami. Wnioski są powtarzalne: w horyzoncie 10–15 lat zdecydowana większość aktywnie zarządzanych funduszy akcyjnych osiąga wyniki gorsze niż indeks, a fundusze, które wygrywają w jednym okresie, rzadko utrzymują przewagę w kolejnym.",
      "## Zalety",
      "• Szeroka dywersyfikacja w jednej transakcji – jeden ETF na indeks światowy to ponad tysiąc spółek.",
      "• Niskie koszty – roczna opłata za zarządzanie (TER) w dużych ETF-ach to często ułamek procenta.",
      "• Przejrzystość – skład funduszu jest publikowany, wiesz, co masz.",
      "• Płynność – jednostki ETF można kupić lub sprzedać w trakcie sesji giełdowej.",
      "## Na co uważać?",
      "• Fundusz indeksowy nie chroni przed spadkami rynku – spada razem z indeksem.",
      "• Sprawdź rodzaj replikacji (fizyczna lub syntetyczna), walutę funduszu i politykę dywidendową (akumulujący lub dystrybuujący).",
      "• Lewarowane i odwrotne ETF-y to narzędzia spekulacyjne o zupełnie innym profilu ryzyka.",
      "• Liczy się błąd odwzorowania (tracking difference) – rzeczywista różnica między wynikiem funduszu a indeksu.",
      "Fundusze inwestycyjne dostępne w UE działają najczęściej według dyrektywy UCITS, a na rynku polskim nad ich dystrybucją czuwa KNF. Przed zakupem warto przeczytać dokument z kluczowymi informacjami (KID).",
    ],
    sources: [
      {
        author: "John C. Bogle",
        title: "The Little Book of Common Sense Investing (wyd. jubileuszowe)",
        publisher: "Wiley",
        year: 2017,
      },
      {
        author: "S&P Dow Jones Indices",
        title: "SPIVA – raporty porównujące fundusze aktywne z indeksami",
        publisher: "S&P Global",
        year: 2024,
        url: "https://www.spglobal.com/spdji/en/research-insights/spiva/",
      },
      {
        author: "Burton G. Malkiel",
        title: "A Random Walk Down Wall Street (wyd. 13)",
        publisher: "W. W. Norton & Company",
        year: 2023,
      },
    ],
  },
  {
    id: "edu-07",
    title: "Inflacja a realna wartość pieniądza",
    summary:
      "Liczy się nie nominalny zysk, ale to, ile realnie możesz za niego kupić. Realna stopa zwrotu to wynik inwestycji pomniejszony o inflację.",
    category: "Ekonomia",
    language: "pl",
    author: AUTHOR,
    content: [
      "Inflacja to ogólny wzrost cen towarów i usług w gospodarce. Gdy ceny rosną, za tę samą kwotę możesz kupić mniej – pieniądz traci siłę nabywczą. W Polsce inflację mierzy Główny Urząd Statystyczny wskaźnikiem cen towarów i usług konsumpcyjnych (CPI), opartym na koszyku typowych wydatków gospodarstw domowych.",
      "## Cel inflacyjny NBP",
      "Narodowy Bank Polski od 2004 roku prowadzi politykę bezpośredniego celu inflacyjnego: dąży do utrzymania inflacji na poziomie 2,5% z dopuszczalnym przedziałem wahań ±1 punkt procentowy. Głównym narzędziem są stopy procentowe – ich podnoszenie zwykle schładza popyt i hamuje wzrost cen, ale też wpływa na wyceny obligacji i akcji.",
      "## Stopa nominalna a realna",
      "Zależność między nimi opisał ekonomista Irving Fisher. Dokładny wzór to: realna stopa = (1 + stopa nominalna) / (1 + inflacja) − 1. Przy niskich wartościach można go przybliżyć prostą różnicą.",
      "Przykład: lokata dała 8%, a inflacja wyniosła 5%. Realnie Twoje oszczędności wzrosły o (1,08 / 1,05) − 1 ≈ 2,86%. Jeśli natomiast lokata dała 3% przy inflacji 5%, to mimo „zysku” na koncie realnie straciłeś na sile nabywczej.",
      "## Inflacja a różne aktywa",
      "• Gotówka i nisko oprocentowane konta – najbardziej narażone, ich realna wartość topnieje.",
      "• Obligacje o stałym kuponie – tracą, gdy inflacja okazuje się wyższa niż oczekiwano.",
      "• Obligacje indeksowane inflacją (w Polsce detaliczne COI i EDO) – oprocentowanie po pierwszym roku podąża za wskaźnikiem CPI plus marża.",
      "• Akcje – w długim terminie historycznie wyprzedzały inflację, bo spółki mogą podnosić ceny, ale w krótkim okresie gwałtowny wzrost inflacji i stóp procentowych często im szkodzi.",
      "## Wniosek dla inwestora",
      "Każdy cel finansowy – emerytura, mieszkanie, edukacja dzieci – warto planować w złotówkach o dzisiejszej sile nabywczej. Zysk 5% rocznie przy inflacji 4% to zupełnie inna inwestycja niż ten sam zysk przy inflacji 1%.",
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
    title: "Procent składany — dlaczego czas jest Twoim sojusznikiem",
    summary:
      "Gdy zyski są reinwestowane, zarabiają kolejne zyski. Po 30 latach przy 7% rocznie kapitał rośnie ponad 7,6 razy — najważniejszym składnikiem jest czas.",
    category: "Podstawy",
    language: "pl",
    author: AUTHOR,
    content: [
      "Procent składany (kapitalizacja złożona) polega na tym, że odsetki lub zyski nie są wypłacane, lecz dopisywane do kapitału i w kolejnym okresie same zaczynają pracować. Wzór jest prosty: wartość końcowa = kapitał × (1 + r)^n, gdzie r to roczna stopa zwrotu, a n liczba lat.",
      "## Liczby, które robią wrażenie",
      "Załóżmy jednorazową inwestycję 10 000 zł przy średniej stopie zwrotu 7% rocznie:",
      "• po 10 latach: ok. 19 672 zł,",
      "• po 20 latach: ok. 38 697 zł,",
      "• po 30 latach: ok. 76 123 zł.",
      "W pierwszej dekadzie kapitał rośnie o niecałe 10 tys. zł, w trzeciej – o ponad 37 tys. zł. Wzrost przyspiesza, bo coraz większa część zysku to „odsetki od odsetek”.",
      "## Regularne wpłaty",
      "Ten sam mechanizm działa przy systematycznym oszczędzaniu. Wpłacając 500 zł miesięcznie przy 7% rocznie, po 20 latach można uzbierać ok. 262 tys. zł (z czego 120 tys. zł to wpłaty), a po 30 latach – ok. 614 tys. zł (przy wpłatach 180 tys. zł). Dodatkowe 10 lat oszczędzania więcej niż podwaja wynik.",
      "## Reguła 72",
      "Szybki sposób na oszacowanie, kiedy kapitał się podwoi: podziel 72 przez roczną stopę zwrotu w procentach. Przy 6% rocznie podwojenie zajmie ok. 72 / 6 = 12 lat (dokładnie: 1,06^12 ≈ 2,01). Ta sama reguła działa w drugą stronę – przy inflacji 6% siła nabywcza gotówki spada o połowę w około 12 lat.",
      "## Haczyki",
      "• Procent składany działa też na koszty: opłata 1% rocznie po 30 latach zabiera znaczną część wyniku (więcej w artykule o kosztach).",
      "• Stopy zwrotu z akcji nie są stałe – 7% to średnia, a pojedyncze lata mogą przynieść −30% lub +30%.",
      "• Wypłacanie zysków albo panika i sprzedaż w czasie spadków przerywa efekt składania.",
      "Jeremy Siegel w „Stocks for the Long Run” pokazuje, że w okresach kilkudziesięcioletnich akcje amerykańskie przynosiły realnie ok. 6–7% rocznie. Kluczem nie był genialny wybór momentu, ale wytrwałość.",
    ],
    sources: [
      {
        author: "Jeremy J. Siegel",
        title: "Stocks for the Long Run (wyd. 6)",
        publisher: "McGraw-Hill",
        year: 2022,
      },
      {
        author: "Zvi Bodie, Alex Kane, Alan J. Marcus",
        title: "Investments (wyd. 12), rozdz. o wartości pieniądza w czasie",
        publisher: "McGraw-Hill Education",
        year: 2021,
      },
      {
        author: "Morgan Housel",
        title: "The Psychology of Money",
        publisher: "Harriman House",
        year: 2020,
      },
    ],
  },
  {
    id: "edu-09",
    title: "Psychologia inwestowania: emocje kontra plan",
    summary:
      "Awersja do strat, nadmierna pewność siebie i owczy pęd to dobrze zbadane błędy poznawcze. Badania pokazują, że inwestorzy handlujący najczęściej osiągają najgorsze wyniki.",
    category: "Psychologia",
    language: "pl",
    author: AUTHOR,
    content: [
      "Klasyczna ekonomia zakładała, że inwestorzy są racjonalni. Psycholodzy Daniel Kahneman i Amos Tversky pokazali, że w warunkach niepewności ludzie systematycznie popełniają te same błędy. Za te badania Kahneman otrzymał w 2002 roku Nagrodę Nobla z ekonomii.",
      "## Awersja do strat",
      "Według teorii perspektywy (1979) strata boli mocniej, niż cieszy zysk tej samej wielkości – w badaniach mniej więcej dwukrotnie. Dlatego wielu inwestorów woli nie sprzedawać akcji ze stratą, licząc na „odrobienie”, a jednocześnie zbyt szybko realizuje niewielkie zyski. Zjawisko to nazwano efektem dyspozycji (Shefrin i Statman, 1985).",
      "## Nadmierna pewność siebie",
      "Brad Barber i Terrance Odean przeanalizowali transakcje ponad 66 tysięcy gospodarstw domowych w amerykańskim domu maklerskim w latach 1991–1996. Rachunki obracające portfelem najczęściej osiągnęły średnio ok. 11,4% rocznie, podczas gdy rynek dał ok. 17,9%. Tytuł ich pracy mówi wszystko: „Handlowanie jest szkodliwe dla Twojego majątku”. Częste transakcje generowały koszty, a nie przewagę.",
      "## Inne pułapki",
      "• Zakotwiczenie – przywiązanie do ceny zakupu, która dla rynku nie ma żadnego znaczenia.",
      "• Owczy pęd – kupowanie tego, co ostatnio mocno rosło, bo „wszyscy kupują”.",
      "• Efekt potwierdzenia – szukanie wyłącznie informacji zgodnych z własną tezą.",
      "• Złudzenie kontroli – przekonanie, że częste śledzenie notowań poprawia wyniki.",
      "## Myślenie szybkie i wolne",
      "Kahneman opisuje dwa systemy myślenia: szybki, intuicyjny i emocjonalny (System 1) oraz powolny i analityczny (System 2). Decyzje inwestycyjne podejmowane pod wpływem nagłówków i czerwonych liczb na ekranie to domena Systemu 1. Najskuteczniejszą obroną jest przeniesienie decyzji do Systemu 2, zanim pojawią się emocje.",
      "## Jak się chronić?",
      "• Spisz plan inwestycyjny: cel, horyzont, podział aktywów i zasady rebalansowania.",
      "• Ustal z góry, w jakiej sytuacji sprzedasz – i trzymaj się tego.",
      "• Ogranicz sprawdzanie portfela; im częściej patrzysz, tym częściej widzisz straty.",
      "• Prowadź dziennik decyzji – zapisuj, dlaczego kupujesz. Po czasie łatwo ocenić, co było analizą, a co emocją.",
      "Symulator to bezpieczne miejsce, by zaobserwować własne reakcje na spadki, zanim w grę wejdą prawdziwe pieniądze.",
    ],
    sources: [
      {
        author: "Daniel Kahneman",
        title: "Thinking, Fast and Slow (wyd. pol. „Pułapki myślenia. O myśleniu szybkim i wolnym”, Media Rodzina 2012)",
        publisher: "Farrar, Straus and Giroux",
        year: 2011,
      },
      {
        author: "Daniel Kahneman, Amos Tversky",
        title: "Prospect Theory: An Analysis of Decision under Risk",
        publisher: "Econometrica, 47(2), 263–291",
        year: 1979,
        url: "https://doi.org/10.2307/1914185",
      },
      {
        author: "Brad M. Barber, Terrance Odean",
        title: "Trading Is Hazardous to Your Wealth: The Common Stock Investment Performance of Individual Investors",
        publisher: "The Journal of Finance, 55(2), 773–806",
        year: 2000,
        url: "https://doi.org/10.1111/0022-1082.00226",
      },
      {
        author: "Hersh Shefrin, Meir Statman",
        title: "The Disposition to Sell Winners Too Early and Ride Losers Too Long",
        publisher: "The Journal of Finance, 40(3), 777–790",
        year: 1985,
      },
    ],
  },
  {
    id: "edu-10",
    title: "Koszty i podatki — cichy wróg stopy zwrotu",
    summary:
      "Prowizje, opłaty za zarządzanie i podatek od zysków kapitałowych potrafią pochłonąć znaczną część wyniku. IKE i IKZE pozwalają legalnie ograniczyć podatek.",
    category: "Koszty i podatki",
    language: "pl",
    author: AUTHOR,
    content: [
      "Stopy zwrotu są niepewne, koszty – pewne. John Bogle nazywał to „tyranią składanych kosztów”: opłaty pobierane co roku pomniejszają kapitał, który mógłby dalej pracować, więc ich wpływ rośnie wykładniczo z czasem.",
      "## Rodzaje kosztów",
      "• Prowizja maklerska – pobierana przy każdym kupnie i sprzedaży.",
      "• Spread – różnica między najlepszą ofertą kupna i sprzedaży; ukryty koszt, szczególnie przy mało płynnych spółkach.",
      "• Opłata za zarządzanie funduszem (TER) – pobierana codziennie z wartości aktywów, niewidoczna na rachunku.",
      "• Przewalutowanie – przy zakupie zagranicznych papierów.",
      "• Opłaty za prowadzenie rachunku lub przechowywanie papierów.",
      "## Ile to kosztuje naprawdę?",
      "Załóżmy 10 000 zł zainwestowane na 30 lat przy rynkowej stopie zwrotu 7% rocznie. Jeśli fundusz pobiera 1% rocznie, inwestor realnie zarabia 6% i kończy z ok. 57,4 tys. zł. Przy opłacie 0,2% (stopa netto 6,8%) wynik to ok. 72,0 tys. zł. Różnica 0,8 punktu procentowego rocznie to ponad 14 tys. zł – więcej niż wpłacony kapitał.",
      "## Podatek od zysków kapitałowych",
      "W Polsce zyski ze sprzedaży papierów wartościowych, dywidendy i odsetki są opodatkowane zryczałtowanym podatkiem 19%, potocznie zwanym „podatkiem Belki” (ustawa o podatku dochodowym od osób fizycznych, art. 30a i 30b). Podatek od dywidend i odsetek zwykle pobiera płatnik, np. dom maklerski lub bank. Zyski ze sprzedaży akcji rozlicza się samodzielnie w zeznaniu PIT-38 do 30 kwietnia kolejnego roku – przy czym straty z poprzednich lat można w określonych granicach odliczyć.",
      "## IKE i IKZE",
      "Ustawa o indywidualnych kontach emerytalnych oraz indywidualnych kontach zabezpieczenia emerytalnego daje dwie formy ulgi podatkowej:",
      "• IKE – po spełnieniu warunków (m.in. wypłata po 60. roku życia) zyski są całkowicie zwolnione z podatku od zysków kapitałowych.",
      "• IKZE – wpłaty można odliczyć od podstawy opodatkowania w PIT, a przy wypłacie po 65. roku życia płaci się zryczałtowany podatek 10%.",
      "Na oba konta obowiązują roczne limity wpłat ogłaszane co roku – sprawdź aktualne wartości przed wpłatą.",
      "## Wnioski",
      "Nie masz wpływu na to, co zrobi rynek, ale masz pełny wpływ na koszty. Porównuj TER funduszy, unikaj zbędnych transakcji i korzystaj z kont z ulgą podatkową, jeśli inwestujesz długoterminowo. Niniejszy tekst ma charakter edukacyjny i nie stanowi porady podatkowej.",
    ],
    sources: [
      {
        author: "John C. Bogle",
        title: "The Little Book of Common Sense Investing (wyd. jubileuszowe)",
        publisher: "Wiley",
        year: 2017,
      },
      {
        author: "Sejm RP",
        title: "Ustawa z dnia 26 lipca 1991 r. o podatku dochodowym od osób fizycznych (art. 30a, 30b)",
        publisher: "Internetowy System Aktów Prawnych",
        year: 1991,
        url: "https://isap.sejm.gov.pl",
      },
      {
        author: "Sejm RP",
        title: "Ustawa z dnia 20 kwietnia 2004 r. o indywidualnych kontach emerytalnych oraz indywidualnych kontach zabezpieczenia emerytalnego",
        publisher: "Internetowy System Aktów Prawnych",
        year: 2004,
        url: "https://isap.sejm.gov.pl",
      },
    ],
  },
  {
    id: "edu-11",
    title: "Czy da się pokonać rynek? Hipoteza rynku efektywnego",
    summary:
      "Jeśli ceny szybko uwzględniają nowe informacje, systematyczne pokonywanie rynku jest bardzo trudne. Nobel z 2013 roku nagrodził zarówno zwolennika, jak i krytyka tej idei.",
    category: "Teoria rynku",
    language: "pl",
    author: AUTHOR,
    content: [
      "Hipotezę rynku efektywnego (EMH) sformułował w najbardziej znanej postaci Eugene Fama w 1970 roku. Mówi ona, że ceny papierów wartościowych odzwierciedlają dostępne informacje. Jeśli tak jest, nie da się w przewidywalny sposób zarabiać więcej niż rynek, korzystając z tych informacji – bo są już „w cenie”.",
      "## Trzy formy efektywności",
      "• Słaba – ceny zawierają całą informację z historycznych notowań. Analiza samych wykresów nie daje trwałej przewagi.",
      "• Półsilna – ceny uwzględniają wszystkie publicznie dostępne informacje: raporty, wiadomości, dane makro. Nie pomaga też analiza fundamentalna oparta na publicznych danych.",
      "• Silna – ceny odzwierciedlają nawet informacje poufne. Ta wersja jest powszechnie uważana za nieprawdziwą – dlatego handel na informacjach poufnych jest zakazany i ścigany.",
      "## Argumenty za",
      "Na rynku działają tysiące profesjonalistów, którzy konkurują o każdą przewagę. Okazje są szybko wykorzystywane i znikają. Dowodem są statystyki funduszy aktywnych: większość z nich w długim okresie nie pokonuje swoich indeksów (raporty SPIVA). Burton Malkiel ujął to obrazowo: małpa rzucająca strzałkami w strony z notowaniami wybrałaby portfel nie gorszy niż przeciętny ekspert.",
      "## Argumenty przeciw",
      "Robert Shiller wykazał, że ceny akcji wahają się znacznie silniej, niż uzasadniałyby to późniejsze zmiany dywidend, a rynki regularnie przeżywają bańki – jak bańka internetowa z przełomu wieków, którą opisał w „Irrational Exuberance”. Finanse behawioralne dokumentują też anomalie, np. efekt momentum. W 2013 roku Nagrodę Nobla otrzymali jednocześnie Fama, Shiller i Lars Peter Hansen – co dobrze oddaje, że obie strony mają rację w części.",
      "## Co z tego wynika dla Ciebie?",
      "Rynek nie musi być idealnie efektywny, by był „wystarczająco efektywny” dla inwestora indywidualnego. Nawet jeśli istnieją nieefektywności, wykorzystanie ich wymaga czasu, wiedzy i niskich kosztów, a konkurujesz z profesjonalistami. Dla większości osób rozsądną strategią bazową jest szeroko zdywersyfikowany, tani portfel, a aktywne pomysły – jeśli w ogóle – tylko jako jego mniejsza część.",
    ],
    sources: [
      {
        author: "Eugene F. Fama",
        title: "Efficient Capital Markets: A Review of Theory and Empirical Work",
        publisher: "The Journal of Finance, 25(2), 383–417",
        year: 1970,
        url: "https://doi.org/10.2307/2325486",
      },
      {
        author: "Robert J. Shiller",
        title: "Irrational Exuberance",
        publisher: "Princeton University Press",
        year: 2000,
      },
      {
        author: "Burton G. Malkiel",
        title: "A Random Walk Down Wall Street (wyd. 13)",
        publisher: "W. W. Norton & Company",
        year: 2023,
      },
    ],
  },
  {
    id: "edu-12",
    title: "Wskaźniki wyceny: C/Z, C/WK i stopa dywidendy",
    summary:
      "Wskaźniki wyceny pozwalają porównać cenę spółki z jej zyskami, majątkiem czy dywidendą. Są punktem wyjścia do analizy, a nie gotową odpowiedzią.",
    category: "Analiza fundamentalna",
    language: "pl",
    author: AUTHOR,
    content: [
      "Sama cena akcji nic nie mówi – akcja za 20 zł może być droga, a za 2000 zł tania. Aby ocenić wycenę, porównuje się kapitalizację spółki (cena × liczba akcji) z jej wynikami finansowymi. Służą do tego wskaźniki, które znajdziesz w raportach i serwisach giełdowych.",
      "## C/Z (P/E) – cena do zysku",
      "Cena akcji podzielona przez zysk netto na akcję z ostatnich 12 miesięcy. C/Z równe 15 oznacza, że płacisz 15 zł za każdą złotówkę rocznego zysku. Wysokie C/Z może świadczyć o oczekiwaniach szybkiego wzrostu albo o przewartościowaniu; niskie – o okazji albo o problemach, których rynek się obawia. Zysk bywa jednorazowo zawyżony lub zaniżony, dlatego warto patrzeć na kilka lat.",
      "Robert Shiller zaproponował wskaźnik CAPE: cenę dzieloną przez średni zysk z 10 lat, skorygowany o inflację. Wygładza on wahania koniunktury i jest stosowany głównie do oceny wyceny całego rynku.",
      "## C/WK (P/BV) – cena do wartości księgowej",
      "Porównuje kapitalizację z kapitałem własnym z bilansu (aktywa minus zobowiązania). Wskaźnik ma sens zwłaszcza dla banków i ubezpieczycieli, których majątek to głównie aktywa finansowe. Dla firm technologicznych, których wartość tkwi w ludziach i know-how, jest mało miarodajny.",
      "## Stopa dywidendy",
      "Roczna dywidenda na akcję podzielona przez cenę akcji. Stopa 5% oznacza, że przy niezmienionej cenie dostajesz 5% rocznie w gotówce (przed podatkiem 19%). Bardzo wysoka stopa bywa pułapką – czasem wynika z gwałtownego spadku kursu, który zapowiada obniżenie dywidendy.",
      "## Inne przydatne miary",
      "• ROE – zwrot z kapitału własnego: ile zysku spółka wypracowuje z kapitału akcjonariuszy.",
      "• EV/EBITDA – wartość całego przedsiębiorstwa (z długiem) do zysku operacyjnego przed amortyzacją; ułatwia porównywanie firm o różnym zadłużeniu.",
      "• Dług netto / EBITDA – ile lat zysku operacyjnego potrzeba na spłatę zadłużenia.",
      "## Zasady porównań",
      "Benjamin Graham zalecał inwestorom defensywnym spółki o umiarkowanym C/Z i C/WK, stabilnych zyskach i długiej historii dywidend. Aswath Damodaran przypomina z kolei, że wskaźniki porównuje się w obrębie tej samej branży i w kontekście tempa wzrostu oraz ryzyka. Wskaźnik to pytanie („dlaczego jest tak nisko/wysoko?”), a nie odpowiedź.",
    ],
    sources: [
      {
        author: "Benjamin Graham",
        title: "The Intelligent Investor (wyd. popr., komentarz Jason Zweig)",
        publisher: "HarperBusiness",
        year: 2003,
      },
      {
        author: "Aswath Damodaran",
        title: "Investment Valuation: Tools and Techniques for Determining the Value of Any Asset (wyd. 3)",
        publisher: "Wiley",
        year: 2012,
      },
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
      "Na giełdzie kupujesz od innego inwestora poprzez arkusz zleceń. Rodzaj zlecenia decyduje o tym, po jakiej cenie i czy w ogóle zostanie zrealizowane.",
    category: "Podstawy",
    language: "pl",
    author: AUTHOR,
    content: [
      "Giełda to miejsce, w którym spotykają się zlecenia kupna i sprzedaży. Na GPW notowania odbywają się w systemie transakcyjnym UTP, a inwestor indywidualny składa zlecenia za pośrednictwem domu maklerskiego. Wszystkie oczekujące zlecenia trafiają do arkusza zleceń, uporządkowanego według ceny i czasu złożenia.",
      "## Arkusz zleceń i spread",
      "Po jednej stronie arkusza są oferty kupna (bid), po drugiej – sprzedaży (ask). Różnica między najlepszą ofertą sprzedaży a najlepszą ofertą kupna to spread. W dużych, płynnych spółkach wynosi on często grosz lub kilka groszy; w małych spółkach może sięgać kilku procent, co jest realnym kosztem przy każdej transakcji.",
      "## Płynność",
      "Płynność to łatwość zawarcia transakcji bez istotnego wpływu na cenę. Mierzy się ją m.in. wartością obrotu i głębokością arkusza. Przy niskiej płynności duże zlecenie „zjada” kolejne poziomy cen i transakcja wypada znacznie drożej, niż sugerował ostatni kurs.",
      "## Podstawowe rodzaje zleceń na GPW",
      "• Zlecenie z limitem ceny – określasz maksymalną cenę kupna lub minimalną cenę sprzedaży. Masz kontrolę nad ceną, ale zlecenie może się nie zrealizować.",
      "• PKC (po każdej cenie) – realizowane natychmiast po cenach dostępnych w arkuszu. Gwarantuje wykonanie, ale nie cenę – ryzykowne przy niskiej płynności.",
      "• PCR (po cenie rynkowej) – realizowane po najlepszej dostępnej cenie, z pozostałą częścią zamienianą w zlecenie z limitem.",
      "• Stop loss / stop limit – zlecenia z limitem aktywacji, uruchamiane dopiero po osiągnięciu określonego kursu; służą m.in. do ograniczania strat.",
      "Zlecenia mają też termin ważności, np. do końca sesji, do określonej daty albo do anulowania, a także warunki wykonania, np. „wykonaj i anuluj”.",
      "## Fazy sesji",
      "Sesja na rynku kasowym GPW zaczyna się od fazy przed otwarciem, w której zbierane są zlecenia, a kurs otwarcia wyznacza się na fixingu. Potem trwają notowania ciągłe, a sesję kończy faza przed zamknięciem i fixing wyznaczający kurs zamknięcia. Godziny poszczególnych faz publikuje GPW w szczegółowych zasadach obrotu.",
      "## Wskazówki praktyczne",
      "• W mniej płynnych spółkach używaj zleceń z limitem ceny.",
      "• Sprawdzaj arkusz, zanim złożysz duże zlecenie.",
      "• Pamiętaj, że rozliczenie transakcji na GPW następuje w cyklu T+2 – akcje i pieniądze zmieniają właściciela dwa dni robocze po transakcji.",
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
      {
        author: "Komisja Nadzoru Finansowego",
        title: "Edukacja – rynek kapitałowy",
        publisher: "KNF",
        year: 2024,
        url: "https://www.knf.gov.pl",
      },
    ],
  },
  {
    id: "edu-14",
    title: "Plan inwestycyjny: cel, horyzont, alokacja i rebalansowanie",
    summary:
      "Spisany plan chroni przed decyzjami pod wpływem emocji. Określa cel, horyzont, podział aktywów i zasady jego korygowania — zanim rynek zacznie się wahać.",
    category: "Portfel",
    language: "pl",
    author: AUTHOR,
    content: [
      "Profesjonalni zarządzający pracują według dokumentu nazywanego polityką inwestycyjną (Investment Policy Statement, IPS). CFA Institute zaleca, by również inwestorzy indywidualni spisywali własną, prostą wersję. Plan nie przewiduje przyszłości, ale z góry odpowiada na pytanie, co zrobisz, gdy rynek zachowa się nieprzyjemnie.",
      "## 1. Fundament: poduszka finansowa",
      "Zanim zaczniesz inwestować, zgromadź rezerwę na nieprzewidziane wydatki – zwykle przyjmuje się równowartość 3–6 miesięcy kosztów życia – w bezpiecznym i dostępnym miejscu. Dzięki niej nie będziesz zmuszony sprzedawać inwestycji w najgorszym momencie.",
      "## 2. Cel i horyzont",
      "Określ, na co inwestujesz i kiedy będziesz potrzebować pieniędzy. Im dłuższy horyzont, tym więcej czasu na odrobienie spadków i tym większy udział akcji można rozważyć. Pieniądze potrzebne w ciągu 1–3 lat zwykle nie powinny być narażone na ryzyko akcyjne.",
      "## 3. Alokacja aktywów",
      "Podział między akcje, obligacje i gotówkę w największym stopniu decyduje o ryzyku i oczekiwanym wyniku portfela – bardziej niż wybór konkretnych spółek. Przykładowo portfel 60/40 (akcje/obligacje) jest znacznie spokojniejszy niż 100% w akcjach, ale też ma niższy oczekiwany zwrot.",
      "## 4. Jednorazowo czy stopniowo?",
      "Badanie Vanguard z 2012 roku porównało inwestowanie całej kwoty od razu z rozkładaniem zakupów w czasie (uśrednianie, DCA). Na rynkach USA, Wielkiej Brytanii i Australii jednorazowa inwestycja dawała lepszy wynik w około dwóch trzecich przypadków – bo rynki częściej rosną, niż spadają. Uśrednianie zmniejsza jednak ryzyko żalu i jest naturalne, gdy inwestujesz z bieżących dochodów.",
      "## 5. Rebalansowanie",
      "Z czasem portfel „dryfuje”: po hossie akcje zajmują większą część, niż zakładał plan. Rebalansowanie to przywracanie docelowych proporcji – np. raz w roku albo gdy udział klasy aktywów odchyli się o więcej niż 5 punktów procentowych. Wymusza ono dyscyplinę: sprzedajesz to, co zdrożało, i dokupujesz to, co potaniało.",
      "## 6. Zasady na trudne chwile",
      "Zapisz, czego nie zrobisz: np. „nie sprzedaję w panice po spadku o 20%”. Kiedy rynek spada, łatwiej trzymać się decyzji podjętej na spokojnie niż wymyślać strategię pod presją.",
      "## Przykładowy szkielet planu",
      "• Cel: wkład własny na mieszkanie za 8 lat.",
      "• Alokacja: 50% globalne akcje, 40% obligacje skarbowe, 10% gotówka.",
      "• Wpłaty: 800 zł miesięcznie, automatycznie po wypłacie.",
      "• Rebalansowanie: raz w roku, w styczniu.",
      "• Przegląd planu: przy zmianie celu lub sytuacji życiowej, nie przy zmianie nastrojów na rynku.",
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
        publisher: "Financial Analysts Journal, 42(4), 39–44",
        year: 1986,
      },
      {
        author: "Morgan Housel",
        title: "The Psychology of Money",
        publisher: "Harriman House",
        year: 2020,
      },
    ],
  },
];
