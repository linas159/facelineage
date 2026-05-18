/**
 * English dictionary — the source of truth. All other locales must match
 * its shape (TypeScript enforces this via `satisfies Dictionary`).
 *
 * Keep strings flat-ish (max 2-3 levels of nesting). Avoid stringing
 * partial sentences together — keep each user-facing line as one entry
 * so translators don't have to wrestle with grammar reordering.
 */
// Note: NOT `as const` — we want widened `string` types so translations
// in other locales can plug in different strings under the same shape.
export const en = {
  meta: {
    title: "Facelineage — Discover where your face really comes from",
    description:
      "AI heritage analysis from a single selfie. Discover your ancestral regions, see your ancestor's portrait, and read your personalized heritage story.",
  },

  nav: {
    signIn: "Sign in",
    askForRefund: "Ask for refund",
  },

  footer: {
    copy: "© {year} Facelineage",
    privacy: "Privacy",
    terms: "Terms",
    cookies: "Cookies",
    refunds: "Refunds",
    contact: "Contact",
  },

  landing: {
    heroBadge: "AI Heritage Scan",
    heroHeadline: "Where does your face really come from?",
    heroSubhead:
      "AI analyzes your selfie to reveal your hidden heritage in 60 seconds.",
    heroCta: "Begin my analysis →",
    heroRating: "★ 4.8 from 12,000+ users · ~90 seconds",
    statsReports: "reports",
    statsRegions: "regions",
    statsAvgScan: "avg scan",
    howItWorksEyebrow: "How it works",
    howItWorksHeading: "Three steps to your story",
    step1Title: "Tell us about you",
    step1Body: "Three quick questions to personalize your reading.",
    step2Title: "Snap a selfie",
    step2Body: "Front-facing, well-lit. Photo deletes after 30 days.",
    step3Title: "Read your story",
    step3Body: "Heritage breakdown, migration map, cultural ties — and more.",
    sampleEyebrow: "Sample report",
    sampleHeading: "What you'll discover",
    sampleBody: "Heritage breakdown, an interactive world map, six facial-trait clues, cultural ties, and a painted portrait of your ancestor.",
    ancestorPortraitTitle: "Your ancestor portrait",
    ancestorPortraitBody: "A painted face composed from your strongest matches — eight generations back.",
    viewSampleReport: "View full sample report →",
    mirrorBadge: "Heritage Mirror",
    mirrorHeadlineA: "Watch your face",
    mirrorHeadlineB: "travel the world",
    mirrorBody: "Same bones, every culture. Five reflections, drawn from the heritage written into your features.",
    mirrorCta: "Show me my reflections →",
    mirrorTagline: "Powered by your selfie · Cancel anytime",
    testimonialsHeading: "Our explorers trust us",
    testimonialsImageAlt: "People who've discovered their heritage",
    trustBigNumber: "12,000+",
    trustBigNumberSub: "ancestry reads delivered across 90+ countries",
    trustRating: "4.8",
    trustRatingSub: "Based on 3,200+ verified reviews",
    trustOutOf5: " out of 5",
    trustVerifiedOn: "Verified on",
    trust5Stars: "5 stars",
    ctaReady: "Ready to meet your ancestors?",
    ctaSub: "Free quiz · No account needed to begin",
    ctaButton: "Begin my analysis →",
  },

  // Regional labels shown in the Heritage Mirror morphing portrait + sample
  // report chips. Country/region names that ARE truly locale-dependent.
  regions: {
    eastAsia: "East Asia",
    westAfrica: "West Africa",
    northernEurope: "Northern Europe",
    southAsia: "South Asia",
    southAmerica: "South America",
    hanChinese: "Han Chinese",
    yoruba: "Yoruba",
    sami: "Sami",
    bengali: "Bengali",
    quechua: "Quechua",
  },

  // Hero portrait flag callout labels.
  flagLabels: {
    swedish: "Swedish",
    nigerian: "Nigerian",
    chinese: "Chinese",
    german: "German",
    indian: "Indian",
    spanish: "Spanish",
  },

  // Testimonial quotes — keyed by the name in testimonials-data.ts so the
  // section can render localized text without changing the data file.
  testimonialQuotes: {
    mayaR: "The map of where my ancestors traveled gave me chills. I cried reading the heritage story.",
    danielK: "I'd taken a 23andMe and the regions matched almost exactly. I was not expecting that from a photo.",
    priyaS: "I shared my report in our family group chat and now my mum and dad both want to do it.",
    carlosM: "Beautifully written. It reads like someone took the time to tell my family's story.",
    aikoT: "The cultural insights were so spot on it felt like a horoscope that finally made sense.",
  },

  quiz: {
    q1: {
      q: "What gender do you identify as?",
      female: "Female",
      male: "Male",
      other: "Other",
    },
    q2: {
      q: "What pulled you here today?",
      whereFrom: "I want to know where I'm really from",
      features: "I'm curious about my features",
      mystery: "There's a family-history mystery",
      fun: "Just for fun",
    },
    q3: {
      q: "Has anyone ever asked you, “Where are you from?”",
      allTheTime: "All the time",
      nowAndThen: "Now and then",
      hardlyEver: "Hardly ever",
      loveIt: "I love when they do",
    },
    q4: {
      q: "What would surprise you most to discover?",
      unexpected: "Heritage from a place I'd never expect",
      royal: "Noble or royal bloodline",
      ancient: "A trait shared with an ancient people",
      mixed: "More mixed than I imagined",
    },
    q5: {
      q: "What is your age?",
      under18: "<18",
      a18_24: "18–24",
      a25_34: "25–34",
      a35_44: "35–44",
      a45_54: "45–54",
      a55plus: "55+",
    },
    q6: {
      q: "What do you know about your family's roots?",
      sameCountry: "Same country as me, going back generations",
      parentsMoved: "One or both parents came from somewhere else",
      mix: "My family is a mix of several places",
      noIdea: "Honestly, no idea",
    },
  },

  capture: {
    headline: "Now show us your face",
    body: "A clear, front-facing photo gives the most accurate analysis. We delete it after 30 days and never share it.",
    takeButton: "Take a selfie",
    uploadButton: "Upload from photos",
    confirmButton: "Looks good — analyze it",
    uploading: "Uploading…",
    retakeButton: "Try again",
    trustEncrypted: "Encrypted",
    trustDeleted: "Auto-deleted in 30 days",
    trustNoFace: "Never shared",
  },

  analyzing: {
    headline: "Analyzing your ancestry…",
    percentComplete: "{n}% complete",
    questionEyebrow: "While we work — one quick question",
    phases: {
      landmarks: "Detecting facial landmarks",
      structure: "Mapping bone structure & skin tone",
      populations: "Cross-referencing 94 populations",
      migration: "Tracing migration paths",
      story: "Composing your heritage story",
    },
    midQuestions: {
      grandparentsQ: "Where did your grandparents come from?",
      grandparentsA1: "The same country as me",
      grandparentsA2: "One was foreign-born",
      grandparentsA3: "Multiple countries",
      grandparentsA4: "I'm not sure",

      languageQ: "Did you grow up speaking another language at home?",
      languageA1: "Yes, fluently",
      languageA2: "Yes, a little",
      languageA3: "No",
      languageA4: "I learned later",

      heritageQ: "What part of your heritage matters most to you?",
      heritageA1: "Food & traditions",
      heritageA2: "Family stories",
      heritageA3: "The migrations themselves",
      heritageA4: "Religion or beliefs",

      dnaQ: "Have you taken a DNA ancestry test before?",
      dnaA1: "Yes — 23andMe",
      dnaA2: "Yes — AncestryDNA",
      dnaA3: "Yes — another",
      dnaA4: "No, never",
    },
  },

  email: {
    chip: "Your analysis is ready",
    headline: "Where should we send your report?",
    body: "We'll email your heritage breakdown, ancestor portrait, and a link to revisit anytime.",
    label: "Email address",
    placeholder: "you@example.com",
    button: "Continue",
    saving: "Saving…",
    invalid: "Please enter a valid email address.",
    saveFailed: "Could not save email",
    terms: "We'll never share your email. By continuing you agree to our {terms} and {privacy}.",
    termsLink: "Terms",
    privacyLink: "Privacy Policy",
  },

  paywall: {
    offerBannerTitle: "Special offer reserved for you",
    offerBannerSub: "Lock in your discounted price",
    offerExpiring: "Offer about to expire",
    offerLeft: "left",
    analyzedChip: "Analyzed",
    statusReady: "Your analysis is ready",
    mainHeadline: "Unlock your full report",
    mainSubhead:
      "Heritage breakdown · Migration map · Personalized story · Shareable card",
    unlockCta: "Unlock my report",
    previewLabel: "Preview",
    previewTitle: "Your top heritage matches",
    lockedLabel: "Locked",
    unlockToReveal: "Unlock to reveal real percentages",
    ancestorTeaserTitle: "Your ancestor portrait",
    ancestorTeaserSub: "A painted face, eight generations back.",
    migrationTeaserTitle: "Your migration map",
    migrationTeaserSub: "The routes your ancestors likely walked, sailed, and traded across.",
    discoverEyebrow: "What you'll discover",
    discoverHeading: "Inside your full report",
    feat1Title: "Heritage breakdown",
    feat1Desc: "Percentage match across 94 ancestral regions.",
    feat2Title: "Migration map",
    feat2Desc: "Animated routes your ancestors likely traveled.",
    feat3Title: "Personalized story",
    feat3Desc: "A written narrative tying your features to history.",
    feat4Title: "Family resemblance hints",
    feat4Desc: "Which traits typically pass down — and from which side.",
    feat5Title: "Your ancestor portrait",
    feat5Desc: "A painted portrait built from your strongest matches — what an ancestor eight generations back may have looked like.",
    pickAccessLabel: "Pick your access",
    planLabel3d: "3-Day",
    planLabel7d: "7-Day",
    planLabel1m: "1-Month",
    planBadgeMostPopular: "Most popular",
    chargeButton: "Charge {label} for {price}",
    chargingButton: "Charging…",
    useDifferentCard: "Use a different payment method",
    unlockMyReportPriced: "Unlock my report — {price}",
    loading: "Loading…",
    autoRenew:
      "Your {period} trial will cost only {introPrice}. Without cancellation before the selected discounted intro plan ends, I accept that Facelineage will automatically charge {recurring} until I cancel.",
    refundTitle: "30-day money-back guarantee",
    refundBody:
      "Not loving your report? Email us and we'll refund you. No hoops, no questions.",
    testimonialsHeading: "Loved by 12,000+ explorers",
    bigTrustGuaranteeTitle: "Loved it, or get your money back",
    bigTrustGuaranteeP1: "Reading the story written into your face is something we take seriously. Every report is built to feel personal, surprising, and worth keeping — not a generic algorithm output dressed up with stock copy.",
    bigTrustGuaranteeP2: "If yours doesn't hit that bar — or you simply change your mind — send us a line within 30 days. We'll refund the full amount. No forms, no reasons to explain, no awkward follow-ups.",
    bigTrustPrivacyTitle: "Your selfie stays yours",
    bigTrustPrivacyP1: "Your photo does one job: powering your single heritage analysis. It travels over an encrypted connection, sits on our servers only as long as we need it, and auto-deletes after 30 days.",
    bigTrustPrivacyP2: "We never sell it, never hand it to advertisers, and never feed it back into a training set. Want it gone sooner? Wipe it from your account in one tap.",
    finalCtaTitle: "Your story is one tap away",
    finalCtaSub: "Cancel anytime · Refund within 30 days · Photo deleted in 30 days",
    finalCtaButton: "Unlock for {price}",
    // Period descriptions used in the auto-renew legal line.
    period3d: "3 day",
    period7d: "7 day",
    period1m: "1 month",
    recurringWeekly: "{price} every week",
    recurringMonthly: "{price} every month",
    // Sample regions shown blurred in the preview card.
    sampleRegion1: "Northern European",
    sampleRegion2: "Iberian Peninsula",
    sampleRegion3: "Mediterranean",
    sampleRegion4: "West African",
  },

  checkout: {
    secureCheckout: "Secure checkout",
    unlockYourReport: "Unlock your report",
    addUpsell: "Add: {label}",
    introCharge: "Today's charge covers your {period} access.",
    oneTimePurchase: "One-time purchase.",
    chargedToday: "Charged today",
    orPayWithCard: "or pay with card",
    pay: "Pay {price}",
    processing: "Processing…",
    cancel: "Cancel",
    stripeNote: "Payments are processed by Stripe. Your card details never touch our servers.",
    loaderPhases: {
      p1: "Preparing secure checkout…",
      p2: "Talking to Stripe…",
      p3: "Setting up payment options…",
      p4: "Almost there…",
    },
    loaderSub: "This usually takes a few seconds.",
    payWithPaypalAria: "Pay with PayPal",
    paypalRedirecting: "Redirecting to PayPal…",
    paypalFailed: "Could not start PayPal",
    couldNotStart: "Could not start checkout",
  },

  paymentComplete: {
    title: "Hmm, something didn't line up.",
    missingDetails: "Missing payment details. If you were charged, please contact support.",
    couldntVerify: "Couldn't verify the payment. Please contact support.",
    notSucceeded: "Payment is {status}. Please try again or contact support.",
    couldntLink: "Payment confirmed but we couldn't link it to your account. Please contact support.",
    couldntProvision: "Couldn't provision your account. Please contact support.",
    signInFallback: "Couldn't sign you in automatically. Please log in via the email we sent.",
  },

  report: {
    composing: "Composing your report",
    usuallyMinute: "This usually takes a minute. Feel free to keep this tab open.",
    failedTitle: "Something went wrong",
    failedBody: "We couldn't finish your report. Please contact support — your purchase is on file.",
    // Phase labels rotated under the spinner.
    phaseReading: "Reading your selfie",
    phaseMapping: "Mapping ancestral regions",
    phaseStory: "Composing your heritage story",
    phasePainting: "Painting your ancestor portrait",
    phaseRendering: "Rendering cultural scenes",
  },

  upsells: {
    sectionHeading: "Take your story further",
    sectionSubhead: "Optional one-time purchases — keep them forever.",
    oneTime: "One-time",
    saleBadge: "-45% off today",
    processing: "Processing payment…",
    purchasedGenerating: "✓ Purchased — generating now",
    networkError: "Network error — please try again",
    paymentFailed: "Payment failed",
    addedHeading: "{title} — added!",
    chargedCardBody: "We charged your card on file. You'll find it on your dashboard.",
    continue: "Continue",
    noThanks: "No thanks, maybe later",
    closeAria: "Close",
    // Each upsell — title/subtitle/body/cta.
    parentsTitle: "See what came from each parent",
    parentsSubtitle: "Mom + Dad breakdown",
    parentsBody: "Upload a photo of each parent. We'll trace which features and which slices of heritage you inherited from each side, with a side-by-side comparison.",
    parentsCta: "Add my parents",
    ethnicityTitle: "See yourself in every culture",
    ethnicitySubtitle: "Heritage Mirror",
    ethnicityBody: "Watch your face reborn as a Han poet, a Yoruba weaver, a Sami reindeer herder — and a dozen more reflections from across the world.",
    ethnicityCta: "Show my reflections",
    agesTitle: "See yourself across the ages",
    agesSubtitle: "8 historical portraits",
    agesBody: "What if you'd lived in Tang-dynasty China, ancient Rome, or the Viking age? We generate eight portraits of you across history.",
    agesCta: "Generate my portraits",
    partnerTitle: "Meet your future partner",
    partnerSubtitle: "AI face match",
    partnerBody: "Based on the proportions, palette, and heritage of your face, we render a portrait of the kind of person who would balance you most.",
    partnerCta: "Reveal my match",
    bookTitle: "The Heritage Guidebook",
    bookSubtitle: "Your ancestry research companion",
    bookBody: "Methods, tools, and frameworks for taking your heritage discovery further: how to trace ancestors, decode DNA results, conduct oral histories, and read old records. A printable PDF you keep forever.",
    bookCta: "Get the guidebook",
  },
};

// Recursive "every leaf is a string" — derives the shape from `en` so adding
// a key only requires editing `en` (the source of truth) and TypeScript
// flags any other locale that's missing it.
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};
export type Dictionary = DeepStringify<typeof en>;
