import type { LegalContent } from "./types";

/**
 * Polish legal content. Mirrors the shape of `legalEn`. Internal links and
 * mailto/external URLs are identical; only the visible text is translated.
 * Price examples use PLN to match the Polish checkout currency.
 */
export const legalPl: LegalContent = {
  ui: {
    home: "Strona główna",
    lastUpdated: "Ostatnia aktualizacja:",
    questions: "Masz pytania? Napisz na",
  },

  privacy: {
    metaTitle: "Polityka prywatności — Facelineage",
    metaDescription:
      "Jak Facelineage zbiera, wykorzystuje i chroni Twoje dane osobowe oraz jakie prawa przysługują Ci na mocy RODO.",
    title: "Polityka prywatności",
    lastUpdated: "25 czerwca 2026",
    blocks: [
      {
        kind: "p",
        text: "Niniejsza Polityka prywatności wyjaśnia, w jaki sposób zbieramy, wykorzystujemy i chronimy Twoje dane osobowe, gdy korzystasz z facelineage.com i powiązanych usług („Usługa\"). Prosimy o zapoznanie się z nią wraz z naszym [Regulaminem](/terms) oraz [Polityką plików cookie](/cookies).",
      },

      { kind: "h", text: "1. Kim jesteśmy (administrator danych)" },
      {
        kind: "p",
        text: "Administratorem Twoich danych osobowych jest **Andromeda Entertainment, MB**, mała spółka z siedzibą na Litwie, kod spółki **308005148**, adres siedziby Žygio g. 5, Wilno (Vilnius), Litwa („my\", „nas\", „nasz\"). W każdej sprawie dotyczącej prywatności możesz skontaktować się z nami pod adresem [support@facelineage.com](mailto:support@facelineage.com).",
      },

      { kind: "h", text: "2. Jakie dane zbieramy" },
      {
        kind: "ul",
        items: [
          "**Zdjęcia selfie**, które przesyłasz do analizy, oraz wszelkie dodatkowe zdjęcia (np. zdjęcia rodziców) przesłane na potrzeby opcjonalnych dodatków.",
          "**Dane o cechach twarzy** uzyskane ze zdjęcia przez naszą AI w celu sporządzenia analizy pochodzenia.",
          "**Dane konta**: Twój adres e-mail, używany do uwierzytelniania i dostarczania raportu.",
          "**Odpowiedzi w quizie** dotyczące kontekstu pochodzenia, którymi zdecydujesz się podzielić.",
          "**Metadane płatności** (ostatnie 4 cyfry, marka karty, kraj) przekazane przez naszego operatora płatności. Nigdy nie widzimy ani nie przechowujemy pełnych numerów kart.",
          "**Dane techniczne**: adres IP, przeglądarka, typ urządzenia i strefa czasowa, zbierane automatycznie dla bezpieczeństwa i analityki.",
        ],
      },

      { kind: "h", text: "3. Dane wrażliwe i Twoja wyraźna zgoda" },
      {
        kind: "p",
        text: "Analiza cech twarzy może obejmować **szczególne kategorie danych osobowych** w rozumieniu art. 9 RODO. Przetwarzamy Twoje zdjęcie i uzyskane z niego dane o cechach twarzy **wyłącznie na podstawie Twojej wyraźnej zgody**, której udzielasz, przesyłając selfie w celu wygenerowania raportu.",
      },
      {
        kind: "note",
        text: "Wykorzystujemy Twoje dane biometryczne wyłącznie do wygenerowania zamówionej przez Ciebie analizy. **Nie** wykorzystujemy ich do identyfikowania Cię w innych usługach, budowania profilu biometrycznego, sprzedaży ani trenowania AI. Możesz wycofać zgodę w dowolnym momencie, usuwając zdjęcie lub konto albo pisząc do nas — wycofanie nie wpływa na przetwarzanie, które już się odbyło.",
      },

      { kind: "h", text: "4. Po co wykorzystujemy Twoje dane i nasze podstawy prawne" },
      {
        kind: "ul",
        items: [
          "Aby wygenerować spersonalizowany raport i dodatki — **wyraźna zgoda** (art. 9 ust. 2 lit. a) dla danych o twarzy; **wykonanie umowy** z Tobą (art. 6 ust. 1 lit. b) dla pozostałych danych.",
          "Aby realizować płatności i zapobiegać oszustwom — **umowa** oraz nasz **prawnie uzasadniony interes** w zabezpieczeniu Usługi (art. 6 ust. 1 lit. f).",
          "Aby wysyłać e-maile transakcyjne (linki do logowania, potwierdzenia, raporty) — **umowa**.",
          "Aby poprawiać dokładność i jakość Usługi w ujęciu zbiorczym — **prawnie uzasadniony interes**; nie wykorzystujemy do tego Twojego pojedynczego zdjęcia.",
          "Aby prowadzić dokumentację księgową i podatkową oraz odpowiadać na zgodne z prawem żądania — **obowiązek prawny** (art. 6 ust. 1 lit. c).",
        ],
      },

      { kind: "h", text: "5. Przetwarzanie przez AI" },
      {
        kind: "p",
        text: "Aby sporządzić analizę, Twoje zdjęcie i powiązane dane są przesyłane do zewnętrznych dostawców AI (**Anthropic** i **Google**) działających jako nasze podmioty przetwarzające. Przetwarzają oni dane wyłącznie po to, aby zwrócić nam wynik; nie zezwalamy im na wykorzystywanie ich do trenowania modeli. Przetwarzanie to objęte jest wyraźną zgodą opisaną w punkcie 3.",
      },

      { kind: "h", text: "6. Udostępnianie i odbiorcy" },
      { kind: "p", text: "**Nie** sprzedajemy Twoich danych osobowych. Udostępniamy je wyłącznie usługodawcom działającym na nasze polecenie:" },
      {
        kind: "ul",
        items: [
          "**Stripe** — obsługa płatności.",
          "**Supabase** — uwierzytelnianie oraz baza danych / przechowywanie.",
          "**Anthropic** i **Google** — wnioskowanie AI.",
          "**Vercel** — hosting i dostarczanie treści.",
          "**Resend** — dostarczanie e-maili transakcyjnych.",
          "Organy publiczne, gdy jesteśmy zobowiązani do ujawnienia danych na mocy prawa.",
        ],
      },

      { kind: "h", text: "7. Przekazywanie poza EOG" },
      {
        kind: "p",
        text: "Niektórzy nasi dostawcy przetwarzają dane poza Europejskim Obszarem Gospodarczym (np. w Stanach Zjednoczonych). W takich przypadkach przekazanie jest zabezpieczone odpowiednimi środkami, takimi jak **standardowe klauzule umowne** Komisji Europejskiej lub decyzja stwierdzająca odpowiedni stopień ochrony. Kopię stosownych zabezpieczeń możesz uzyskać, pisząc do nas.",
      },

      { kind: "h", text: "8. Jak długo przechowujemy Twoje dane" },
      {
        kind: "ul",
        items: [
          "**Selfie i zdjęcia** — usuwane automatycznie w ciągu 30 dni od przesłania, a wcześniej, jeśli usuniesz je z konta.",
          "**Konto i raporty** — przechowywane, dopóki konto jest aktywne; usuwane w ciągu 30 dni od żądania usunięcia konta.",
          "**Dane płatnicze i księgowe** — przechowywane przez okres wymagany litewskim prawem podatkowym i rachunkowym (zwykle do 10 lat).",
        ],
      },

      { kind: "h", text: "9. Twoje prawa" },
      {
        kind: "p",
        text: "Na mocy RODO masz prawo do **dostępu**, **sprostowania**, **usunięcia** i **ograniczenia** przetwarzania danych, prawo do **przenoszenia danych**, prawo do **sprzeciwu** wobec przetwarzania opartego na prawnie uzasadnionym interesie oraz prawo do **wycofania zgody** w dowolnym momencie. Aby skorzystać z któregokolwiek z nich, napisz na [support@facelineage.com](mailto:support@facelineage.com) z adresu przypisanego do konta. Odpowiadamy w ciągu miesiąca.",
      },
      {
        kind: "p",
        text: "Masz również prawo wnieść skargę do organu nadzorczego — w Polsce do **Prezesa Urzędu Ochrony Danych Osobowych (UODO)** ([uodo.gov.pl](https://uodo.gov.pl)); na Litwie do **Państwowej Inspekcji Ochrony Danych (VDAI)**; w Rumunii do **ANSPDCP**; lub do organu w kraju Twojego zamieszkania.",
      },

      { kind: "h", text: "10. Decyzje zautomatyzowane" },
      {
        kind: "p",
        text: "Twój raport jest generowany automatycznie, ale nie wywołuje wobec Ciebie skutków prawnych ani podobnie istotnych skutków w rozumieniu art. 22 RODO — jest wrażeniem rozrywkowym, a nie decyzją o Twoich prawach, finansach czy statusie.",
      },

      { kind: "h", text: "11. Bezpieczeństwo" },
      {
        kind: "p",
        text: "Stosujemy szyfrowanie w trakcie przesyłania (HTTPS), szyfrowane przechowywanie oraz kontrolę dostępu na poziomie wierszy dla danych użytkowników. Żaden system nie jest w pełni bezpieczny, ale stosujemy zabezpieczenia zgodne ze standardami branżowymi i powiadomimy Ciebie oraz właściwy organ o naruszeniu danych, gdy wymaga tego prawo.",
      },

      { kind: "h", text: "12. Dzieci" },
      {
        kind: "p",
        text: "Usługa nie jest skierowana do dzieci poniżej 16. roku życia i świadomie nie zbieramy ich danych. Jeśli sądzisz, że osoba niepełnoletnia przekazała nam informacje, skontaktuj się z nami, a je usuniemy.",
      },

      { kind: "h", text: "13. Zmiany" },
      {
        kind: "p",
        text: "Możemy okresowo aktualizować tę politykę. Zaktualizujemy datę powyżej, a w przypadku istotnych zmian powiadomimy Cię w aplikacji lub e-mailem.",
      },

      { kind: "h", text: "14. Kontakt" },
      {
        kind: "p",
        text: "Masz pytania dotyczące tej polityki lub swoich danych? Napisz na [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  terms: {
    metaTitle: "Regulamin — Facelineage",
    metaDescription: "Regulamin korzystania z Facelineage, w tym Twoje prawa konsumenckie w UE.",
    title: "Regulamin",
    lastUpdated: "25 czerwca 2026",
    blocks: [
      {
        kind: "p",
        text: "Niniejszy Regulamin reguluje korzystanie z Facelineage („Usługa\"), prowadzonej przez **Andromeda Entertainment, MB**, kod spółki **308005148**, Litwa. Korzystając z Usługi, akceptujesz ten Regulamin. Jeśli się nie zgadzasz, prosimy nie korzystać z Usługi.",
      },

      { kind: "h", text: "1. Usługa" },
      {
        kind: "p",
        text: "Facelineage dostarcza generowane przez AI wrażenia dotyczące pochodzenia i przodków na podstawie przesłanego selfie i opcjonalnego kontekstu. Raporty mają charakter **wyłącznie rozrywkowy i inspiracyjny** i nie stanowią porady naukowej, medycznej, genealogicznej ani prawnej.",
      },

      { kind: "h", text: "2. Konto i wymagania" },
      {
        kind: "ul",
        items: [
          "Aby korzystać z Usługi, musisz mieć ukończone 16 lat.",
          "Musisz podać prawidłowy adres e-mail.",
          "Odpowiadasz za aktywność na swoim koncie.",
        ],
      },

      { kind: "h", text: "3. Treść zdjęć i prawa" },
      {
        kind: "p",
        text: "Przesyłając zdjęcie, potwierdzasz, że masz do tego prawo — jest to zdjęcie Ciebie lub masz wyraźną zgodę osoby na nim widocznej (dotyczy to zdjęcia rodzica wykorzystywanego w analizie „Mama + Tata\"). Udzielasz nam ograniczonej licencji na przetwarzanie zdjęcia wyłącznie w celu świadczenia Usługi. Nie rościmy sobie praw własności do Twoich zdjęć.",
      },

      { kind: "h", text: "4. Subskrypcje, ceny i automatyczne odnawianie" },
      {
        kind: "ul",
        items: [
          "Większość planów zaczyna się od płatnego okresu wprowadzającego (na przykład 7,99 zł za 3 dni), a następnie **odnawia się automatycznie** w cenie regularnej (na przykład 99,99 zł/tydzień), aż do anulowania. Dokładne ceny, okres wprowadzający i warunki odnowienia są pokazywane przed dokonaniem płatności.",
          "Opłaty za odnowienie są pobierane automatycznie z zapisanej metody płatności. Przed każdym odnowieniem wysyłamy przypomnienie e-mailem.",
          "Możesz anulować w dowolnym momencie na [stronie konta](/account). Anulowanie wstrzymuje przyszłe opłaty i wchodzi w życie z końcem bieżącego opłaconego okresu; do tego czasu zachowujesz dostęp.",
          "Zakupy dodatków (np. Lustro Dziedzictwa, Przyszły Partner) to opłaty jednorazowe, pobierane natychmiast.",
        ],
      },

      { kind: "h", text: "5. Twoje prawo odstąpienia od umowy (konsumenci w UE)" },
      {
        kind: "p",
        text: "Jeśli jesteś konsumentem w UE, zwykle przysługuje Ci prawo odstąpienia od umowy zawartej na odległość w terminie **14 dni** bez podania przyczyny. Ponieważ Facelineage to treść cyfrowa i usługa dostarczana natychmiast, obowiązuje, co następuje:",
      },
      {
        kind: "note",
        text: "Dokonując zakupu i rozpoczynając tworzenie raportu, **wyraźnie żądasz rozpoczęcia świadczenia przed upływem terminu odstąpienia** i **przyjmujesz do wiadomości, że tracisz prawo do 14-dniowego odstąpienia** po pełnym wykonaniu usługi (tj. po wygenerowaniu i dostarczeniu raportu lub dodatku). W przypadku subskrypcji prawo odstąpienia dotyczy części usługi jeszcze niewykonanej. Nie wpływa to na odrębny dobrowolny zwrot opisany w naszej [Polityce zwrotów](/refunds).",
      },

      { kind: "h", text: "6. Zwroty" },
      {
        kind: "p",
        text: "Poza Twoimi prawami ustawowymi oferujemy dobrowolną gwarancję zwrotu pieniędzy. Szczegóły, jak poprosić o zwrot, znajdziesz w naszej [Polityce zwrotów](/refunds).",
      },

      { kind: "h", text: "7. Dozwolone korzystanie" },
      { kind: "p", text: "Zobowiązujesz się, że nie będziesz:" },
      {
        kind: "ul",
        items: [
          "Przesyłać zdjęć jakiejkolwiek osoby bez jej zgody (dotyczy to również osób niepełnoletnich).",
          "Wykorzystywać Usługi do inwigilacji, nękania lub doxxingu.",
          "Odtwarzać kodu źródłowego, scrapować ani w inny sposób nadużywać Usługi.",
          "Wykorzystywać wyników Facelineage do podejmowania istotnych decyzji wobec innej osoby (zatrudnienie, kredyt, imigracja itp.).",
        ],
      },

      { kind: "h", text: "8. Ograniczenia AI" },
      {
        kind: "p",
        text: "Wizualizacje pochodzenia i przodków to statystyczne wrażenia generowane przez AI na podstawie zdjęcia. **Nie są to testy DNA** i nie mogą ustalić biologicznego pochodzenia. Odniesienia kulturowe są uogólnione i mogą być nieścisłe.",
      },

      { kind: "h", text: "9. Własność intelektualna" },
      {
        kind: "p",
        text: "Nazwa Facelineage, logo i interfejs Usługi są naszą własnością. Raporty, które dla Ciebie generujemy (tekst, obrazy), możesz wykorzystywać do celów osobistych i niekomercyjnych; nie wolno Ci rozpowszechniać ich jako produktu konkurencyjnego.",
      },

      { kind: "h", text: "10. Rozwiązanie umowy" },
      {
        kind: "p",
        text: "Możemy zawiesić lub zamknąć konta naruszające ten Regulamin. Możesz usunąć swoje konto w dowolnym momencie na [stronie konta](/account) lub pisząc do nas.",
      },

      { kind: "h", text: "11. Wyłączenia odpowiedzialności" },
      {
        kind: "p",
        text: "Usługa jest świadczona „tak jak jest\", bez jakichkolwiek gwarancji, wyraźnych ani dorozumianych, w zakresie dozwolonym przez prawo. **Żadne postanowienie tego Regulaminu nie ogranicza praw przysługujących Ci jako konsumentowi, których nie można ograniczyć ani wyłączyć na mocy obowiązującego prawa.**",
      },

      { kind: "h", text: "12. Ograniczenie odpowiedzialności" },
      {
        kind: "p",
        text: "W maksymalnym zakresie dozwolonym przez prawo nasza łączna odpowiedzialność wobec Ciebie z tytułu jakiegokolwiek roszczenia związanego z Usługą jest ograniczona do kwoty zapłaconej nam w ciągu 12 miesięcy przed roszczeniem. Żadne postanowienie nie wyłącza odpowiedzialności, której nie można wyłączyć na mocy prawa (w tym za śmierć, szkodę na osobie lub oszustwo).",
      },

      { kind: "h", text: "13. Prawo właściwe i spory" },
      {
        kind: "p",
        text: "Regulamin podlega prawu **Litwy**, co nie narusza **bezwzględnie obowiązujących przepisów o ochronie konsumentów kraju Twojego zamieszkania**, które nadal Cię chronią. Konsumenci w UE mogą również skorzystać z platformy internetowego rozstrzygania sporów Komisji Europejskiej pod adresem [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).",
      },

      { kind: "h", text: "14. Zmiany" },
      {
        kind: "p",
        text: "Możemy okresowo aktualizować ten Regulamin. O istotnych zmianach poinformujemy w aplikacji lub e-mailem, zanim wejdą w życie.",
      },

      { kind: "h", text: "15. Kontakt" },
      {
        kind: "p",
        text: "Masz pytania dotyczące Regulaminu? Napisz na [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  cookies: {
    metaTitle: "Polityka plików cookie — Facelineage",
    metaDescription: "Jak Facelineage wykorzystuje pliki cookie i podobne technologie.",
    title: "Polityka plików cookie",
    lastUpdated: "25 czerwca 2026",
    blocks: [
      {
        kind: "p",
        text: "Ta strona wyjaśnia, jakie pliki cookie i podobne technologie wykorzystuje Facelineage oraz dlaczego. Prosimy o zapoznanie się z nią wraz z naszą [Polityką prywatności](/privacy).",
      },

      { kind: "h", text: "1. Czym jest plik cookie?" },
      {
        kind: "p",
        text: "Plik cookie to mały plik tekstowy zapisywany na Twoim urządzeniu przez przeglądarkę. Podobne technologie (local storage, session storage) działają analogicznie, ale są ograniczone do sesji przeglądarki lub źródła witryny.",
      },

      { kind: "h", text: "2. Pliki cookie, których używamy" },
      { kind: "h3", text: "Ściśle niezbędne" },
      { kind: "p", text: "Wymagane do działania Usługi. Nie wymagają zgody i nie można ich wyłączyć." },
      {
        kind: "ul",
        items: [
          "**Uwierzytelnianie** — pliki cookie sesji Supabase utrzymują Twoje zalogowanie.",
          "**Stan ścieżki** — krótkotrwałe pliki cookie i sessionStorage śledzą, na którym etapie quizu, paywalla lub płatności jesteś, aby odświeżenie nie utraciło Twojego miejsca.",
          "**Stripe** — Stripe ustawia pliki cookie do wykrywania oszustw i obsługi Apple Pay / Google Pay / PayPal.",
        ],
      },
      { kind: "h3", text: "Analityka" },
      {
        kind: "p",
        text: "Zagregowane, szanujące prywatność metryki użycia (wyświetlenia stron, konwersja w ścieżce). Nie używamy międzywitrynowych trackerów reklamowych. Tam, gdzie wymaga tego prawo, ustawiamy je wyłącznie za Twoją zgodą.",
      },

      { kind: "h", text: "3. Podmioty trzecie" },
      { kind: "p", text: "Następujące podmioty trzecie mogą ustawiać pliki cookie za pośrednictwem naszej Usługi:" },
      {
        kind: "ul",
        items: ["Stripe (płatności)", "Supabase (uwierzytelnianie)", "Vercel (hosting / funkcje brzegowe)"],
      },

      { kind: "h", text: "4. Zarządzanie plikami cookie" },
      {
        kind: "p",
        text: "Możesz usuwać lub blokować pliki cookie w ustawieniach przeglądarki. Pamiętaj, że zablokowanie ściśle niezbędnych plików cookie uniemożliwi zalogowanie się lub dokończenie zakupów.",
      },

      { kind: "h", text: "5. Zmiany" },
      {
        kind: "p",
        text: "Możemy okresowo aktualizować tę Politykę plików cookie. Najnowsza wersja jest zawsze dostępna pod tym adresem URL.",
      },

      { kind: "h", text: "6. Kontakt" },
      {
        kind: "p",
        text: "Masz pytania? Napisz na [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  refunds: {
    metaTitle: "Polityka zwrotów — Facelineage",
    metaDescription: "Nasza polityka zwrotów i anulowania oraz jak współgra z Twoimi prawami ustawowymi.",
    title: "Polityka zwrotów",
    lastUpdated: "25 czerwca 2026",
    blocks: [
      {
        kind: "p",
        text: "Chcemy, abyś był zadowolony z zakupu. Jeśli raport nie spełnił Twoich oczekiwań, zwrócimy Ci pieniądze — bez formularzy, bez pytań.",
      },
      {
        kind: "note",
        text: "Ta gwarancja jest oferowana **dobrowolnie i dodatkowo** względem Twoich praw ustawowych jako konsumenta (w tym prawa odstąpienia opisanego w naszym [Regulaminie](/terms)). Nigdy nie ogranicza tych praw.",
      },

      { kind: "h", text: "1. Okres zwrotu pieniędzy" },
      {
        kind: "p",
        text: "Możesz poprosić o pełny zwrot w ciągu **30 dni** od pierwszego zakupu. Zwroty realizujemy w ciągu 5–10 dni roboczych na pierwotną metodę płatności.",
      },

      { kind: "h", text: "2. Jak poprosić o zwrot" },
      {
        kind: "p",
        text: "Napisz na [support@facelineage.com](mailto:support@facelineage.com) z adresu przypisanego do konta. Podaj:",
      },
      {
        kind: "ul",
        items: [
          "Adres e-mail użyty przy rejestracji.",
          "Datę zakupu.",
          "Ostatnie 4 cyfry użytej karty.",
          "Jedno zdanie o tym, co Ci nie odpowiadało.",
        ],
      },

      { kind: "h", text: "3. Subskrypcje" },
      {
        kind: "ul",
        items: [
          "Twoja opłata wprowadzająca (np. 7,99 zł za 3 dni) obejmuje okres wprowadzający. Anuluj przed jego końcem, aby uniknąć opłaty w cenie regularnej.",
          "Możesz anulować w dowolnym momencie na [stronie konta](/account). Anulowanie wstrzymuje przyszłe opłaty; dostęp trwa do końca bieżącego okresu.",
          "Jeśli zapomnisz anulować i zostaniesz obciążony za niewykorzystane odnowienie, skontaktuj się z nami w ciągu 7 dni od odnowienia, a zwrócimy ostatnią opłatę.",
        ],
      },

      { kind: "h", text: "4. Jednorazowe dodatki" },
      {
        kind: "p",
        text: "Dodatki (analiza Mama + Tata, Lustro Dziedzictwa, Przyszły Partner, Przez Wieki, Księga Dziedzictwa) kwalifikują się do zwrotu w ciągu 30 dni od zakupu. Jeśli wygenerowaliśmy już produkt, zwrot zależy od naszego uznania; pierwszym kupującym zwykle zwracamy.",
      },

      { kind: "h", text: "5. Obciążenia zwrotne (chargeback)" },
      {
        kind: "p",
        text: "Prosimy o kontakt przed zainicjowaniem obciążenia zwrotnego. Spory przez bank mogą trwać 60–90 dni; bezpośredni kontakt niemal zawsze rozwiązuje sprawę w jeden dzień.",
      },

      { kind: "h", text: "6. Wyłączenia" },
      {
        kind: "p",
        text: "Zwroty mogą zostać odrzucone w przypadku dowodów nadużycia, takich jak konta wielokrotnie żądające zwrotu, zdjęcia przesłane bez zgody osoby na nich widocznej lub próby komercyjnego pozyskania treści. Nie wpływa to na Twoje prawa ustawowe.",
      },

      { kind: "h", text: "7. Kontakt" },
      {
        kind: "p",
        text: "Napisz na [support@facelineage.com](mailto:support@facelineage.com) — zwykle odpowiadamy w ciągu jednego dnia roboczego.",
      },
    ],
  },

  contact: {
    metaTitle: "Kontakt — Facelineage",
    metaDescription: "Skontaktuj się z zespołem Facelineage.",
    title: "Kontakt",
    lastUpdated: "25 czerwca 2026",
    blocks: [
      {
        kind: "p",
        text: "Jesteśmy małym zespołem i czytamy każdą wiadomość. Najszybszy sposób kontaktu to e-mail — zwykle odpowiadamy w ciągu jednego dnia roboczego.",
      },

      { kind: "h", text: "Firma" },
      {
        kind: "p",
        text: "Facelineage prowadzi **Andromeda Entertainment, MB**, kod spółki **308005148**, Litwa. Adres siedziby: Žygio g. 5, Wilno (Vilnius), Litwa.",
      },

      { kind: "h", text: "E-mail" },
      {
        kind: "p",
        text: "[support@facelineage.com](mailto:support@facelineage.com)",
      },

      { kind: "h", text: "Co warto podać" },
      {
        kind: "ul",
        items: [
          "Adres e-mail przypisany do konta, jeśli je masz.",
          "Krótki opis tego, czego potrzebujesz.",
          "Zrzuty ekranu, jeśli coś wygląda nie tak w Twoim raporcie.",
        ],
      },

      { kind: "h", text: "Najczęstsze sprawy" },
      {
        kind: "ul",
        items: [
          "**Zwroty i anulowania** — zobacz naszą [Politykę zwrotów](/refunds), a następnie napisz do nas.",
          "**Usunięcie konta lub zdjęcia** — napisz z adresu przypisanego do konta, a zrealizujemy to w ciągu 30 dni.",
          "**Prywatność i dane** — zobacz [Politykę prywatności](/privacy), aby poznać swoje prawa, a następnie napisz do nas.",
          "**Zgłoszenia błędów i pomysły** — zawsze mile widziane. Szybko wdrażamy zmiany na podstawie opinii użytkowników.",
          "**Prasa i współpraca** — ten sam adres; w temacie wpisz „prasa\" lub „współpraca\".",
        ],
      },

      { kind: "h", text: "Czas odpowiedzi" },
      {
        kind: "p",
        text: "Poniedziałek–piątek, 9:00–18:00. Odpowiedzi w weekendy i święta mogą potrwać dłużej. W sprawach płatności prosimy o kontakt przed otwarciem obciążenia zwrotnego — bezpośredni kontakt niemal zawsze rozwiązuje sprawę szybciej.",
      },
    ],
  },
};
