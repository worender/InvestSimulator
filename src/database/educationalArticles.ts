/**
 * Mock wygenerowany przez AI
 */

export type EducationalArticle = {
  id: string;
  title: string;
  summary: string;
  content: readonly string[];
  readMinutes: number;
  language: "pl" | "en";
  author: string;
};

const AUTHOR = "Redakcja InvestSimulator";

export const EDUCATIONAL_ARTICLES: readonly EducationalArticle[] = [
  {
    id: "edu-01",
    title: "Czym jest akcja i skąd bierze się jej wartość?",
    summary:
      "Akcja to ułamek firmy. Jej cena zależy od oczekiwań rynku co do przyszłych zysków.",
    readMinutes: 4,
    language: "pl",
    author: AUTHOR,
    content: [
      "Akcja to papier wartościowy potwierdzający udział w kapitale spółki. Kupując jedną akcję, stajesz się współwłaścicielem przedsiębiorstwa — masz prawo do części zysków oraz do głosu na walnym zgromadzeniu, choć zwykle nie wpływasz na bieżące decyzje zarządu.",
      "Wartość akcji wynika przede wszystkim z oczekiwań dotyczących przyszłych przepływów pieniężnych firmy. Inwestorzy wyceniają ją na podstawie zysków, tempa wzrostu, zadłużenia, jakości zarządu i warunków panujących w całej gospodarce. Krótkoterminowo na cenę mocno wpływają emocje i podaż pieniądza, dlatego kurs potrafi odbiegać od fundamentów.",
      "Pamiętaj, że posiadanie akcji wiąże się z ryzykiem — firma może przynieść straty, a kurs może spaść bardziej niż oczekiwałeś. Właśnie dlatego warto rozumieć biznes, w który inwestujesz, zamiast kupować wyłącznie na podstawie wykresu.",
    ],
  },
  {
    id: "edu-02",
    title: "Ryzyko a stopa zwrotu — dlaczego nie ma darmowych obiadów",
    summary:
      "Wyższy potencjalny zysk prawie zawsze oznacza większą zmienność i ryzyko straty.",
    readMinutes: 4,
    language: "pl",
    author: AUTHOR,
    content: [
      "W inwestowaniu ryzyko i oczekiwana stopa zwrotu idą w parze. Instrumenty o wysokim potencjale zysku — akcje spółek wzrostowych, surowce czy kryptowaluty — charakteryzują się większą zmiennością. Bezpieczniejsze aktywa, takie jak obligacje skarbowe, oferują niższy, ale bardziej przewidywalny zwrot.",
      "Ryzyko nie oznacza wyłącznie straty. To również niepewność co do terminu i wysokości zysku, ryzyko płynności (trudność sprzedaży) oraz ryzyko walutowe. Dwa portfele mogą mieć identyczną średnią stopę zwrotu, a zupełnie różne drogi do jej osiągnięcia.",
      "Dobry inwestor nie unika ryzyka całkowicie — zarządza nim. Ustala horyzont, wielkość pozycji i maksymalny akceptowalny spadek wartości portfela, a następnie dobiera instrumenty tak, aby mieściły się w tych granicach.",
    ],
  },
  {
    id: "edu-03",
    title: "Dywersyfikacja portfela w praktyce",
    summary:
      "Rozkładanie kapitału na różne aktywa zmniejsza wpływ jednej decyzji na cały portfel.",
    readMinutes: 5,
    language: "pl",
    author: AUTHOR,
    content: [
      "Dywersyfikacja to strategia polegająca na rozłożeniu kapitału między różne instrumenty, branże i regiony. Jej celem nie jest maksymalizacja zysku, lecz ograniczenie ryzyka — gdy jedna inwestycja zawiedzie, pozostałe mogą to złagodzić.",
      "Prawdziwa dywersyfikacja wymaga aktywów, które reagują na różne czynniki. Posiadanie dziesięciu spółek technologicznych to nadal duża koncentracja. Lepiej łączyć akcje różnych sektorów z obligacjami, a część kapitału trzymać w gotówce na okazje lub nagłe wydatki.",
      "Uwaga na pozorną dywersyfikację: dwa ETF-y śledzące ten sam indeks albo kilka funduszy zarządzanych przez jedną instytucję mogą mieć bardzo podobną ekspozycję. Sprawdzaj, co dokładnie znajduje się w środku, zanim uznasz portfel za zróżnicowany.",
    ],
  },
  {
    id: "edu-04",
    title: "Jak czytać wykres świecowy?",
    summary:
      "Świeca pokazuje cztery ceny dnia: otwarcie, zamknięcie, maksimum i minimum.",
    readMinutes: 5,
    language: "pl",
    author: AUTHOR,
    content: [
      "Świeca to jeden z najpopularniejszych sposobów prezentacji danych rynkowych. Każda świeca odpowiada wybranemu przedziałowi czasu — może to być minuta, godzina, dzień lub tydzień. Pokazuje cenę otwarcia, zamknięcia, maksymalną i minimalną w tym okresie.",
      "Korpus świecy powstaje między ceną otwarcia a zamknięcia. Gdy zamknięcie jest wyższe od otwarcia, świeca jest zwykle zielona lub biała — rynek zakończył okres wzrostem. Cień (knot) pokazuje zakres wahań poza korpusem i informuje, gdzie pojawiła się presja kupujących lub sprzedających.",
      "Pojedyncza świeca nie jest sygnałem samym w sobie. Znaczenie zyskuje w kontekście trendu, wolumenu i poziomów wsparcia czy oporu. Zanim podejmiesz decyzję, sprawdź szerszy obraz rynku i nie opieraj całej strategii na jednym wzorze.",
    ],
  },
  {
    id: "edu-05",
    title: "Obligacje — pożyczka, która może zarabiać",
    summary:
      "Kupując obligację, pożyczasz pieniądze emitentowi w zamian za odsetki.",
    readMinutes: 4,
    language: "pl",
    author: AUTHOR,
    content: [
      "Obligacja to instrument dłużny. Inwestor przekazuje emitentowi kapitał, a ten zobowiązuje się do wypłaty odsetek i zwrotu nominału w ustalonym terminie. Emitentem może być państwo, samorząd lub przedsiębiorstwo.",
      "Cena obligacji na rynku wtórnym zmienia się odwrotnie do stóp procentowych: gdy stopy rosną, ceny starszych obligacji o niższym oprocentowaniu spadają. Dochodzi do tego ryzyko kredytowe emitenta — im mniejsza wiarygodność, tym wyższe odsetki, ale też większa szansa na problemy z wypłatą.",
      "Obligacje często pełnią w portfelu rolę stabilizatora. Nie eliminują ryzyka, ale mogą ograniczać zmienność całości i zapewnić przewidywalny strumień odsetek. Przed zakupem sprawdź termin wykupu, oprocentowanie i sposób opodatkowania.",
    ],
  },
  {
    id: "edu-06",
    title: "ETF-y i fundusze indeksowe — proste narzędzie dywersyfikacji",
    summary:
      "Jeden ETF potrafi dać ekspozycję na setki spółek z wybranego rynku.",
    readMinutes: 4,
    language: "pl",
    author: AUTHOR,
    content: [
      "ETF (Exchange Traded Fund) to fundusz notowany na giełdzie, który zwykle odwzorowuje wybrany indeks. Kupując jedną jednostkę, zyskujesz udział w całym koszyku aktywów — na przykład w największych spółkach amerykańskich lub europejskich.",
      "Fundusze indeksowe nie próbują „pobić rynku”. Ich celem jest możliwie wierne odtworzenie wyników indeksu przy niskich kosztach. To właśnie koszty — opłata za zarządzanie, spread i podatki — w długim terminie najmocniej różnicują podobne produkty.",
      "ETF-y są wygodne, ale nie są wolne od ryzyka. Mogą tracić razem z całym rynkiem, a niektóre wersje stosują dźwignię lub egzotyczne indeksy. Sprawdź skład, opłatę TER, walutę rozliczenia i płynność, zanim uznasz produkt za bezpieczny.",
    ],
  },
  {
    id: "edu-07",
    title: "Inflacja a realna wartość pieniądza",
    summary:
      "Zysk nominalny nie wystarczy — liczy się to, ile realnie możesz kupić.",
    readMinutes: 4,
    language: "pl",
    author: AUTHOR,
    content: [
      "Inflacja oznacza wzrost ogólnego poziomu cen. Jeśli Twoje oszczędności rosną o 3% rocznie, a ceny rosną o 5%, realna siła nabywcza Twojego kapitału spada — mimo że na koncie widzisz większą kwotę.",
      "Realną stopę zwrotu przybliżamy, odejmując inflację od stopy nominalnej. W długim horyzoncie nawet niewielka różnica ma ogromne znaczenie. Gotówka trzymana „na wszelki wypadek” jest bezpieczna nominalnie, ale traci wartość realnie.",
      "Dlatego planując cele, myśl w kategoriach siły nabywczej. Uwzględnij inflację w prognozach i wybieraj instrumenty, które historycznie dawały dodatnią realną stopę zwrotu — choć żaden wynik z przeszłości nie gwarantuje przyszłości.",
    ],
  },
  {
    id: "edu-08",
    title: "Procent składany — dlaczego czas jest Twoim sojusznikiem",
    summary:
      "Odsetki naliczane od odsetek sprawiają, że kapitał rośnie coraz szybciej.",
    readMinutes: 3,
    language: "pl",
    author: AUTHOR,
    content: [
      "Procent składany polega na tym, że zysk z inwestycji również zaczyna pracować. W pierwszym roku zarabiasz od kapitału początkowego, w kolejnym — od kapitału powiększonego o wcześniejsze zyski. Efekt jest początkowo mało widoczny, ale z czasem przyspiesza.",
      "Największym sprzymierzeńcem procentu składanego jest czas, a największym wrogiem — wysokie koszty i częste zmiany strategii. Regularne, nawet niewielkie wpłaty potrafią w kilkunastoletnim horyzoncie zbudować pokaźny kapitał.",
      "Pamiętaj jednak, że mechanizm działa w obie strony: straty także się kumulują, a wysoka zmienność może zniwelować lata starań. Dlatego liczy się nie tylko stopa zwrotu, ale też konsekwencja i ochrona kapitału.",
    ],
  },
  {
    id: "edu-09",
    title: "Psychologia inwestowania: emocje kontra plan",
    summary:
      "Strach i chciwość podejmują decyzje szybciej niż analiza. Plan ogranicza ich wpływ.",
    readMinutes: 5,
    language: "pl",
    author: AUTHOR,
    content: [
      "Największym ryzykiem inwestora często nie jest rynek, lecz on sam. FOMO każe kupować po wzrostach, panika — sprzedawać po spadkach, a nadmierna pewność siebie — zwiększać pozycje bez analizy. Te odruchy są naturalne, ale kosztowne.",
      "Pomaga spisany plan: cel, horyzont, dopuszczalny poziom ryzyka i zasady dokupowania lub sprzedaży. Gdy emocje sięgają zenitu, wracasz do dokumentu, a nie do impulsu. Dobrze działa też automatyzacja regularnych wpłat.",
      "Nie musisz być nieomylny. Wystarczy, że nie podejmujesz decyzji pod wpływem chwili i uczysz się na błędach. Prowadź dziennik inwestycji — zapisuj powód zakupu i sprzedaży, aby po czasie oddzielić szczęście od dobrej decyzji.",
    ],
  },
  {
    id: "edu-10",
    title: "Koszty i podatki — cichy wróg stopy zwrotu",
    summary:
      "Prowizje, spread i podatek od zysków potrafią zjeść znaczną część wyniku.",
    readMinutes: 4,
    language: "pl",
    author: AUTHOR,
    content: [
      "Każda transakcja ma koszt: prowizję brokera, spread między ceną kupna i sprzedaży, opłatę za zarządzanie funduszem. Pojedyncza opłata wydaje się niewielka, ale przy częstym handlu i długim horyzoncie potrafi pochłonąć dużą część zysku.",
      "Podatki działają podobnie. W Polsce zyski z instrumentów kapitałowych są opodatkowane, a strata w jednym miejscu nie zawsze automatycznie kompensuje zysk w innym. Sposób rozliczenia zależy od rodzaju instrumentu i konta.",
      "Przed inwestycją policz koszty całkowite, nie tylko prowizję za zlecenie. Porównuj produkty, ograniczaj niepotrzebne transakcje i pamiętaj, że w długim terminie najwięcej zostaje w portfelu temu, kto płaci rozsądnie.",
    ],
  },
] as const;
