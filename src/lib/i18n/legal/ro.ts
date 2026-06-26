import type { LegalContent } from "./types";

/**
 * Romanian legal content. Mirrors the shape of `legalEn`. Internal links and
 * mailto/external URLs are identical; only the visible text is translated.
 * Price examples use RON to match the Romanian checkout currency.
 */
export const legalRo: LegalContent = {
  ui: {
    home: "Acasă",
    lastUpdated: "Ultima actualizare:",
    questions: "Ai întrebări? Scrie-ne la",
  },

  privacy: {
    metaTitle: "Politica de confidențialitate — Facelineage",
    metaDescription:
      "Cum colectează, utilizează și protejează Facelineage datele tale cu caracter personal și ce drepturi ai conform GDPR.",
    title: "Politica de confidențialitate",
    lastUpdated: "25 iunie 2026",
    blocks: [
      {
        kind: "p",
        text: "Această Politică de confidențialitate explică modul în care colectăm, utilizăm și protejăm datele tale cu caracter personal atunci când folosești facelineage.com și serviciile asociate („Serviciul\"). Te rugăm să o citești împreună cu [Termenii și condițiile](/terms) și [Politica privind cookie-urile](/cookies).",
      },

      { kind: "h", text: "1. Cine suntem (operatorul de date)" },
      {
        kind: "p",
        text: "Operatorul datelor tale cu caracter personal este **Andromeda Entertainment, MB**, o societate mică înființată în Lituania, cod de societate **308005148**, sediul social Žygio g. 5, Vilnius, Lituania („noi\", „nouă\", „nostru\"). Ne poți contacta pentru orice aspect privind confidențialitatea la [support@facelineage.com](mailto:support@facelineage.com).",
      },

      { kind: "h", text: "2. Ce date colectăm" },
      {
        kind: "ul",
        items: [
          "**Fotografiile selfie** pe care le încarci pentru analiză, plus orice fotografii suplimentare (de ex. fotografii ale părinților) trimise pentru opțiuni suplimentare.",
          "**Datele despre trăsăturile feței** derivate din fotografia ta de către IA pentru a realiza analiza originii.",
          "**Informațiile de cont**: adresa ta de e-mail, folosită pentru autentificare și livrarea raportului.",
          "**Răspunsurile la chestionar** despre contextul originii pe care alegi să le împărtășești.",
          "**Metadatele de plată** (ultimele 4 cifre, tipul cardului, țara) furnizate de procesatorul nostru de plăți. Nu vedem și nu stocăm niciodată numerele complete ale cardurilor.",
          "**Datele tehnice**: adresa IP, browserul, tipul de dispozitiv și fusul orar, colectate automat pentru securitate și analiză.",
        ],
      },

      { kind: "h", text: "3. Date sensibile și consimțământul tău explicit" },
      {
        kind: "p",
        text: "Analiza trăsăturilor unei fețe poate implica **categorii speciale de date cu caracter personal** conform articolului 9 din GDPR. Prelucrăm fotografia ta și datele despre trăsăturile feței derivate din ea **numai în baza consimțământului tău explicit**, pe care îl acorzi atunci când îți încarci selfie-ul pentru a genera un raport.",
      },
      {
        kind: "note",
        text: "Folosim datele tale biometrice exclusiv pentru a genera analiza pe care o soliciți. **Nu** le folosim pentru a te identifica între servicii, pentru a construi un profil biometric, pentru vânzare sau pentru antrenarea IA. Îți poți retrage consimțământul oricând ștergând fotografia sau contul, ori scriindu-ne — retragerea nu afectează prelucrarea deja efectuată.",
      },

      { kind: "h", text: "4. De ce folosim datele tale și temeiurile noastre legale" },
      {
        kind: "ul",
        items: [
          "Pentru a genera raportul personalizat și opțiunile suplimentare — **consimțământ explicit** (art. 9 alin. (2) lit. (a)) pentru datele despre față; **executarea contractului** cu tine (art. 6 alin. (1) lit. (b)) pentru restul.",
          "Pentru a procesa plățile și a preveni frauda — **contract** și **interesul nostru legitim** de a securiza Serviciul (art. 6 alin. (1) lit. (f)).",
          "Pentru a trimite e-mailuri tranzacționale (linkuri de conectare, chitanțe, rapoarte) — **contract**.",
          "Pentru a îmbunătăți acuratețea și calitatea Serviciului în mod agregat — **interes legitim**; nu folosim fotografia ta individuală pentru aceasta.",
          "Pentru a păstra evidențe contabile și fiscale și pentru a răspunde solicitărilor legale — **obligație legală** (art. 6 alin. (1) lit. (c)).",
        ],
      },

      { kind: "h", text: "5. Prelucrarea prin IA" },
      {
        kind: "p",
        text: "Pentru a realiza analiza, fotografia ta și datele asociate sunt trimise unor furnizori IA terți (**Anthropic** și **Google**) care acționează ca persoane împuternicite de noi. Aceștia prelucrează datele doar pentru a ne returna un rezultat; nu le autorizăm să le folosească pentru antrenarea modelelor. Această prelucrare este acoperită de consimțământul explicit descris în secțiunea 3.",
      },

      { kind: "h", text: "6. Partajare și destinatari" },
      { kind: "p", text: "**Nu** vindem datele tale cu caracter personal. Le partajăm doar cu furnizori de servicii care acționează la instrucțiunile noastre:" },
      {
        kind: "ul",
        items: [
          "**Stripe** — procesarea plăților.",
          "**Supabase** — autentificare și bază de date / stocare.",
          "**Anthropic** și **Google** — inferență IA.",
          "**Vercel** — găzduire și livrarea conținutului.",
          "**Resend** — livrarea e-mailurilor tranzacționale.",
          "Autorități publice, atunci când suntem obligați prin lege să divulgăm datele.",
        ],
      },

      { kind: "h", text: "7. Transferuri internaționale" },
      {
        kind: "p",
        text: "Unii dintre furnizorii noștri prelucrează date în afara Spațiului Economic European (de ex. în Statele Unite). În aceste cazuri, transferul este protejat prin garanții adecvate, precum **clauzele contractuale standard** ale Comisiei Europene sau o decizie privind caracterul adecvat. Poți solicita o copie a garanțiilor relevante scriindu-ne.",
      },

      { kind: "h", text: "8. Cât timp păstrăm datele tale" },
      {
        kind: "ul",
        items: [
          "**Selfie-uri și fotografii** — șterse automat în termen de 30 de zile de la încărcare și mai devreme dacă le ștergi din cont.",
          "**Cont și rapoarte** — păstrate cât timp contul este activ; eliminate în termen de 30 de zile de la o cerere de ștergere a contului.",
          "**Evidențe de plată și contabile** — păstrate pe durata impusă de legislația fiscală și contabilă lituaniană (în general până la 10 ani).",
        ],
      },

      { kind: "h", text: "9. Drepturile tale" },
      {
        kind: "p",
        text: "Conform GDPR, ai dreptul de **acces**, **rectificare**, **ștergere** și **restricționare** a prelucrării datelor, dreptul la **portabilitatea datelor**, dreptul de a te **opune** prelucrării bazate pe interes legitim și dreptul de a-ți **retrage consimțământul** oricând. Pentru a-ți exercita oricare dintre aceste drepturi, scrie la [support@facelineage.com](mailto:support@facelineage.com) de la adresa asociată contului. Răspundem în termen de o lună.",
      },
      {
        kind: "p",
        text: "Ai, de asemenea, dreptul de a depune o plângere la o autoritate de supraveghere — în România, la **Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)** ([dataprotection.ro](https://www.dataprotection.ro)); în Lituania, la **Inspectoratul de Stat pentru Protecția Datelor (VDAI)**; în Polonia, la **UODO**; sau la autoritatea din țara ta de reședință.",
      },

      { kind: "h", text: "10. Decizii automate" },
      {
        kind: "p",
        text: "Raportul tău este generat automat, dar nu produce efecte juridice sau în mod similar semnificative asupra ta în sensul articolului 22 din GDPR — este o impresie cu scop de divertisment, nu o decizie privind drepturile, finanțele sau statutul tău.",
      },

      { kind: "h", text: "11. Securitate" },
      {
        kind: "p",
        text: "Folosim criptarea în tranzit (HTTPS), stocarea criptată și controale de acces la nivel de rând pentru datele utilizatorilor. Niciun sistem nu este perfect sigur, dar aplicăm garanții conforme standardelor din industrie și te vom notifica pe tine și autoritatea relevantă în cazul unei breșe de date, atunci când legea o impune.",
      },

      { kind: "h", text: "12. Copii" },
      {
        kind: "p",
        text: "Serviciul nu se adresează copiilor sub 16 ani și nu colectăm cu bună știință datele acestora. Dacă crezi că un minor ne-a furnizat informații, contactează-ne și le vom șterge.",
      },

      { kind: "h", text: "13. Modificări" },
      {
        kind: "p",
        text: "Putem actualiza această politică periodic. Vom revizui data de mai sus și, pentru modificări importante, te vom notifica în aplicație sau prin e-mail.",
      },

      { kind: "h", text: "14. Contact" },
      {
        kind: "p",
        text: "Întrebări despre această politică sau despre datele tale? Scrie la [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  terms: {
    metaTitle: "Termeni și condiții — Facelineage",
    metaDescription: "Termenii care guvernează utilizarea Facelineage, inclusiv drepturile tale de consumator în UE.",
    title: "Termeni și condiții",
    lastUpdated: "25 iunie 2026",
    blocks: [
      {
        kind: "p",
        text: "Acești Termeni guvernează utilizarea Facelineage („Serviciul\"), operat de **Andromeda Entertainment, MB**, cod de societate **308005148**, Lituania. Prin utilizarea Serviciului, ești de acord cu acești Termeni. Dacă nu ești de acord, te rugăm să nu folosești Serviciul.",
      },

      { kind: "h", text: "1. Serviciul" },
      {
        kind: "p",
        text: "Facelineage oferă impresii despre origine și strămoși generate de IA pe baza unui selfie trimis de utilizator și a unui context opțional. Rapoartele au **scop exclusiv de divertisment și inspirație** și nu constituie consultanță științifică, medicală, genealogică sau juridică.",
      },

      { kind: "h", text: "2. Cont și eligibilitate" },
      {
        kind: "ul",
        items: [
          "Trebuie să ai cel puțin 16 ani pentru a folosi Serviciul.",
          "Trebuie să furnizezi o adresă de e-mail validă.",
          "Ești responsabil pentru activitatea din contul tău.",
        ],
      },

      { kind: "h", text: "3. Conținutul fotografiilor și drepturile" },
      {
        kind: "p",
        text: "Prin încărcarea unei fotografii, confirmi că ai dreptul să o faci — este o fotografie a ta sau ai permisiunea explicită a persoanei din imagine (acest lucru se aplică fotografiei unui părinte folosite pentru analiza „Mama + Tata\"). Ne acorzi o licență limitată de a prelucra fotografia exclusiv pentru a furniza Serviciul. Nu revendicăm proprietatea asupra fotografiilor tale.",
      },

      { kind: "h", text: "4. Abonamente, prețuri și reînnoire automată" },
      {
        kind: "ul",
        items: [
          "Majoritatea planurilor încep cu o perioadă introductivă plătită (de exemplu, 7 RON pentru 3 zile) și apoi se **reînnoiesc automat** la prețul standard (de exemplu, 99 RON/săptămână) până la anulare. Prețurile exacte, perioada introductivă și condițiile de reînnoire îți sunt afișate înainte de a plăti.",
          "Taxele de reînnoire sunt percepute automat din metoda de plată salvată. Înainte de fiecare reînnoire îți trimitem un memento prin e-mail.",
          "Poți anula oricând din [pagina contului](/account). Anularea oprește taxele viitoare și produce efecte la sfârșitul perioadei plătite curente; păstrezi accesul până atunci.",
          "Achizițiile suplimentare (de ex. Oglinda Originii, Viitorul Partener) sunt taxe unice, facturate imediat.",
        ],
      },

      { kind: "h", text: "5. Dreptul tău de retragere (consumatori din UE)" },
      {
        kind: "p",
        text: "Dacă ești consumator în UE, ai în mod normal dreptul de a te retrage dintr-un contract la distanță în termen de **14 zile** fără a oferi un motiv. Deoarece Facelineage este conținut digital și un serviciu livrat imediat, se aplică următoarele:",
      },
      {
        kind: "note",
        text: "Prin efectuarea achiziției și începerea raportului, **soliciți în mod expres să începem prestarea imediat** și **confirmi că pierzi dreptul de retragere de 14 zile** odată ce serviciul a fost prestat integral (adică raportul sau opțiunea suplimentară a fost generată și livrată). Pentru un abonament, dreptul de retragere se aplică părții din serviciu neprestate încă. Acest lucru nu afectează rambursarea voluntară separată descrisă în [Politica de rambursare](/refunds).",
      },

      { kind: "h", text: "6. Rambursări" },
      {
        kind: "p",
        text: "Pe lângă drepturile tale legale, oferim o garanție voluntară de rambursare a banilor. Consultă [Politica de rambursare](/refunds) pentru detalii despre cum poți solicita o rambursare.",
      },

      { kind: "h", text: "7. Utilizare acceptabilă" },
      { kind: "p", text: "Ești de acord să nu:" },
      {
        kind: "ul",
        items: [
          "Încarci fotografii ale nimănui fără consimțământul acestuia (inclusiv minori).",
          "Folosești Serviciul pentru supraveghere, hărțuire sau doxxing.",
          "Faci inginerie inversă, extragi date (scraping) sau abuzezi în alt mod de Serviciu.",
          "Folosești rezultatele Facelineage pentru a lua decizii importante despre o altă persoană (angajare, creditare, imigrare etc.).",
        ],
      },

      { kind: "h", text: "8. Limitările IA" },
      {
        kind: "p",
        text: "Reprezentările privind originea și strămoșii sunt impresii statistice generate de IA dintr-o fotografie. **Nu sunt teste ADN** și nu pot stabili descendența biologică. Referințele culturale sunt generalizate și pot fi inexacte.",
      },

      { kind: "h", text: "9. Proprietate intelectuală" },
      {
        kind: "p",
        text: "Numele Facelineage, logoul și interfața Serviciului sunt proprietatea noastră. Rapoartele pe care le generăm pentru tine (text, imagini) îți aparțin pentru utilizare personală, necomercială; nu le poți redistribui ca produs concurent.",
      },

      { kind: "h", text: "10. Încetare" },
      {
        kind: "p",
        text: "Putem suspenda sau închide conturile care încalcă acești Termeni. Îți poți șterge contul oricând din [pagina contului](/account) sau scriindu-ne.",
      },

      { kind: "h", text: "11. Declinarea garanțiilor" },
      {
        kind: "p",
        text: "Serviciul este furnizat „ca atare\", fără garanții de niciun fel, exprese sau implicite, în măsura permisă de lege. **Nimic din acești Termeni nu limitează drepturile pe care le ai în calitate de consumator și care nu pot fi limitate sau renunțate conform legii aplicabile.**",
      },

      { kind: "h", text: "12. Limitarea răspunderii" },
      {
        kind: "p",
        text: "În măsura maximă permisă de lege, răspunderea noastră totală față de tine pentru orice pretenție legată de Serviciu este limitată la suma plătită nouă în cele 12 luni dinaintea pretenției. Nimic din acești Termeni nu exclude răspunderea care nu poate fi exclusă prin lege (inclusiv pentru deces, vătămare corporală sau fraudă).",
      },

      { kind: "h", text: "13. Legea aplicabilă și litigiile" },
      {
        kind: "p",
        text: "Acești Termeni sunt guvernați de legile **Lituaniei**, fără a afecta **normele imperative de protecție a consumatorilor din țara ta de reședință**, care continuă să ți se aplice. Consumatorii din UE pot folosi și platforma de soluționare online a litigiilor a Comisiei Europene, la [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).",
      },

      { kind: "h", text: "14. Modificări" },
      {
        kind: "p",
        text: "Putem actualiza acești Termeni ocazional. Modificările importante vor fi anunțate în aplicație sau prin e-mail înainte de a intra în vigoare.",
      },

      { kind: "h", text: "15. Contact" },
      {
        kind: "p",
        text: "Întrebări despre acești Termeni? Scrie la [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  cookies: {
    metaTitle: "Politica privind cookie-urile — Facelineage",
    metaDescription: "Cum folosește Facelineage cookie-urile și tehnologiile similare.",
    title: "Politica privind cookie-urile",
    lastUpdated: "25 iunie 2026",
    blocks: [
      {
        kind: "p",
        text: "Această pagină explică ce cookie-uri și tehnologii similare folosește Facelineage și de ce. Te rugăm să o citești împreună cu [Politica de confidențialitate](/privacy).",
      },

      { kind: "h", text: "1. Ce este un cookie?" },
      {
        kind: "p",
        text: "Un cookie este un fișier text mic stocat pe dispozitivul tău de către browser. Tehnologiile similare (local storage, session storage) funcționează în mod comparabil, dar sunt limitate la sesiunea browserului sau la originea site-ului.",
      },

      { kind: "h", text: "2. Cookie-urile pe care le folosim" },
      { kind: "h3", text: "Strict necesare" },
      { kind: "p", text: "Necesare pentru funcționarea Serviciului. Nu necesită consimțământ și nu pot fi dezactivate." },
      {
        kind: "ul",
        items: [
          "**Autentificare** — cookie-urile de sesiune Supabase te mențin conectat.",
          "**Starea parcursului** — cookie-uri de scurtă durată și sessionStorage urmăresc la ce pas al chestionarului, paywall sau plată te afli, astfel încât o reîmprospătare să nu îți piardă locul.",
          "**Stripe** — Stripe setează cookie-uri pentru a detecta frauda și a permite fluxurile Apple Pay / Google Pay / PayPal.",
        ],
      },
      { kind: "h3", text: "Analiză" },
      {
        kind: "p",
        text: "Statistici agregate, care respectă confidențialitatea, despre utilizare (pagini vizualizate, conversie în parcurs). Nu folosim instrumente de urmărire publicitară între site-uri. Acolo unde legea o cere, le setăm doar cu consimțământul tău.",
      },

      { kind: "h", text: "3. Terți" },
      { kind: "p", text: "Următorii terți pot seta cookie-uri prin Serviciul nostru:" },
      {
        kind: "ul",
        items: ["Stripe (plăți)", "Supabase (autentificare)", "Vercel (găzduire / funcții edge)"],
      },

      { kind: "h", text: "4. Gestionarea cookie-urilor" },
      {
        kind: "p",
        text: "Poți șterge sau bloca cookie-urile din setările browserului. Reține că blocarea cookie-urilor strict necesare te va împiedica să te conectezi sau să finalizezi achizițiile.",
      },

      { kind: "h", text: "5. Modificări" },
      {
        kind: "p",
        text: "Putem actualiza această Politică privind cookie-urile periodic. Cea mai recentă versiune este întotdeauna disponibilă la acest URL.",
      },

      { kind: "h", text: "6. Contact" },
      {
        kind: "p",
        text: "Întrebări? Scrie la [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  refunds: {
    metaTitle: "Politica de rambursare — Facelineage",
    metaDescription: "Politica noastră de rambursare și anulare și cum se îmbină cu drepturile tale legale.",
    title: "Politica de rambursare",
    lastUpdated: "25 iunie 2026",
    blocks: [
      {
        kind: "p",
        text: "Vrem să te simți bine cu achiziția ta. Dacă raportul nu ți-a îndeplinit așteptările, îți returnăm banii — fără formulare, fără întrebări.",
      },
      {
        kind: "note",
        text: "Această garanție este oferită **voluntar și în plus** față de drepturile tale legale în calitate de consumator (inclusiv dreptul de retragere descris în [Termeni și condiții](/terms)). Ea nu reduce niciodată aceste drepturi.",
      },

      { kind: "h", text: "1. Perioada de rambursare" },
      {
        kind: "p",
        text: "Poți solicita o rambursare integrală în termen de **30 de zile** de la achiziția inițială. Procesăm rambursările în 5–10 zile lucrătoare, către metoda de plată inițială.",
      },

      { kind: "h", text: "2. Cum soliciți o rambursare" },
      {
        kind: "p",
        text: "Scrie la [support@facelineage.com](mailto:support@facelineage.com) de la adresa asociată contului. Include:",
      },
      {
        kind: "ul",
        items: [
          "Adresa de e-mail folosită la înregistrare.",
          "Data achiziției.",
          "Ultimele 4 cifre ale cardului folosit.",
          "O propoziție despre ce nu a funcționat pentru tine.",
        ],
      },

      { kind: "h", text: "3. Abonamente" },
      {
        kind: "ul",
        items: [
          "Plata introductivă (de ex. 7 RON pentru 3 zile) acoperă perioada introductivă. Anulează înainte să se termine pentru a evita perceperea prețului recurent.",
          "Poți anula oricând din [pagina contului](/account). Anularea oprește taxele viitoare; accesul continuă până la sfârșitul perioadei curente.",
          "Dacă uiți să anulezi și ești taxat pentru o reînnoire pe care nu ai folosit-o, contactează-ne în termen de 7 zile de la reînnoire și îți vom rambursa ultima taxă.",
        ],
      },

      { kind: "h", text: "4. Opțiuni suplimentare unice" },
      {
        kind: "p",
        text: "Opțiunile suplimentare (analiza Mama + Tata, Oglinda Originii, Viitorul Partener, De-a Lungul Epocilor, Ghidul Originii) sunt eligibile pentru rambursare în termen de 30 de zile de la achiziție. Dacă am generat deja produsul, rambursarea este la discreția noastră; de obicei rambursăm totuși cumpărătorii la prima achiziție.",
      },

      { kind: "h", text: "5. Contestații la bancă (chargeback)" },
      {
        kind: "p",
        text: "Te rugăm să ne contactezi înainte de a iniția o contestație la bancă. Disputele prin bancă pot dura 60–90 de zile; contactul direct rezolvă aproape întotdeauna situația într-o zi.",
      },

      { kind: "h", text: "6. Excluderi" },
      {
        kind: "p",
        text: "Rambursările pot fi refuzate când există dovezi de abuz, precum conturi care solicită rambursări în mod repetat, fotografii încărcate fără consimțământul persoanei din imagine sau încercări de a extrage conținut în scop comercial. Acest lucru nu afectează drepturile tale legale.",
      },

      { kind: "h", text: "7. Contact" },
      {
        kind: "p",
        text: "Scrie la [support@facelineage.com](mailto:support@facelineage.com) — de obicei răspundem într-o zi lucrătoare.",
      },
    ],
  },

  contact: {
    metaTitle: "Contact — Facelineage",
    metaDescription: "Ia legătura cu echipa Facelineage.",
    title: "Contact",
    lastUpdated: "25 iunie 2026",
    blocks: [
      {
        kind: "p",
        text: "Suntem o echipă mică și citim fiecare mesaj. Cel mai rapid mod de a ne contacta este e-mailul — de obicei răspundem într-o zi lucrătoare.",
      },

      { kind: "h", text: "Compania" },
      {
        kind: "p",
        text: "Facelineage este operat de **Andromeda Entertainment, MB**, cod de societate **308005148**, Lituania. Sediul social: Žygio g. 5, Vilnius, Lituania.",
      },

      { kind: "h", text: "E-mail" },
      {
        kind: "p",
        text: "[support@facelineage.com](mailto:support@facelineage.com)",
      },

      { kind: "h", text: "Ce să incluzi" },
      {
        kind: "ul",
        items: [
          "Adresa de e-mail asociată contului, dacă ai unul.",
          "O scurtă descriere a ceea ce ai nevoie.",
          "Capturi de ecran, dacă ceva nu arată bine în raportul tău.",
        ],
      },

      { kind: "h", text: "Solicitări frecvente" },
      {
        kind: "ul",
        items: [
          "**Rambursări și anulări** — consultă [Politica de rambursare](/refunds), apoi scrie-ne.",
          "**Ștergerea contului sau a fotografiilor** — scrie de la adresa asociată contului și vom procesa cererea în 30 de zile.",
          "**Confidențialitate și date** — consultă [Politica de confidențialitate](/privacy) pentru drepturile tale, apoi scrie-ne.",
          "**Raportări de erori și idei** — întotdeauna binevenite. Lansăm rapid pe baza feedbackului real al utilizatorilor.",
          "**Presă și parteneriate** — aceeași adresă; menționează „presă\" sau „parteneriat\" în subiect.",
        ],
      },

      { kind: "h", text: "Timpi de răspuns" },
      {
        kind: "p",
        text: "Luni–vineri, 9:00–18:00. Răspunsurile în weekend și sărbători pot dura mai mult. Pentru probleme de plată, te rugăm să ne scrii înainte de a deschide o contestație la bancă — contactul direct rezolvă aproape întotdeauna situația mai repede.",
      },
    ],
  },
};
