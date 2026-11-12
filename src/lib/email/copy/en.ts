/**
 * English transactional-email copy — the source of truth; other locales must
 * match its shape (`EmailCopy`). Kept out of the UI dictionaries so it never
 * ships in the client bundle.
 *
 * Plain text with `{placeholders}`. Templates escape the text and then splice
 * in the values (sometimes wrapped in <strong>), so never put HTML here.
 * Billing wording is dispute-sensitive: translations must say exactly what
 * the English says — no softer, no stronger.
 */
export const en = {
  hello: "Hello,",
  helloName: "Hi {name},",
  signature: "— Facelineage",
  footerQuestions: "Questions? Reply to this email or write to {email}.",
  footerPrivacy: "Privacy",
  footerTerms: "Terms",
  footerRefunds: "Refunds",
  footerContact: "Contact",
  footerRefundPolicy: "Refund policy",
  footerManage: "Manage subscription",
  footerAccount: "Account",

  // "{amount}/week" etc. — used wherever a recurring price is quoted.
  perInterval: {
    day: "{amount}/day",
    week: "{amount}/week",
    month: "{amount}/month",
    year: "{amount}/year",
  },

  reportReady: {
    subject: "Your Facelineage report is ready ✨",
    preheader: "Your AI heritage report is ready to view. Tap below to see your full ancestry breakdown.",
    headline: "Your report is ready",
    subhead: "We've finished composing your heritage breakdown, ancestor portrait, and story.",
    lead: "Your personalized Facelineage report is ready. We mapped your features to ancestral regions and rendered a portrait of one of your possible ancestors.",
    cta: "View my report →",
    insideTitle: "Inside your report",
    item1Title: "Heritage breakdown",
    item1Body: "Percentage match across 94 ancestral regions.",
    item2Title: "Migration map",
    item2Body: "The routes your ancestors likely traveled.",
    item3Title: "Ancestor portrait",
    item3Body: "A painted impression from eight generations back.",
    item4Title: "Heritage story",
    item4Body: "A narrative tying your features to history.",
    receiptTitle: "Receipt",
    chargedToday: "Charged today",
    date: "Date",
    card: "Card",
    // {trialEnds} and {recurring} are emphasised; {account} is a link labelled accountLink.
    trialNotice: "Your trial covers full access until {trialEnds}. If you don't cancel before then, your subscription renews at {recurring}. You can cancel anytime from your {account}.",
    accountLink: "account page",
    trialEndFallback: "the end of your trial",
    textReady: "Your Facelineage report is ready.",
    textView: "View your report: {url}",
    textCharged: "Charged today: {amount} on {date}",
    textCard: " (card ending {last4})",
    textTrial: "Trial ends: {trialEnds} — renews at {recurring} unless you cancel.",
    textCancel: "Cancel anytime: {url}",
    textQuestions: "Questions? {email}",
  },

  upcomingCharge: {
    // Relative "when" phrases. Days ≥ 2 use Intl.RelativeTimeFormat, so only
    // "later today" needs copy.
    laterToday: "later today",
    subjectFirst: "Your Facelineage trial ends {when} — {amount} on {date}",
    subjectRenewal: "Reminder: your Facelineage subscription renews {when} — {amount}",
    headlineFirst: "Your trial ends {when}",
    headlineRenewal: "Your subscription renews {when}",
    // {When} is the capitalised relative phrase; {moment} is emphasised.
    leadFirst: "Your free trial of Facelineage ends on {moment}. {When} we'll start your subscription and charge the payment method on file. After that you'll be billed {every} until you cancel.",
    leadRenewal: "This is a friendly reminder that your Facelineage subscription renews on {moment}. {When} we'll charge the payment method on file for another {period}.",
    every: {
      day: "every day",
      week: "every week",
      month: "every month",
      year: "every year",
      other: "on a recurring basis",
    },
    another: {
      day: "day",
      week: "week",
      month: "month",
      year: "year",
      other: "period",
    },
    preheader: "You'll be charged {amount} {when}, on {moment}. Cancel or request a refund anytime from your dashboard.",
    subhead: "You'll be charged {amount} {when}, on {moment}.",
    summaryTitle: "Upcoming charge",
    amount: "Amount",
    chargeDate: "Charge date",
    paymentMethod: "Payment method",
    cardEnding: "Card ending ●●●● {last4}",
    controlTitle: "You're in control",
    // {cancel}, {refund} and {moment} are emphasised.
    controlBody: "Don't want to be charged? You can {cancel} or {refund} yourself, right now, from your Facelineage dashboard — no need to wait and no questions asked. Cancel any time before {moment} and you won't be charged.",
    controlCancel: "cancel",
    controlRefund: "request a refund",
    controlCta: "Manage, cancel or refund →",
    controlHelp: "Prefer a hand? Email {email} and we'll sort it out for you.",
    keepGoing: "Happy to keep exploring your heritage? No action needed — your subscription continues automatically and you'll keep full access.",
    textEndsFirst: "Your free Facelineage trial ends on {moment}.",
    textEndsRenewal: "Your Facelineage subscription renews on {moment}.",
    textCharge: "{When} you'll be charged {amount}",
    textCard: " to your card ending {last4}.",
    textControlTitle: "YOU'RE IN CONTROL",
    textControl1: "You can cancel or request a refund yourself, anytime, from your Facelineage dashboard: {url}",
    textControl2: "Cancel any time before {moment} and you won't be charged.",
    textHelp: "Prefer help? Email {email} and we'll sort it out.",
    textKeepGoing: "Happy to continue? No action needed — your subscription renews automatically.",
  },

  canceled: {
    subject: "Your Facelineage subscription is canceled",
    headline: "Your subscription is canceled",
    subheadUntil: "You won't be charged again. You keep full access until {until}.",
    subheadNow: "You won't be charged again, and your access has ended.",
    // {amount} is " (€9.99/month)"-style or empty; {until} is emphasised.
    leadUntil: "We've canceled your Facelineage subscription{amount}. No further payments will be taken. Your access stays open until {until} — after that the subscription simply ends, with nothing left to cancel.",
    leadNow: "We've canceled your Facelineage subscription{amount}, effective immediately. No further payments will be taken.",
    preheaderUntil: "Your cancellation is confirmed. You won't be charged again, and you keep access until {until}.",
    preheaderNow: "Your cancellation is confirmed. You won't be charged again.",
    summaryTitle: "Cancellation summary",
    status: "Status",
    statusValue: "Canceled",
    accessUntil: "Access until",
    accessEnded: "Access ended",
    now: "Now",
    recurringCharge: "Recurring charge",
    futureCharges: "Future charges",
    none: "None",
    refundPromise: "Nothing else is needed from you. If you see a Facelineage charge after this email, reply to it or write to {email} and we'll refund it.",
    cta: "View my account →",
    comeBack: "Changed your mind? You can start again any time from your account — your reports stay where you left them.",
    textCanceled: "Your Facelineage subscription is canceled.",
    textNoChargeAmount: "You will not be charged {amount} again — or anything else.",
    textNoCharge: "You will not be charged again.",
    textUntil: "You keep full access until {until}. After that the subscription ends on its own.",
    textEnded: "Your access has ended, effective immediately.",
    textRefund: "Nothing else is needed from you. If you ever see a Facelineage charge after this email, write to {email} and we'll refund it.",
    textComeBack: "Changed your mind? Start again any time: {url}",
  },
};

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};
export type EmailCopy = DeepStringify<typeof en>;
