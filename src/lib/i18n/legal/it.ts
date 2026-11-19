import type { LegalContent } from "./types";

/**
 * Italian legal content. Mirrors the shape of `legalEn`. Internal links and
 * mailto/external URLs are identical; only the visible text is translated.
 * Price examples use EUR to match the Italian checkout currency. Withdrawal
 * wording follows the Italian Consumer Code (D.Lgs. 206/2005, artt. 52 e 59).
 */
export const legalIt: LegalContent = {
  ui: {
    home: "Home",
    lastUpdated: "Ultimo aggiornamento:",
    questions: "Domande? Scrivi a",
  },

  privacy: {
    metaTitle: "Informativa sulla privacy — Facelineage",
    metaDescription:
      "Come Facelineage raccoglie, utilizza e protegge i tuoi dati personali e quali diritti hai ai sensi del GDPR.",
    title: "Informativa sulla privacy",
    lastUpdated: "25 giugno 2026",
    blocks: [
      {
        kind: "p",
        text: "La presente Informativa sulla privacy spiega come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali quando utilizzi facelineage.com e i servizi correlati (il \"Servizio\"). Ti invitiamo a leggerla insieme ai nostri [Termini di servizio](/terms) e alla nostra [Cookie Policy](/cookies).",
      },

      { kind: "h", text: "1. Chi siamo (titolare del trattamento)" },
      {
        kind: "p",
        text: "Il titolare del trattamento dei tuoi dati personali è **Andromeda Entertainment, MB**, piccola società di persone costituita in Lituania, codice società **308005148**, sede legale Žygio g. 5, Vilnius, Lituania (\"noi\", \"ci\", \"nostro\"). Puoi contattarci per qualsiasi questione relativa alla privacy all'indirizzo [support@facelineage.com](mailto:support@facelineage.com).",
      },

      { kind: "h", text: "2. Dati che raccogliamo" },
      {
        kind: "ul",
        items: [
          "**Foto selfie** che carichi per l'analisi, oltre a eventuali foto aggiuntive (ad es. foto dei genitori) che invii per gli extra facoltativi.",
          "**Dati sui tratti del viso** ricavati dalla tua foto dalla nostra AI per produrre l'analisi delle tue origini.",
          "**Dati dell'account**: il tuo indirizzo email, utilizzato per l'autenticazione e l'invio del report.",
          "**Risposte al quiz** sul contesto delle tue origini che scegli di condividere.",
          "**Metadati di pagamento** (ultime 4 cifre, circuito della carta, paese) forniti dal nostro processore di pagamento. Non vediamo né conserviamo mai i numeri completi delle carte.",
          "**Dati tecnici**: indirizzo IP, browser, tipo di dispositivo e fuso orario, raccolti automaticamente per finalità di sicurezza e analisi.",
        ],
      },

      { kind: "h", text: "3. Dati sensibili e il tuo consenso esplicito" },
      {
        kind: "p",
        text: "L'analisi dei tratti di un volto può comportare il trattamento di **categorie particolari di dati personali** ai sensi dell'articolo 9 del GDPR. Trattiamo la tua foto e i dati sui tratti del viso da essa ricavati **esclusivamente sulla base del tuo consenso esplicito**, che fornisci quando carichi il tuo selfie per generare un report.",
      },
      {
        kind: "note",
        text: "Utilizziamo i tuoi dati facciali esclusivamente per generare l'analisi che richiedi. **Non** li utilizziamo per identificarti su altri servizi, creare un profilo biometrico, venderli o addestrare sistemi di AI. Puoi revocare il consenso in qualsiasi momento eliminando la tua foto o il tuo account, oppure scrivendoci — la revoca non pregiudica la liceità del trattamento già effettuato.",
      },

      { kind: "h", text: "4. Perché utilizziamo i tuoi dati e su quali basi giuridiche" },
      {
        kind: "ul",
        items: [
          "Per generare il tuo report personalizzato sulle origini e gli extra — **consenso esplicito** (art. 9, par. 2, lett. a) per i dati facciali; **esecuzione del contratto** con te (art. 6, par. 1, lett. b) per il resto.",
          "Per elaborare i pagamenti e prevenire le frodi — **contratto** e nostro **legittimo interesse** a proteggere il Servizio (art. 6, par. 1, lett. f).",
          "Per inviare email transazionali (link di accesso, ricevute, report) — **contratto**.",
          "Per migliorare in forma aggregata l'accuratezza e la qualità del nostro Servizio — **legittimo interesse**; a tal fine non utilizziamo la tua singola foto.",
          "Per tenere le scritture contabili e fiscali e rispondere a richieste legittime delle autorità — **obbligo legale** (art. 6, par. 1, lett. c).",
        ],
      },

      { kind: "h", text: "5. Trattamento tramite AI" },
      {
        kind: "p",
        text: "Per produrre la tua analisi, la tua foto e i relativi dati vengono inviati a fornitori di AI terzi (**Anthropic** e **Google**) che agiscono in qualità di nostri responsabili del trattamento. Trattano i dati solo per restituirci un risultato; non li autorizziamo a utilizzarli per addestrare i propri modelli. Questo trattamento è coperto dal consenso esplicito descritto nella Sezione 3.",
      },

      { kind: "h", text: "6. Condivisione e destinatari" },
      { kind: "p", text: "**Non** vendiamo i tuoi dati personali. Li condividiamo solo con fornitori di servizi che agiscono secondo le nostre istruzioni:" },
      {
        kind: "ul",
        items: [
          "**Stripe** — elaborazione dei pagamenti.",
          "**Supabase** — autenticazione e database/archiviazione.",
          "**Anthropic** e **Google** — elaborazione AI.",
          "**Vercel** — hosting e distribuzione dei contenuti.",
          "**Resend** — invio delle email transazionali.",
          "Autorità pubbliche, quando siamo tenuti per legge a comunicarli.",
        ],
      },

      { kind: "h", text: "7. Trasferimenti internazionali" },
      {
        kind: "p",
        text: "Alcuni dei nostri fornitori trattano i dati al di fuori dello Spazio economico europeo (ad es. negli Stati Uniti). In tal caso, il trasferimento è protetto da garanzie adeguate, come le **Clausole contrattuali standard** della Commissione europea o una decisione di adeguatezza. Puoi richiedere una copia delle garanzie pertinenti scrivendoci.",
      },

      { kind: "h", text: "8. Per quanto tempo conserviamo i tuoi dati" },
      {
        kind: "ul",
        items: [
          "**Selfie e foto** — eliminati automaticamente entro 30 giorni dal caricamento, o prima se li elimini dal tuo account.",
          "**Account e report** — conservati finché il tuo account è attivo; rimossi entro 30 giorni da una richiesta di cancellazione dell'account.",
          "**Documentazione di pagamento e contabile** — conservata per il tempo richiesto dalla normativa fiscale e contabile lituana (generalmente fino a 10 anni).",
        ],
      },

      { kind: "h", text: "9. I tuoi diritti" },
      {
        kind: "p",
        text: "Ai sensi del GDPR hai il diritto di **accesso**, **rettifica**, **cancellazione** e **limitazione** del trattamento dei tuoi dati, il diritto alla **portabilità dei dati**, il diritto di **opporti** al trattamento basato sul legittimo interesse e il diritto di **revocare il consenso** in qualsiasi momento. Per esercitare uno di questi diritti, scrivi a [support@facelineage.com](mailto:support@facelineage.com) dall'indirizzo associato al tuo account. Rispondiamo entro un mese.",
      },
      {
        kind: "p",
        text: "Hai inoltre il diritto di proporre reclamo a un'autorità di controllo — in Italia, al **Garante per la protezione dei dati personali** ([garanteprivacy.it](https://www.garanteprivacy.it)); in Lituania, all'**Ispettorato statale per la protezione dei dati (VDAI)** ([vdai.lrv.lt](https://vdai.lrv.lt)); oppure all'autorità del tuo paese di residenza.",
      },

      { kind: "h", text: "10. Decisioni automatizzate" },
      {
        kind: "p",
        text: "Il tuo report viene generato automaticamente, ma non produce effetti giuridici o effetti analogamente significativi nei tuoi confronti ai sensi dell'articolo 22 del GDPR — si tratta di un'impressione a scopo di intrattenimento, non di una decisione sui tuoi diritti, sulle tue finanze o sul tuo status.",
      },

      { kind: "h", text: "11. Sicurezza" },
      {
        kind: "p",
        text: "Utilizziamo la crittografia in transito (HTTPS), l'archiviazione crittografata dei dati inattivi e controlli di accesso a livello di riga sui dati degli utenti. Nessun sistema è perfettamente sicuro, ma applichiamo misure di sicurezza conformi agli standard del settore e, ove previsto dalla legge, notificheremo a te e all'autorità competente eventuali violazioni dei dati.",
      },

      { kind: "h", text: "12. Minori" },
      {
        kind: "p",
        text: "Il Servizio non è rivolto ai minori di 16 anni e non raccogliamo consapevolmente i loro dati. Se ritieni che un minore ci abbia fornito informazioni, contattaci e le elimineremo.",
      },

      { kind: "h", text: "13. Modifiche" },
      {
        kind: "p",
        text: "Potremmo aggiornare questa informativa di tanto in tanto. Aggiorneremo la data riportata sopra e, in caso di modifiche sostanziali, ti informeremo nell'app o via email.",
      },

      { kind: "h", text: "14. Contatti" },
      {
        kind: "p",
        text: "Domande su questa informativa o sui tuoi dati? Scrivi a [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  terms: {
    metaTitle: "Termini di servizio — Facelineage",
    metaDescription: "Le condizioni che regolano l'utilizzo di Facelineage, inclusi i tuoi diritti di consumatore nell'UE.",
    title: "Termini di servizio",
    lastUpdated: "25 giugno 2026",
    blocks: [
      {
        kind: "p",
        text: "I presenti Termini regolano l'utilizzo di Facelineage (il \"Servizio\"), gestito da **Andromeda Entertainment, MB**, codice società **308005148**, Lituania. Utilizzando il Servizio accetti i presenti Termini. Se non li accetti, ti preghiamo di non utilizzare il Servizio.",
      },

      { kind: "h", text: "1. Il Servizio" },
      {
        kind: "p",
        text: "Facelineage fornisce impressioni sulle origini e sugli antenati generate dall'AI sulla base di un selfie inviato dall'utente e di eventuali informazioni di contesto facoltative. I report sono **esclusivamente a scopo di intrattenimento e ispirazione** e non costituiscono consulenza scientifica, medica, genealogica o legale.",
      },

      { kind: "h", text: "2. Account e requisiti" },
      {
        kind: "ul",
        items: [
          "Devi avere almeno 16 anni per utilizzare il Servizio.",
          "Devi fornire un indirizzo email valido.",
          "Sei responsabile delle attività svolte con il tuo account.",
        ],
      },

      { kind: "h", text: "3. Contenuto delle foto e diritti" },
      {
        kind: "p",
        text: "Caricando una foto, confermi di averne il diritto — si tratta di una tua foto, oppure hai l'autorizzazione esplicita della persona ritratta (ciò vale anche per la foto di un genitore utilizzata per l'analisi Mamma + Papà). Ci concedi una licenza limitata a trattare la foto al solo scopo di fornire il Servizio. Non rivendichiamo alcuna proprietà sulle tue foto.",
      },

      { kind: "h", text: "4. Abbonamenti, prezzi e rinnovo automatico" },
      {
        kind: "ul",
        items: [
          "La maggior parte dei piani inizia con un periodo introduttivo a pagamento (ad esempio, 2,49 € per 3 giorni) e poi **si rinnova automaticamente** al prezzo standard (ad esempio, 49 €/mese) fino alla disdetta. I prezzi esatti, il periodo introduttivo e le condizioni di rinnovo ti vengono mostrati al momento del pagamento, prima che tu paghi.",
          "Gli addebiti di rinnovo vengono effettuati automaticamente sul metodo di pagamento salvato. Ti inviamo un promemoria via email prima di ogni rinnovo.",
          "Puoi disdire in qualsiasi momento dalla tua [pagina dell'account](/account). La disdetta interrompe gli addebiti futuri e ha effetto alla fine del periodo già pagato; fino ad allora mantieni l'accesso.",
          "Gli acquisti di extra (ad es. Specchio delle Origini, Partner del Futuro) sono addebiti una tantum effettuati immediatamente.",
        ],
      },

      { kind: "h", text: "5. Il tuo diritto di recesso (consumatori nell'UE)" },
      {
        kind: "p",
        text: "Se sei un consumatore nell'UE, di norma hai il diritto di recedere da un contratto a distanza entro **14 giorni** senza dover fornire alcuna motivazione (in Italia, ai sensi dell'art. 52 del Codice del Consumo, D.Lgs. 206/2005). Poiché Facelineage è un contenuto digitale e un servizio che ti viene fornito immediatamente, si applica quanto segue:",
      },
      {
        kind: "note",
        text: "Acquistando e avviando il tuo report, **richiedi espressamente che l'esecuzione inizi immediatamente, prima della scadenza del periodo di recesso**, e **riconosci di perdere il diritto di recesso di 14 giorni** una volta che il servizio è stato interamente eseguito (cioè quando il tuo report o il tuo extra è stato generato e consegnato), ai sensi dell'art. 59 del Codice del Consumo. Per un abbonamento, il diritto di recesso si applica alla parte del servizio non ancora eseguita. Ciò non pregiudica il rimborso volontario separato descritto nella nostra [Politica di rimborso](/refunds).",
      },

      { kind: "h", text: "6. Rimborsi" },
      {
        kind: "p",
        text: "Oltre ai tuoi diritti previsti dalla legge, offriamo una garanzia volontaria soddisfatti o rimborsati. Consulta la nostra [Politica di rimborso](/refunds) per sapere come richiedere un rimborso.",
      },

      { kind: "h", text: "7. Uso consentito" },
      { kind: "p", text: "Ti impegni a non:" },
      {
        kind: "ul",
        items: [
          "Caricare foto di altre persone senza il loro consenso (minori inclusi).",
          "Utilizzare il Servizio per sorveglianza, molestie o doxxing.",
          "Decompilare, effettuare scraping o fare in altro modo un uso improprio del Servizio.",
          "Utilizzare i risultati di Facelineage per prendere decisioni rilevanti su un'altra persona (assunzioni, prestiti, immigrazione, ecc.).",
        ],
      },

      { kind: "h", text: "8. Limiti dell'AI" },
      {
        kind: "p",
        text: "Le rappresentazioni delle origini e degli antenati sono impressioni statistiche generate dall'AI a partire da una foto. **Non sono test del DNA** e non possono stabilire la discendenza biologica. I riferimenti culturali sono generalizzati e possono essere imprecisi.",
      },

      { kind: "h", text: "9. Proprietà intellettuale" },
      {
        kind: "p",
        text: "Il nome Facelineage, il logo e l'interfaccia del Servizio sono di nostra proprietà. I report che generiamo per te (testi, immagini) puoi utilizzarli per scopi personali e non commerciali; non puoi ridistribuirli come prodotto concorrente.",
      },

      { kind: "h", text: "10. Cessazione" },
      {
        kind: "p",
        text: "Possiamo sospendere o chiudere gli account che violano i presenti Termini. Puoi eliminare il tuo account in qualsiasi momento dalla tua [pagina dell'account](/account) o scrivendoci.",
      },

      { kind: "h", text: "11. Esclusioni di garanzia" },
      {
        kind: "p",
        text: "Il Servizio è fornito \"così com'è\", senza garanzie di alcun tipo, espresse o implicite, nella misura consentita dalla legge. **Nulla nei presenti Termini limita i diritti che hai in quanto consumatore e che non possono essere limitati o esclusi ai sensi della legge applicabile.**",
      },

      { kind: "h", text: "12. Limitazione di responsabilità" },
      {
        kind: "p",
        text: "Nella misura massima consentita dalla legge, la nostra responsabilità complessiva nei tuoi confronti per qualsiasi pretesa derivante dal Servizio è limitata all'importo che ci hai pagato nei 12 mesi precedenti la pretesa. Nulla nei presenti Termini esclude la responsabilità che non può essere esclusa per legge (incluse morte, lesioni personali o frode).",
      },

      { kind: "h", text: "13. Legge applicabile e controversie" },
      {
        kind: "p",
        text: "I presenti Termini sono regolati dalla legge della **Lituania**, fatte salve le **norme imperative a tutela dei consumatori del tuo paese di residenza**, che continuano ad applicarsi nei tuoi confronti. I consumatori dell'UE possono inoltre utilizzare la piattaforma di risoluzione delle controversie online della Commissione europea all'indirizzo [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).",
      },

      { kind: "h", text: "14. Modifiche" },
      {
        kind: "p",
        text: "Potremmo aggiornare occasionalmente i presenti Termini. Le modifiche sostanziali saranno comunicate nell'app o via email prima della loro entrata in vigore.",
      },

      { kind: "h", text: "15. Contatti" },
      {
        kind: "p",
        text: "Domande su questi Termini? Scrivi a [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  cookies: {
    metaTitle: "Cookie Policy — Facelineage",
    metaDescription: "Come Facelineage utilizza i cookie e tecnologie simili.",
    title: "Cookie Policy",
    lastUpdated: "25 giugno 2026",
    blocks: [
      {
        kind: "p",
        text: "Questa pagina spiega quali cookie e tecnologie simili utilizza Facelineage e perché. Leggila insieme alla nostra [Informativa sulla privacy](/privacy).",
      },

      { kind: "h", text: "1. Che cos'è un cookie?" },
      {
        kind: "p",
        text: "Un cookie è un piccolo file di testo memorizzato sul tuo dispositivo dal browser. Tecnologie simili (local storage, session storage) funzionano in modo analogo, ma sono limitate alla sessione del browser o all'origine del sito.",
      },

      { kind: "h", text: "2. Cookie che utilizziamo" },
      { kind: "h3", text: "Strettamente necessari" },
      { kind: "p", text: "Indispensabili per il funzionamento del Servizio. Non richiedono il consenso e non possono essere disattivati." },
      {
        kind: "ul",
        items: [
          "**Autenticazione** — i cookie di sessione di Supabase ti mantengono connesso.",
          "**Stato del percorso** — cookie di breve durata e sessionStorage tengono traccia del passaggio del quiz, del paywall o del checkout in cui ti trovi, così un aggiornamento della pagina non ti fa perdere il punto.",
          "**Stripe** — Stripe imposta cookie per rilevare le frodi e abilitare i flussi Apple Pay / Google Pay / PayPal.",
        ],
      },
      { kind: "h3", text: "Analisi" },
      {
        kind: "p",
        text: "Metriche aggregate e rispettose della privacy sull'utilizzo (pagine visualizzate, conversione nel percorso). Non utilizziamo tracker pubblicitari cross-site. Ove richiesto dalla legge, li impostiamo solo con il tuo consenso.",
      },

      { kind: "h", text: "3. Terze parti" },
      { kind: "p", text: "Le seguenti terze parti possono impostare cookie tramite il nostro Servizio:" },
      {
        kind: "ul",
        items: ["Stripe (pagamenti)", "Supabase (autenticazione)", "Vercel (hosting / edge functions)"],
      },

      { kind: "h", text: "4. Gestione dei cookie" },
      {
        kind: "p",
        text: "Puoi cancellare o bloccare i cookie nelle impostazioni del browser. Tieni presente che bloccare i cookie strettamente necessari ti impedirà di accedere o di completare gli acquisti.",
      },

      { kind: "h", text: "5. Modifiche" },
      {
        kind: "p",
        text: "Potremmo aggiornare questa Cookie Policy di tanto in tanto. La versione più recente è sempre disponibile a questo indirizzo.",
      },

      { kind: "h", text: "6. Contatti" },
      {
        kind: "p",
        text: "Domande? Scrivi a [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  refunds: {
    metaTitle: "Politica di rimborso — Facelineage",
    metaDescription: "La nostra politica di rimborso e disdetta, e come si affianca ai tuoi diritti previsti dalla legge.",
    title: "Politica di rimborso",
    lastUpdated: "25 giugno 2026",
    blocks: [
      {
        kind: "p",
        text: "Vogliamo che tu sia soddisfatto del tuo acquisto. Se il tuo report non ha soddisfatto le tue aspettative, ti rimborsiamo — nessun modulo, nessuna domanda.",
      },
      {
        kind: "note",
        text: "Questa garanzia è offerta **volontariamente e in aggiunta** ai tuoi diritti di consumatore previsti dalla legge (incluso l'eventuale diritto di recesso descritto nei nostri [Termini di servizio](/terms)). Non riduce mai tali diritti.",
      },

      { kind: "h", text: "1. Periodo di rimborso" },
      {
        kind: "p",
        text: "Puoi richiedere un rimborso completo entro **30 giorni** dal tuo acquisto iniziale. Elaboriamo i rimborsi entro 5–10 giorni lavorativi sul metodo di pagamento originale.",
      },

      { kind: "h", text: "2. Come richiedere un rimborso" },
      {
        kind: "p",
        text: "Scrivi a [support@facelineage.com](mailto:support@facelineage.com) dall'indirizzo associato al tuo account. Indica:",
      },
      {
        kind: "ul",
        items: [
          "L'email utilizzata per la registrazione.",
          "La data del tuo acquisto.",
          "Le ultime 4 cifre della carta utilizzata.",
          "Una frase su cosa non ti ha convinto.",
        ],
      },

      { kind: "h", text: "3. Abbonamenti" },
      {
        kind: "ul",
        items: [
          "Il tuo pagamento introduttivo (ad es. 2,49 € per 3 giorni) copre il periodo introduttivo. Disdici prima che termini per evitare l'addebito del prezzo ricorrente.",
          "Puoi disdire in qualsiasi momento dalla tua [pagina dell'account](/account). La disdetta interrompe gli addebiti futuri; l'accesso prosegue fino alla fine del periodo in corso.",
          "Se dimentichi di disdire e ti viene addebitato un rinnovo che non hai utilizzato, contattaci entro 7 giorni dal rinnovo e ti rimborseremo l'addebito più recente.",
        ],
      },

      { kind: "h", text: "4. Extra una tantum" },
      {
        kind: "p",
        text: "Gli extra (analisi Mamma + Papà, Specchio delle Origini, Partner del Futuro, Attraverso le Epoche, Guida alle Origini) possono essere rimborsati entro 30 giorni dall'acquisto. Se abbiamo già generato il contenuto, il rimborso è a nostra discrezione; di solito rimborsiamo comunque chi acquista per la prima volta.",
      },

      { kind: "h", text: "5. Chargeback" },
      {
        kind: "p",
        text: "Ti preghiamo di contattarci prima di avviare un chargeback. Le contestazioni tramite la tua banca possono richiedere 60–90 giorni; contattandoci direttamente si risolve quasi sempre in un giorno.",
      },

      { kind: "h", text: "6. Esclusioni" },
      {
        kind: "p",
        text: "I rimborsi possono essere rifiutati in presenza di prove di abuso, come account con rimborsi ripetuti, foto caricate senza il consenso della persona ritratta o tentativi di sfruttare i contenuti a fini commerciali. Ciò non pregiudica i tuoi diritti previsti dalla legge.",
      },

      { kind: "h", text: "7. Contatti" },
      {
        kind: "p",
        text: "Scrivi a [support@facelineage.com](mailto:support@facelineage.com) — di solito rispondiamo entro un giorno lavorativo.",
      },
    ],
  },

  contact: {
    metaTitle: "Contattaci — Facelineage",
    metaDescription: "Mettiti in contatto con il team di Facelineage.",
    title: "Contattaci",
    lastUpdated: "25 giugno 2026",
    blocks: [
      {
        kind: "p",
        text: "Siamo un piccolo team e leggiamo ogni messaggio. Il modo più rapido per contattarci è l'email — di solito rispondiamo entro un giorno lavorativo.",
      },

      { kind: "h", text: "Società" },
      {
        kind: "p",
        text: "Facelineage è gestito da **Andromeda Entertainment, MB**, codice società **308005148**, Lituania. Sede legale: Žygio g. 5, Vilnius, Lituania.",
      },

      { kind: "h", text: "Email" },
      {
        kind: "p",
        text: "[support@facelineage.com](mailto:support@facelineage.com)",
      },

      { kind: "h", text: "Cosa indicare" },
      {
        kind: "ul",
        items: [
          "L'indirizzo email del tuo account, se ne hai uno.",
          "Una breve descrizione di ciò di cui hai bisogno.",
          "Screenshot, se qualcosa nel tuo report non ti sembra corretto.",
        ],
      },

      { kind: "h", text: "Richieste frequenti" },
      {
        kind: "ul",
        items: [
          "**Rimborsi e disdette** — consulta la nostra [Politica di rimborso](/refunds), poi scrivici.",
          "**Eliminazione dell'account o delle foto** — scrivici dall'indirizzo registrato e procederemo entro 30 giorni.",
          "**Privacy e richieste sui dati** — consulta la nostra [Informativa sulla privacy](/privacy) per conoscere i tuoi diritti, poi scrivici.",
          "**Segnalazioni di bug e idee** — sempre benvenute. Rilasciamo miglioramenti rapidamente in base al feedback reale degli utenti.",
          "**Stampa e partnership** — stessa email; indica \"stampa\" o \"partnership\" nell'oggetto.",
        ],
      },

      { kind: "h", text: "Tempi di risposta" },
      {
        kind: "p",
        text: "Dal lunedì al venerdì, 9:00–18:00. Le risposte nel fine settimana e nei giorni festivi possono richiedere più tempo. Per problemi di pagamento, scrivici prima di aprire un chargeback — contattandoci direttamente si risolve quasi sempre più in fretta.",
      },
    ],
  },
};
