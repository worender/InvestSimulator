# Przewidywana funkcjonalność aplikacji symulacyjnej do inwestowania.

## 0. Logo i nazwa:
Sugeruję zmianę nazwy projektu na bardziej komrecyjną i łapiącą uwagę użytkownika. Preferowany jest skrót, który wyrazi główną funkcjonalność aplikacji oraz jej (edukacyjny) cel. Do tego wypada zadbać o bardzo proste i estetyczne logo: ja myślę tutaj o coś na kszatł litery w jakiej nietypowej czcionce, z charaktertstycznym kolorem.

## 1. Autoryzacja:
- użytkownik będzie mógł uzyskać dostęp do aplikacji na urządzeniu za pomocą: hasła, pinu lub zabezpieczenia biometrycznego
- zapasem dla odblokowania biometrycznego będzie hasło lub pin, które będą wymagane przy uruchomieniu funkcjonalnośći odblokowywania biometrycznego
- ma istnieć możliwość odzyskania konta/hasła za pomocą specjalnego ekranu do jego odzyskiwania (można dodać bajer, że użytkownik przy tworzeniu konta będzie dostawać specjalny kod, który będzie konieczny do podania tutaj właśnie)
- przy próbie zalogowania na dowolne konto system ma się upewnić, czy urządzenie ma dostęp do internetu. W przypadku jego braku musi pojawić się odpowienie powiadomienie i przycisk ponawiający próbę zalogowania się do lokalnego konta na urządzeniu
- każde konto ma swoje hasło logowania (poza gościem, który takiego hasła nie ma)
- nie można usunąć hasła logowania do konta
- hasło można zmieniać
- dodanie obsługi sesji i jej wygasania 

## 2. Konto:
- użytkownik będzie mógł utworzyć na urządzeniu do 5(?) różnych kont (profilów użytkownika), które będą kompletnie niezależne względem siebie
- dodatkowo ma istnieć możliwość otworzenia aplikacji w trybie gościa, którego wadą będzie to, że wszelkie operacje wykonane na tym koncie będą wyzerowane tuż po wyłączeniu aplikacji (lub wypadnięcia z ramu)
- jeśli na urządzeniu dodane są jakiekolwiek konta to w ustawieniach użytkownik będzie mógł przelogować się na inne (jeśli takie zostaną znalezione) ewentualnie wylogować się lub przerzucić na konto gościa (nie wpłynie to na istnienie innych kont)
- do utworzneia konta użytkownika będą wymagane następująće dane: Imię, nazwisko i wiek (data urodzenia), ale również dla personalizacji: zdjęcie profilowe, numer telefonu, adres zamieszkania, adres do korespondecji, email, płeć, ulubiony kolor :).
- zdjęcie profilowe może zostać dodane z zasobów telefonu lub zostać zrobione apartem w trakcie zakładania konta
- konto nie jest tym samym co portfel/portfolio. Na jednym koncie użytkownik może mieć wiele różnych portfeli (różne waluty) [do 5(?)]
- w ustawieniach aplikacji ma być możliwość zablokowania konta (wyłączenia) lub jego całkowitego usunięcia
- konta nie będą synchronizowane między platofrmami, a aplikacja będzie funckjonować tylko lokalnie (baza danych lokalna). Niemniej dostęp do internetu jest wymagany
- założenie konta wiązać się będzie z koniecznością zapozniania się z przykładowym regulaminem podobnych serwisów + z adnotacją, że to tylko aplikacja edukacyjna a nie rzeczywista giełda - rzeczywiste inwestowanie wiążę się z ryzykiem u utratą pięniędzy. Bez akceptacji nie będzie można założyć konta
- każde konto ma niepowtażalny numerID, który pokazany jest w ustawieniach aplikacji > konto (ja)

### 2.A Wygląd panelu zakładnaia konta:
- panel ma mieć na górze wspólny dla kolenych ekranów progress bar z % lub ilością pokonanych kroków
1. podanie podstawowych danych (wymaganych)
2. dodanie zdjęcia profilowego
3. ustawienie domyślnych jednostek i waluty głównej dla konta
4. Dodatkowe opcje
5. Zaakcepotwanie "regulaminu"
6. Dodanie hasła, pinu, zabezpieczenia dostępu autoryzacją biometryczną
7. Weryfikacja danych na ostatnim oknie + przycisk z dodaniem konta na urządzeniu

## 3. Wygląd:
- aplikacja ma mieć różny wygląd charakterystyczny dla danej platformy (mobilna i web)
- aplikacja ma być intuicyjna, wygodna i estetyczna, a także personalizowana pod użytkownika
- zaleca sie, aby tworzone komponenty dodawane do wyglądu było opcjonalne do wyświetlania przez użytkownika - jeśli nie będzie on chciał korzystać z wykresów dla głównego okna, to będzie mógł je usunąć i zastąpić innym komponentem
- nie należy zasypywać wyglądu aplikacji niepotrzebnymi i nieprzebranymi w ilości modułami
- domyślny motyw aplikacji to ciemny. Kolor nie jest ustalony (niebieski?)
- aplikacja mobilna ma mieć takie same funkcjonalności, jak wersja webowa (wiadomo, że design będzie się różnić)
- sugeruje się, aby wygląd aplikacji webowej był zdominowany przez informacje giełdowe i wykresy świecowe w celu łatwiejszego dostępu do analizy rynku. Będzie też duża przestrzeń dostępna dla jawnie widocznej części edukacyjnej aplikacji, o co trudniej będzie dla wersji mobilnej
- W wyglądzie aplikacji mobilnej dominować będą typowe panele do porusznia się po funkcjach aplikacji. Natomiast przewiduje się charakterystyczne dla plaftorm mobilnych: okna modalne, kolejne okna decyzyjne, zagłębianie się w ustwienia...
- wygląd ma być spójny, prosty i zgodny z jakimikolwiek zasadami UI/UX (np. Material od Google)
- KONIECZNE widżety z przychodem aktualnym dla porfela, akcji itd
- KONIECZNY raport (np. pdf) z zestawieniem dokonanych zakupów i sprzedaży
- KONIECZNY raport/widżet ze skutecznością portfela dla tyg/miesiąca/3miesięcy/roku

## 4. Funkcje rynkowe/inwestycyjne:
- dostęp do instrumentów oferowanych przez Yahoo-finance-api
- możliwość zakupu i sprzedaży dostępnych w ten sposób instrumentów (akcje, etf, cfd)
- obsługa typowych dla giełdy opcji: sprzedaj gdy cena osiągnie..., zlecenia dla danej kwoty itd...
- symulowanie sprzedaży i zakupu instrumentu (niektóre akcje nie muszą być dostępne natychmiast) oraz rzeczywiste zasymulowanie zamknięcia giełdy - nie da się zakupić akcji przy zamkniętej giełdzie
- nie będzie możliwości obsługi postopen? (kupowania/sprzedaży przy zamkniętej giełdzie)
- Zasymulowanie zakupu obligacji skarobowych (tylko ograniczamy się do Polskich i Europejskich). Problem aktualności oferty rozwiążemy jakimś dodatkowym api lub jakimś curl z internetu
- ma być widok dla bieżących zakupów i ich historii (kiedy, ile i za ile, oczywiście jeszcze, co zostało zakupione)
- ograniczony handel walutami (albo w ogóle?)
- zakup instrumentu ma być obciążony kosztem przewalutowania (Np. dla konta w zł i zakupie w euro lub na odwrót)
- istnieje możliwość zakupu częściowego udziału w akcje i etf'y (prób 0.01)
- aktualne wartości przewalutowań (ceny EURUSD, PLNUSD itd.)
- możliwość ustawienia automatycznego zakupu instrumentu (harmonogram)
- tworzenie wielu portfolio dla konta (USD, EUR, PLN), ale nie więcej niż 5 łącznie
- rozdzielenie funkcjonalności obligacji od akcji, etfów i cfd
- symulacja dzienna z przychodu z obligacji (godzinowa/dzienna) kapitalizacja (widok) - bo oczywiście wypłata przed wykupem to strata tak, jak w rzeczywistości (raczej nie uwzględniamy mechanicznie wszystkich związanych z tym procesów, bo jest ich po prostu za dużo)
- utworzenie symulacji (informacyjnie raczej) IKE i IKZE
- istnienie interest rate dla niewykorzystanych na koncie środków
- symulacja wpłacania, wypłacania (pamiętać o podatku belki!) funduszy
- 
- inne?

## 5. Treści edukacyjne:
- przykładowy regulamin założenia podobnego konta w rzeczywistości z wypunktowanymi najważniejszymi elementami takiej umowy
- infromacja o tym, czy jest giełda, akcje, etf, cfd i krypto, obligacje itd...
- dodatkowe informacje o tym, czym są poszczególne strategie inwestowania
- czym jest portfel, jaki to jest portfel konserwatywny, a jaki agresywny
- proponowane kroki zakupowe z case'ami 
- przeprowadzenie ankiety (tuż po założeniu konta), która zweryfikuje, jakie podjeście inwestycyjne ma użytkownik - na tej podstawie będą sugestie (ale zaznaczyć, że to nie są żadne porady inwestycjne!)
- w sekcji news będą przykładowe case'y historyczne pokazujące, jak rzeczywistość wpływa na giełdę/manipulacja rynkiem i zachowaniem inwestorów
- czym są poszczególne zachowania giełdy: bessa i hossa + przykłady na wykresach
- wprowadzenie do podstaw analizowania wykresów (mockowy chart)
- test wiedzy i słownik najważniejszych pojęć
- spróbowanie wyciągnięcia z Yahoo-api jakichś newsów na bieżąco?
- MOŻE PRZYGOTOWANIE SPEJCALNEGO SAMOUCZKA/GUIDE PO APLIKACJI?

## 6. Powiadomienia:
- mają być powiadomienia push z aplikacji (konieczne byłoby działanie aplikacji w tle?)
- użytkownik może wybrać w ustawieniach, jakie powiadomienia chce otrzymywać i czy mają być również push
- powiadomienia mają informować o błędach, ostrzeżeniach z systemu
- mają być także powiadomienia w formie wycentrowanego okna modalnego, które będą weryfikować przytmność użytkownika przy podejmowaniu operacji na rynku (można to wyłączyć). Dostępne dla ustawienia "chroń mnie przed głupotą/missclikiem".
- modalne powiadomienia będą mieć edukacyjną informację, jakie właściwie kroki próbuje podjąć użytkownik
- pozostałe powiadomienia będą typowe - od góry ekranu z informacją w nagłówku oraz niektóre (np. te push z marketu) symbolicznie rozwijane z dodatkowymi informacjami (np. za ile kupiliśmy, czego i ile)


## 7. Inne funkcje (nieskategoryzowane):
- śledzenie poszczególnych instrumentów (dodwanie do ulubionych) - a to dostępne będzie w filtrach
- możliwość otwierania wykresów instrumentów w full screen na mobilce