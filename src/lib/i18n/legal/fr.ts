import type { LegalContent } from "./types";

/**
 * French legal content. Mirrors the shape of `legalEn`. Internal links and
 * mailto/external URLs are identical; only the visible text is translated.
 * Price examples use EUR to match the French checkout currency. Addresses the
 * user informally ("tu"), matching the UI.
 */
export const legalFr: LegalContent = {
  ui: {
    home: "Accueil",
    lastUpdated: "Dernière mise à jour :",
    questions: "Des questions ? Écris à",
  },

  privacy: {
    metaTitle: "Politique de confidentialité — Facelineage",
    metaDescription:
      "Comment Facelineage collecte, utilise et protège tes données personnelles, et les droits dont tu disposes en vertu du RGPD.",
    title: "Politique de confidentialité",
    lastUpdated: "25 juin 2026",
    blocks: [
      {
        kind: "p",
        text: "La présente Politique de confidentialité explique comment nous collectons, utilisons et protégeons tes données personnelles lorsque tu utilises facelineage.com et les services associés (le « Service »). Merci de la lire avec nos [Conditions d'utilisation](/terms) et notre [Politique relative aux cookies](/cookies).",
      },

      { kind: "h", text: "1. Qui sommes-nous (responsable du traitement)" },
      {
        kind: "p",
        text: "Le responsable du traitement de tes données personnelles est **Andromeda Entertainment, MB**, une petite société de personnes établie en Lituanie, code d'entreprise **308005148**, dont le siège social est situé Žygio g. 5, Vilnius, Lituanie (« nous », « notre », « nos »). Pour toute question relative à la confidentialité, tu peux nous contacter à [support@facelineage.com](mailto:support@facelineage.com).",
      },

      { kind: "h", text: "2. Les données que nous collectons" },
      {
        kind: "ul",
        items: [
          "**Les selfies** que tu importes pour l'analyse, ainsi que toute photo supplémentaire (par ex. des photos de tes parents) que tu soumets pour des options facultatives.",
          "**Les données sur les traits du visage** extraites de ta photo par notre IA pour produire ton analyse d'origines.",
          "**Les informations de compte** : ton adresse e-mail, utilisée pour l'authentification et l'envoi de ton rapport.",
          "**Les réponses au quiz** sur le contexte de tes origines que tu choisis de partager.",
          "**Les métadonnées de paiement** (4 derniers chiffres, réseau de la carte, pays) fournies par notre prestataire de paiement. Nous ne voyons ni ne conservons jamais le numéro complet de ta carte.",
          "**Les données techniques** : adresse IP, navigateur, type d'appareil et fuseau horaire, collectés automatiquement à des fins de sécurité et de mesure d'audience.",
        ],
      },

      { kind: "h", text: "3. Données sensibles et ton consentement explicite" },
      {
        kind: "p",
        text: "L'analyse des traits d'un visage peut impliquer des **catégories particulières de données personnelles** au sens de l'article 9 du RGPD. Nous traitons ta photo et les données sur les traits du visage qui en sont extraites **uniquement sur la base de ton consentement explicite**, que tu donnes en important ton selfie pour générer un rapport.",
      },
      {
        kind: "note",
        text: "Nous utilisons tes données faciales uniquement pour générer l'analyse que tu demandes. Nous ne les utilisons **pas** pour t'identifier sur d'autres services, créer un profil biométrique, les vendre ou entraîner une IA. Tu peux retirer ton consentement à tout moment en supprimant ta photo ou ton compte, ou en nous écrivant — le retrait n'affecte pas la licéité du traitement déjà effectué.",
      },

      { kind: "h", text: "4. Pourquoi nous utilisons tes données et nos bases légales" },
      {
        kind: "ul",
        items: [
          "Pour générer ton rapport d'origines personnalisé et tes options — **consentement explicite** (art. 9, par. 2, point a)) pour les données faciales ; **exécution de notre contrat** avec toi (art. 6, par. 1, point b)) pour le reste.",
          "Pour traiter les paiements et prévenir la fraude — **contrat** et nos **intérêts légitimes** à sécuriser le Service (art. 6, par. 1, point f)).",
          "Pour envoyer des e-mails transactionnels (liens de connexion, reçus, rapports) — **contrat**.",
          "Pour améliorer globalement la précision et la qualité de notre Service — **intérêts légitimes** ; nous n'utilisons pas ta photo individuelle à cette fin.",
          "Pour tenir nos registres comptables et fiscaux et répondre aux demandes légales — **obligation légale** (art. 6, par. 1, point c)).",
        ],
      },

      { kind: "h", text: "5. Traitement par l'IA" },
      {
        kind: "p",
        text: "Pour produire ton analyse, ta photo et les informations associées sont envoyées à des fournisseurs d'IA tiers (**Anthropic** et **Google**) agissant en tant que nos sous-traitants. Ils traitent les données uniquement pour nous renvoyer un résultat ; nous ne les autorisons pas à les utiliser pour entraîner leurs modèles. Ce traitement est couvert par le consentement explicite décrit à la section 3.",
      },

      { kind: "h", text: "6. Partage et destinataires" },
      { kind: "p", text: "Nous ne vendons **pas** tes données personnelles. Nous les partageons uniquement avec des prestataires agissant sur nos instructions :" },
      {
        kind: "ul",
        items: [
          "**Stripe** — traitement des paiements.",
          "**Supabase** — authentification et base de données/stockage.",
          "**Anthropic** et **Google** — inférence IA.",
          "**Vercel** — hébergement et diffusion de contenu.",
          "**Resend** — envoi des e-mails transactionnels.",
          "Les autorités publiques, lorsque la loi nous oblige à leur communiquer des données.",
        ],
      },

      { kind: "h", text: "7. Transferts internationaux" },
      {
        kind: "p",
        text: "Certains de nos prestataires traitent des données en dehors de l'Espace économique européen (par ex. aux États-Unis). Dans ce cas, le transfert est encadré par des garanties appropriées, telles que les **clauses contractuelles types** de la Commission européenne ou une décision d'adéquation. Tu peux demander une copie des garanties applicables en nous écrivant.",
      },

      { kind: "h", text: "8. Durée de conservation de tes données" },
      {
        kind: "ul",
        items: [
          "**Selfies et photos** — supprimés automatiquement dans les 30 jours suivant leur envoi, et plus tôt si tu les supprimes de ton compte.",
          "**Compte et rapports** — conservés tant que ton compte est actif ; supprimés dans les 30 jours suivant une demande de suppression du compte.",
          "**Données de paiement et comptables** — conservées aussi longtemps que l'exige le droit fiscal et comptable lituanien (généralement jusqu'à 10 ans).",
        ],
      },

      { kind: "h", text: "9. Tes droits" },
      {
        kind: "p",
        text: "En vertu du RGPD, tu disposes d'un droit d'**accès**, de **rectification**, d'**effacement** et de **limitation** du traitement de tes données, d'un droit à la **portabilité des données**, d'un droit d'**opposition** au traitement fondé sur nos intérêts légitimes, et du droit de **retirer ton consentement** à tout moment. Pour exercer l'un de ces droits, écris à [support@facelineage.com](mailto:support@facelineage.com) depuis l'adresse associée à ton compte. Nous répondons dans un délai d'un mois.",
      },
      {
        kind: "p",
        text: "Tu as également le droit d'introduire une réclamation auprès d'une autorité de contrôle — en France, la **Commission nationale de l'informatique et des libertés (CNIL)** ([cnil.fr](https://www.cnil.fr)) ; en Lituanie, l'**Inspection nationale de la protection des données (VDAI)** ([vdai.lrv.lt](https://vdai.lrv.lt)) ; ou l'autorité de ton pays de résidence.",
      },

      { kind: "h", text: "10. Décisions automatisées" },
      {
        kind: "p",
        text: "Ton rapport est généré automatiquement, mais il ne produit pas d'effets juridiques ni d'effets significatifs similaires te concernant au sens de l'article 22 du RGPD — il s'agit d'une impression à visée de divertissement, et non d'une décision sur tes droits, tes finances ou ta situation.",
      },

      { kind: "h", text: "11. Sécurité" },
      {
        kind: "p",
        text: "Nous utilisons le chiffrement des données en transit (HTTPS), le chiffrement du stockage au repos et des contrôles d'accès au niveau des lignes pour les données des utilisateurs. Aucun système n'est parfaitement sûr, mais nous appliquons des mesures conformes aux standards du secteur et nous t'informerons, ainsi que l'autorité compétente, de toute violation de données lorsque la loi l'exige.",
      },

      { kind: "h", text: "12. Enfants" },
      {
        kind: "p",
        text: "Le Service ne s'adresse pas aux enfants de moins de 16 ans, et nous ne collectons pas sciemment leurs données. Si tu penses qu'un mineur nous a fourni des informations, contacte-nous et nous les supprimerons.",
      },

      { kind: "h", text: "13. Modifications" },
      {
        kind: "p",
        text: "Nous pouvons mettre à jour cette politique de temps à autre. Nous modifierons la date ci-dessus et, en cas de changement important, nous t'en informerons dans l'application ou par e-mail.",
      },

      { kind: "h", text: "14. Contact" },
      {
        kind: "p",
        text: "Des questions sur cette politique ou sur tes données ? Écris à [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  terms: {
    metaTitle: "Conditions d'utilisation — Facelineage",
    metaDescription: "Les conditions régissant l'utilisation de Facelineage, y compris tes droits de consommateur dans l'UE.",
    title: "Conditions d'utilisation",
    lastUpdated: "25 juin 2026",
    blocks: [
      {
        kind: "p",
        text: "Les présentes Conditions régissent ton utilisation de Facelineage (le « Service »), exploité par **Andromeda Entertainment, MB**, code d'entreprise **308005148**, Lituanie. En utilisant le Service, tu acceptes les présentes Conditions. Si tu ne les acceptes pas, merci de ne pas utiliser le Service.",
      },

      { kind: "h", text: "1. Le Service" },
      {
        kind: "p",
        text: "Facelineage fournit des impressions d'origines et d'ascendance générées par IA à partir d'un selfie envoyé par l'utilisateur et d'un contexte facultatif. Les rapports sont fournis **uniquement à des fins de divertissement et d'inspiration** et ne constituent pas un avis scientifique, médical, généalogique ou juridique.",
      },

      { kind: "h", text: "2. Compte et conditions d'accès" },
      {
        kind: "ul",
        items: [
          "Tu dois avoir au moins 16 ans pour utiliser le Service.",
          "Tu dois fournir une adresse e-mail valide.",
          "Tu es responsable de l'activité sur ton compte.",
        ],
      },

      { kind: "h", text: "3. Contenu des photos et droits" },
      {
        kind: "p",
        text: "En important une photo, tu confirmes que tu as le droit de le faire — il s'agit d'une photo de toi, ou tu disposes de l'autorisation explicite de la personne représentée (cela s'applique à la photo d'un parent utilisée pour la répartition Maman + Papa). Tu nous accordes une licence limitée pour traiter la photo uniquement afin de fournir le Service. Nous ne revendiquons aucun droit de propriété sur tes photos.",
      },

      { kind: "h", text: "4. Abonnements, prix et renouvellement automatique" },
      {
        kind: "ul",
        items: [
          "La plupart des formules commencent par une période de lancement payante (par exemple, 2,49 € pour 3 jours), puis **se renouvellent automatiquement** au prix normal (par exemple, 49 €/mois) jusqu'à ce que tu résilies. Les prix exacts, la période de lancement et les conditions de renouvellement te sont présentés lors du paiement, avant que tu ne payes.",
          "Les paiements de renouvellement sont prélevés automatiquement sur ton moyen de paiement enregistré. Nous t'envoyons un rappel par e-mail avant chaque renouvellement.",
          "Tu peux résilier à tout moment depuis ta [page de compte](/account). La résiliation met fin aux prélèvements futurs et prend effet à la fin de la période payée en cours ; tu conserves l'accès jusqu'à cette date.",
          "Les achats d'options (par ex. Miroir des origines, Futur(e) partenaire) sont des paiements uniques facturés immédiatement.",
        ],
      },

      { kind: "h", text: "5. Ton droit de rétractation (consommateurs dans l'UE)" },
      {
        kind: "p",
        text: "Si tu es un consommateur dans l'UE, tu disposes en principe d'un droit de rétractation de **14 jours** pour un contrat conclu à distance, sans avoir à te justifier (articles L221-18 et suivants du Code de la consommation). Facelineage étant un contenu numérique et un service fourni immédiatement, les règles suivantes s'appliquent :",
      },
      {
        kind: "note",
        text: "En achetant et en lançant ton rapport, tu **demandes expressément que l'exécution commence immédiatement, avant la fin du délai de rétractation**, et tu **reconnais perdre ton droit de rétractation de 14 jours** une fois le service pleinement exécuté (c'est-à-dire une fois ton rapport ou ton option générés et livrés), conformément à l'article L221-28 du Code de la consommation. Pour un abonnement, le droit de rétractation s'applique à la partie du service non encore exécutée. Cela n'affecte pas le remboursement volontaire distinct décrit dans notre [Politique de remboursement](/refunds).",
      },

      { kind: "h", text: "6. Remboursements" },
      {
        kind: "p",
        text: "En plus de tes droits légaux, nous offrons une garantie volontaire « satisfait ou remboursé ». Consulte notre [Politique de remboursement](/refunds) pour savoir comment demander un remboursement.",
      },

      { kind: "h", text: "7. Utilisation acceptable" },
      { kind: "p", text: "Tu t'engages à ne pas :" },
      {
        kind: "ul",
        items: [
          "Importer des photos de quiconque sans son consentement (y compris de mineurs).",
          "Utiliser le Service à des fins de surveillance, de harcèlement ou de divulgation de données personnelles (doxxing).",
          "Faire de la rétro-ingénierie, extraire automatiquement des données (scraping) ou abuser du Service de toute autre manière.",
          "Utiliser les résultats de Facelineage pour prendre des décisions importantes concernant une autre personne (embauche, crédit, immigration, etc.).",
        ],
      },

      { kind: "h", text: "8. Limites de l'IA" },
      {
        kind: "p",
        text: "Les origines et les portraits d'ancêtres sont des impressions statistiques générées par IA à partir d'une photo. Ce **ne sont pas des tests ADN** et ils ne peuvent pas établir une ascendance biologique. Les références culturelles sont généralisées et peuvent être inexactes.",
      },

      { kind: "h", text: "9. Propriété intellectuelle" },
      {
        kind: "p",
        text: "Le nom Facelineage, son logo et l'interface du Service nous appartiennent. Les rapports que nous générons pour toi (textes, images) t'appartiennent pour un usage personnel et non commercial ; tu ne peux pas les redistribuer en tant que produit concurrent.",
      },

      { kind: "h", text: "10. Résiliation du compte" },
      {
        kind: "p",
        text: "Nous pouvons suspendre ou supprimer les comptes qui enfreignent les présentes Conditions. Tu peux supprimer ton compte à tout moment depuis ta [page de compte](/account) ou en nous écrivant.",
      },

      { kind: "h", text: "11. Exclusions de garantie" },
      {
        kind: "p",
        text: "Le Service est fourni « en l'état », sans garantie d'aucune sorte, expresse ou implicite, dans la mesure permise par la loi. **Rien dans les présentes Conditions ne limite les droits dont tu disposes en tant que consommateur et qui ne peuvent être limités ou exclus en vertu de la loi applicable.**",
      },

      { kind: "h", text: "12. Limitation de responsabilité" },
      {
        kind: "p",
        text: "Dans toute la mesure permise par la loi, notre responsabilité totale envers toi pour toute réclamation liée au Service est limitée au montant que tu nous as payé au cours des 12 mois précédant la réclamation. Rien dans les présentes Conditions n'exclut une responsabilité qui ne peut être exclue par la loi (notamment en cas de décès, de dommage corporel ou de fraude).",
      },

      { kind: "h", text: "13. Droit applicable et litiges" },
      {
        kind: "p",
        text: "Les présentes Conditions sont régies par le droit **lituanien**, sans préjudice des **dispositions impératives de protection des consommateurs de ton pays de résidence**, qui continuent de s'appliquer à toi. Les consommateurs de l'UE peuvent également utiliser la plateforme de règlement en ligne des litiges de la Commission européenne à l'adresse [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).",
      },

      { kind: "h", text: "14. Modifications" },
      {
        kind: "p",
        text: "Nous pouvons mettre à jour ces Conditions de temps à autre. Les modifications importantes seront annoncées dans l'application ou par e-mail avant leur entrée en vigueur.",
      },

      { kind: "h", text: "15. Contact" },
      {
        kind: "p",
        text: "Des questions sur ces Conditions ? Écris à [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  cookies: {
    metaTitle: "Politique relative aux cookies — Facelineage",
    metaDescription: "Comment Facelineage utilise les cookies et technologies similaires.",
    title: "Politique relative aux cookies",
    lastUpdated: "25 juin 2026",
    blocks: [
      {
        kind: "p",
        text: "Cette page explique quels cookies et technologies similaires Facelineage utilise, et pourquoi. Lis-la avec notre [Politique de confidentialité](/privacy).",
      },

      { kind: "h", text: "1. Qu'est-ce qu'un cookie ?" },
      {
        kind: "p",
        text: "Un cookie est un petit fichier texte enregistré sur ton appareil par ton navigateur. Les technologies similaires (stockage local, stockage de session) fonctionnent de manière comparable, mais sont limitées à ta session de navigation ou à l'origine du site.",
      },

      { kind: "h", text: "2. Les cookies que nous utilisons" },
      { kind: "h3", text: "Strictement nécessaires" },
      { kind: "p", text: "Indispensables au fonctionnement du Service. Ils ne nécessitent pas de consentement et ne peuvent pas être désactivés." },
      {
        kind: "ul",
        items: [
          "**Authentification** — les cookies de session Supabase te permettent de rester connecté(e).",
          "**État du parcours** — des cookies de courte durée et le sessionStorage mémorisent l'étape du quiz, de l'offre ou du paiement où tu te trouves, pour qu'une actualisation ne te fasse pas perdre ta progression.",
          "**Stripe** — Stripe dépose des cookies pour détecter la fraude et permettre les paiements Apple Pay / Google Pay / PayPal.",
        ],
      },
      { kind: "h3", text: "Mesure d'audience" },
      {
        kind: "p",
        text: "Des statistiques d'utilisation agrégées et respectueuses de la vie privée (pages vues, conversion du parcours). Nous n'utilisons pas de traceurs publicitaires intersites. Lorsque la loi l'exige, nous ne les déposons qu'avec ton consentement.",
      },

      { kind: "h", text: "3. Tiers" },
      { kind: "p", text: "Les tiers suivants peuvent déposer des cookies via notre Service :" },
      {
        kind: "ul",
        items: ["Stripe (paiements)", "Supabase (authentification)", "Vercel (hébergement / fonctions edge)"],
      },

      { kind: "h", text: "4. Gérer les cookies" },
      {
        kind: "p",
        text: "Tu peux supprimer ou bloquer les cookies dans les paramètres de ton navigateur. Note que bloquer les cookies strictement nécessaires t'empêchera de te connecter ou de finaliser un achat.",
      },

      { kind: "h", text: "5. Modifications" },
      {
        kind: "p",
        text: "Nous pouvons mettre à jour cette Politique relative aux cookies de temps à autre. La dernière version est toujours disponible à cette adresse.",
      },

      { kind: "h", text: "6. Contact" },
      {
        kind: "p",
        text: "Des questions ? Écris à [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  refunds: {
    metaTitle: "Politique de remboursement — Facelineage",
    metaDescription: "Notre politique de remboursement et de résiliation, et son articulation avec tes droits légaux.",
    title: "Politique de remboursement",
    lastUpdated: "25 juin 2026",
    blocks: [
      {
        kind: "p",
        text: "Nous voulons que tu sois satisfait(e) de ton achat. Si ton rapport n'a pas répondu à tes attentes, nous te rembourserons — sans formulaire, sans questions.",
      },
      {
        kind: "note",
        text: "Cette garantie est offerte **volontairement et en complément** de tes droits légaux de consommateur (y compris le droit de rétractation décrit dans nos [Conditions d'utilisation](/terms)). Elle ne restreint jamais ces droits.",
      },

      { kind: "h", text: "1. Délai de remboursement" },
      {
        kind: "p",
        text: "Tu peux demander un remboursement intégral dans les **30 jours** suivant ton achat initial. Nous traitons les remboursements sous 5 à 10 jours ouvrés, sur le moyen de paiement d'origine.",
      },

      { kind: "h", text: "2. Comment demander un remboursement" },
      {
        kind: "p",
        text: "Écris à [support@facelineage.com](mailto:support@facelineage.com) depuis l'adresse associée à ton compte. Indique :",
      },
      {
        kind: "ul",
        items: [
          "L'e-mail utilisé lors de l'inscription.",
          "La date de ton achat.",
          "Les 4 derniers chiffres de la carte utilisée.",
          "Une phrase sur ce qui ne t'a pas convenu.",
        ],
      },

      { kind: "h", text: "3. Abonnements" },
      {
        kind: "ul",
        items: [
          "Ton paiement de lancement (par ex. 2,49 € pour 3 jours) couvre ta période de lancement. Résilie avant la fin de celle-ci pour éviter d'être débité(e) du prix récurrent.",
          "Tu peux résilier à tout moment depuis ta [page de compte](/account). La résiliation met fin aux prélèvements futurs ; l'accès continue jusqu'à la fin de la période en cours.",
          "Si tu oublies de résilier et que tu es débité(e) d'un renouvellement que tu n'as pas utilisé, contacte-nous dans les 7 jours suivant le renouvellement et nous te rembourserons le dernier prélèvement.",
        ],
      },

      { kind: "h", text: "4. Options à paiement unique" },
      {
        kind: "p",
        text: "Les options (répartition Maman + Papa, Miroir des origines, Futur(e) partenaire, À travers les âges, Guide des origines) peuvent être remboursées dans les 30 jours suivant l'achat. Si nous avons déjà généré le contenu, le remboursement est à notre discrétion ; en général, nous remboursons tout de même les clients qui achètent pour la première fois.",
      },

      { kind: "h", text: "5. Rétrofacturations (chargebacks)" },
      {
        kind: "p",
        text: "Merci de nous contacter avant d'engager une procédure de rétrofacturation. Les litiges ouverts auprès de ta banque peuvent prendre 60 à 90 jours ; un contact direct règle presque toujours la situation en une journée.",
      },

      { kind: "h", text: "6. Exclusions" },
      {
        kind: "p",
        text: "Un remboursement peut être refusé en cas de preuve d'abus, comme des comptes demandant des remboursements à répétition, des photos importées sans le consentement de la personne représentée ou des tentatives d'exploitation commerciale du contenu. Cela n'affecte pas tes droits légaux.",
      },

      { kind: "h", text: "7. Contact" },
      {
        kind: "p",
        text: "Écris à [support@facelineage.com](mailto:support@facelineage.com) — nous répondons généralement sous un jour ouvré.",
      },
    ],
  },

  contact: {
    metaTitle: "Nous contacter — Facelineage",
    metaDescription: "Contacte l'équipe Facelineage.",
    title: "Nous contacter",
    lastUpdated: "25 juin 2026",
    blocks: [
      {
        kind: "p",
        text: "Nous sommes une petite équipe et nous lisons chaque message. Le moyen le plus rapide de nous joindre est l'e-mail — nous répondons généralement sous un jour ouvré.",
      },

      { kind: "h", text: "Société" },
      {
        kind: "p",
        text: "Facelineage est exploité par **Andromeda Entertainment, MB**, code d'entreprise **308005148**, Lituanie. Siège social : Žygio g. 5, Vilnius, Lituanie.",
      },

      { kind: "h", text: "E-mail" },
      {
        kind: "p",
        text: "[support@facelineage.com](mailto:support@facelineage.com)",
      },

      { kind: "h", text: "Ce qu'il faut indiquer" },
      {
        kind: "ul",
        items: [
          "L'adresse e-mail associée à ton compte, si tu en as un.",
          "Une brève description de ta demande.",
          "Des captures d'écran, si quelque chose semble anormal dans ton rapport.",
        ],
      },

      { kind: "h", text: "Demandes fréquentes" },
      {
        kind: "ul",
        items: [
          "**Remboursements et résiliations** — consulte notre [Politique de remboursement](/refunds), puis écris-nous.",
          "**Suppression du compte ou des photos** — écris-nous depuis l'adresse enregistrée et nous traiterons ta demande sous 30 jours.",
          "**Confidentialité et demandes relatives aux données** — consulte notre [Politique de confidentialité](/privacy) pour connaître tes droits, puis écris-nous.",
          "**Signalement de bugs et idées de fonctionnalités** — toujours bienvenus. Nous avançons vite grâce aux retours de nos utilisateurs.",
          "**Presse et partenariats** — même adresse ; indique « presse » ou « partenariat » dans l'objet.",
        ],
      },

      { kind: "h", text: "Délais de réponse" },
      {
        kind: "p",
        text: "Du lundi au vendredi, de 9 h à 18 h. Les réponses le week-end et les jours fériés peuvent prendre plus de temps. Pour tout problème de paiement, écris-nous avant d'ouvrir une rétrofacturation — un contact direct règle presque toujours les choses plus rapidement.",
      },
    ],
  },
};
