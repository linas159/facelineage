import type { LegalContent } from "./types";

/**
 * English legal content — source of truth. PL and RO mirror this shape
 * (enforced by the `: LegalContent` annotation on each export).
 *
 * Company / data controller: Andromeda Entertainment, MB (Lithuanian small
 * partnership), company code 308005148. Governing law: Lithuania. Because the
 * Service is offered to consumers in the EU (incl. Poland and Romania), EU
 * consumer-protection law and the GDPR apply.
 *
 * Registered office: Žygio g. 5, Vilnius, Lithuania. This content is a solid,
 * compliant starting point but is not a substitute for review by a qualified
 * lawyer.
 */
export const legalEn: LegalContent = {
  ui: {
    home: "Home",
    lastUpdated: "Last updated:",
    questions: "Questions? Email",
  },

  privacy: {
    metaTitle: "Privacy Policy — Facelineage",
    metaDescription:
      "How Facelineage collects, uses, and protects your personal data, and the rights you have under the GDPR.",
    title: "Privacy Policy",
    lastUpdated: "June 25, 2026",
    blocks: [
      {
        kind: "p",
        text: "This Privacy Policy explains how we collect, use, and protect your personal data when you use facelineage.com and related services (the \"Service\"). Please read it together with our [Terms of Service](/terms) and [Cookie Policy](/cookies).",
      },

      { kind: "h", text: "1. Who we are (data controller)" },
      {
        kind: "p",
        text: "The controller of your personal data is **Andromeda Entertainment, MB**, a small partnership established in Lithuania, company code **308005148**, registered office Žygio g. 5, Vilnius, Lithuania (\"we\", \"us\", \"our\"). You can reach us about any privacy matter at [support@facelineage.com](mailto:support@facelineage.com).",
      },

      { kind: "h", text: "2. Data we collect" },
      {
        kind: "ul",
        items: [
          "**Selfie photos** you upload for analysis, plus any additional photos (e.g. parent photos) you submit for optional add-ons.",
          "**Facial-feature data** derived from your photo by our AI to produce your heritage analysis.",
          "**Account information**: your email address, used for authentication and report delivery.",
          "**Quiz answers** about heritage context you choose to share.",
          "**Payment metadata** (last 4 digits, card brand, country) provided by our payment processor. We never see or store full card numbers.",
          "**Technical data**: IP address, browser, device type, and timezone, collected automatically for security and analytics.",
        ],
      },

      { kind: "h", text: "3. Sensitive data and your explicit consent" },
      {
        kind: "p",
        text: "Analysing the features of a face may involve **special categories of personal data** under Article 9 of the GDPR. We process your photo and the facial-feature data derived from it **only on the basis of your explicit consent**, which you give when you upload your selfie to generate a report.",
      },
      {
        kind: "note",
        text: "We use your facial data solely to generate the analysis you request. We do **not** use it to identify you across services, build a biometric profile, sell it, or feed it into AI training. You can withdraw your consent at any time by deleting your photo or your account, or by emailing us — withdrawal does not affect processing that already happened.",
      },

      { kind: "h", text: "4. Why we use your data and our legal bases" },
      {
        kind: "ul",
        items: [
          "To generate your personalized heritage report and add-ons — **explicit consent** (Art. 9(2)(a)) for facial data; **performance of our contract** with you (Art. 6(1)(b)) for the rest.",
          "To process payments and prevent fraud — **contract** and our **legitimate interests** in securing the Service (Art. 6(1)(f)).",
          "To send transactional emails (sign-in links, receipts, reports) — **contract**.",
          "To improve the accuracy and quality of our Service in aggregate — **legitimate interests**; we do not use your individual photo for this.",
          "To keep accounting and tax records, and to respond to lawful requests — **legal obligation** (Art. 6(1)(c)).",
        ],
      },

      { kind: "h", text: "5. AI processing" },
      {
        kind: "p",
        text: "To produce your analysis, your photo and related inputs are sent to third-party AI providers (**Anthropic** and **Google**) acting as our processors. They process the data only to return a result to us; we do not authorize them to use it to train their models. This processing is covered by the explicit consent described in Section 3.",
      },

      { kind: "h", text: "6. Sharing and recipients" },
      { kind: "p", text: "We do **not** sell your personal data. We share it only with service providers acting on our instructions:" },
      {
        kind: "ul",
        items: [
          "**Stripe** — payment processing.",
          "**Supabase** — authentication and database/storage.",
          "**Anthropic** and **Google** — AI inference.",
          "**Vercel** — hosting and content delivery.",
          "**Resend** — transactional email delivery.",
          "Public authorities, where we are required to disclose by law.",
        ],
      },

      { kind: "h", text: "7. International transfers" },
      {
        kind: "p",
        text: "Some of our providers process data outside the European Economic Area (e.g. in the United States). Where they do, the transfer is protected by appropriate safeguards such as the European Commission's **Standard Contractual Clauses** or an adequacy decision. You can request a copy of the relevant safeguards by emailing us.",
      },

      { kind: "h", text: "8. How long we keep your data" },
      {
        kind: "ul",
        items: [
          "**Selfies and photos** — deleted automatically within 30 days of upload, and sooner if you delete them from your account.",
          "**Account and reports** — kept while your account is active; removed within 30 days of an account-deletion request.",
          "**Payment and accounting records** — retained for as long as required by Lithuanian tax and accounting law (generally up to 10 years).",
        ],
      },

      { kind: "h", text: "9. Your rights" },
      {
        kind: "p",
        text: "Under the GDPR you have the right to **access**, **rectify**, **erase**, and **restrict** processing of your data, the right to **data portability**, the right to **object** to processing based on legitimate interests, and the right to **withdraw consent** at any time. To exercise any of these, email [support@facelineage.com](mailto:support@facelineage.com) from the address on your account. We respond within one month.",
      },
      {
        kind: "p",
        text: "You also have the right to lodge a complaint with a supervisory authority — in Lithuania, the **State Data Protection Inspectorate** ([vdai.lrv.lt](https://vdai.lrv.lt)); in Poland, the **President of the Personal Data Protection Office (UODO)**; in Romania, the **National Supervisory Authority for Personal Data Processing (ANSPDCP)**; or the authority in your country of residence.",
      },

      { kind: "h", text: "10. Automated decisions" },
      {
        kind: "p",
        text: "Your report is generated automatically, but it does not produce legal or similarly significant effects about you within the meaning of Article 22 of the GDPR — it is an entertainment impression, not a decision about your rights, finances, or status.",
      },

      { kind: "h", text: "11. Security" },
      {
        kind: "p",
        text: "We use encryption in transit (HTTPS), encrypted storage at rest, and row-level access controls on user data. No system is perfectly secure, but we apply industry-standard safeguards and will notify you and the relevant authority of a data breach where the law requires.",
      },

      { kind: "h", text: "12. Children" },
      {
        kind: "p",
        text: "The Service is not directed to children under 16, and we do not knowingly collect their data. If you believe a minor has provided us information, contact us and we will delete it.",
      },

      { kind: "h", text: "13. Changes" },
      {
        kind: "p",
        text: "We may update this policy from time to time. We will revise the date above and, for material changes, notify you in-app or by email.",
      },

      { kind: "h", text: "14. Contact" },
      {
        kind: "p",
        text: "Questions about this policy or your data? Email [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  terms: {
    metaTitle: "Terms of Service — Facelineage",
    metaDescription: "The terms governing use of Facelineage, including your EU consumer rights.",
    title: "Terms of Service",
    lastUpdated: "June 25, 2026",
    blocks: [
      {
        kind: "p",
        text: "These Terms govern your use of Facelineage (the \"Service\"), operated by **Andromeda Entertainment, MB**, company code **308005148**, Lithuania. By using the Service you agree to these Terms. If you do not agree, please do not use the Service.",
      },

      { kind: "h", text: "1. The Service" },
      {
        kind: "p",
        text: "Facelineage provides AI-generated heritage and ancestry impressions based on a user-submitted selfie and optional context. Reports are **for entertainment and inspiration only** and are not scientific, medical, genealogical, or legal advice.",
      },

      { kind: "h", text: "2. Account and eligibility" },
      {
        kind: "ul",
        items: [
          "You must be at least 16 years old to use the Service.",
          "You must provide a valid email address.",
          "You are responsible for activity on your account.",
        ],
      },

      { kind: "h", text: "3. Photo content and rights" },
      {
        kind: "p",
        text: "By uploading a photo, you confirm that you have the right to do so — it is a photo of yourself, or you have the explicit permission of the person shown (this applies to a parent's photo used for the Mom + Dad breakdown). You grant us a limited licence to process the photo solely to deliver the Service. We do not claim ownership of your photos.",
      },

      { kind: "h", text: "4. Subscriptions, prices and auto-renewal" },
      {
        kind: "ul",
        items: [
          "Most plans start with a paid intro period (for example, $1.95 for 3 days) and then **automatically renew** at the regular price (for example, $24.99/week) until you cancel. The exact prices, intro period, and renewal terms are shown to you at checkout before you pay.",
          "Renewal charges are taken automatically using your saved payment method. We send you a reminder by email before each renewal.",
          "You can cancel at any time from your [account page](/account). Cancellation stops future charges and takes effect at the end of the current paid period; you keep access until then.",
          "Add-on purchases (e.g. Heritage Mirror, Future Partner) are one-time charges billed immediately.",
        ],
      },

      { kind: "h", text: "5. Your right of withdrawal (EU consumers)" },
      {
        kind: "p",
        text: "If you are a consumer in the EU, you normally have the right to withdraw from a distance contract within **14 days** without giving a reason. Because Facelineage is digital content and a service that is delivered to you immediately, the following applies:",
      },
      {
        kind: "note",
        text: "By purchasing and starting your report, you **expressly request that we begin performance immediately** and you **acknowledge that you lose your 14-day right of withdrawal** once the service has been fully performed (i.e. your report or add-on has been generated and delivered). For a subscription, the withdrawal right applies to the part of the service not yet performed. This does not affect the separate voluntary refund described in our [Refund Policy](/refunds).",
      },

      { kind: "h", text: "6. Refunds" },
      {
        kind: "p",
        text: "In addition to your statutory rights, we offer a voluntary money-back guarantee. See our [Refund Policy](/refunds) for details on how to request a refund.",
      },

      { kind: "h", text: "7. Acceptable use" },
      { kind: "p", text: "You agree not to:" },
      {
        kind: "ul",
        items: [
          "Upload photos of anyone without their consent (this includes minors).",
          "Use the Service for surveillance, harassment, or doxxing.",
          "Reverse-engineer, scrape, or otherwise abuse the Service.",
          "Use Facelineage outputs to make consequential decisions about another person (hiring, lending, immigration, etc.).",
        ],
      },

      { kind: "h", text: "8. AI limitations" },
      {
        kind: "p",
        text: "Heritage and ancestor renderings are statistical impressions generated by AI from a photo. They are **not DNA tests** and cannot establish biological ancestry. Cultural references are generalized and may be inexact.",
      },

      { kind: "h", text: "9. Intellectual property" },
      {
        kind: "p",
        text: "The Facelineage name, logo, and Service interface are our property. Reports we generate for you (text, images) are yours to use for personal, non-commercial purposes; you may not redistribute them as a competing product.",
      },

      { kind: "h", text: "10. Termination" },
      {
        kind: "p",
        text: "We may suspend or terminate accounts that violate these Terms. You may delete your account at any time from your [account page](/account) or by emailing us.",
      },

      { kind: "h", text: "11. Disclaimers" },
      {
        kind: "p",
        text: "The Service is provided \"as is\" without warranties of any kind, express or implied, to the extent permitted by law. **Nothing in these Terms limits any rights you have as a consumer that cannot be limited or waived under applicable law.**",
      },

      { kind: "h", text: "12. Limitation of liability" },
      {
        kind: "p",
        text: "To the maximum extent permitted by law, our total liability to you for any claim arising out of the Service is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms excludes liability that cannot be excluded by law (including for death, personal injury, or fraud).",
      },

      { kind: "h", text: "13. Governing law and disputes" },
      {
        kind: "p",
        text: "These Terms are governed by the laws of **Lithuania**, without affecting the **mandatory consumer-protection rules of your country of residence**, which continue to apply to you. EU consumers can also use the European Commission's online dispute-resolution platform at [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).",
      },

      { kind: "h", text: "14. Changes" },
      {
        kind: "p",
        text: "We may update these Terms occasionally. Material changes will be announced in-app or by email before they take effect.",
      },

      { kind: "h", text: "15. Contact" },
      {
        kind: "p",
        text: "Questions about these Terms? Email [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  cookies: {
    metaTitle: "Cookie Policy — Facelineage",
    metaDescription: "How Facelineage uses cookies and similar technologies.",
    title: "Cookie Policy",
    lastUpdated: "June 25, 2026",
    blocks: [
      {
        kind: "p",
        text: "This page explains what cookies and similar technologies Facelineage uses, and why. Read it together with our [Privacy Policy](/privacy).",
      },

      { kind: "h", text: "1. What is a cookie?" },
      {
        kind: "p",
        text: "A cookie is a small text file stored on your device by your browser. Similar technologies (local storage, session storage) work in a comparable way but are scoped to your browser session or the site origin.",
      },

      { kind: "h", text: "2. Cookies we use" },
      { kind: "h3", text: "Strictly necessary" },
      { kind: "p", text: "Required for the Service to function. These do not need consent and cannot be turned off." },
      {
        kind: "ul",
        items: [
          "**Authentication** — Supabase session cookies keep you signed in.",
          "**Funnel state** — short-lived cookies and sessionStorage track which quiz step, paywall, or checkout you are on so a refresh doesn't lose your place.",
          "**Stripe** — Stripe sets cookies to detect fraud and enable Apple Pay / Google Pay / PayPal flows.",
        ],
      },
      { kind: "h3", text: "Analytics" },
      {
        kind: "p",
        text: "Aggregated, privacy-respecting metrics about usage (pages viewed, funnel conversion). We do not use cross-site advertising trackers. Where required by law, we set these only with your consent.",
      },

      { kind: "h", text: "3. Third parties" },
      { kind: "p", text: "The following third parties may set cookies through our Service:" },
      {
        kind: "ul",
        items: ["Stripe (payments)", "Supabase (authentication)", "Vercel (hosting / edge functions)"],
      },

      { kind: "h", text: "4. Managing cookies" },
      {
        kind: "p",
        text: "You can clear or block cookies in your browser settings. Note that blocking strictly-necessary cookies will prevent you from signing in or completing purchases.",
      },

      { kind: "h", text: "5. Changes" },
      {
        kind: "p",
        text: "We may update this Cookie Policy from time to time. The latest version is always available at this URL.",
      },

      { kind: "h", text: "6. Contact" },
      {
        kind: "p",
        text: "Questions? Email [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  refunds: {
    metaTitle: "Refund Policy — Facelineage",
    metaDescription: "Our refund and cancellation policy, and how it sits alongside your statutory rights.",
    title: "Refund Policy",
    lastUpdated: "June 25, 2026",
    blocks: [
      {
        kind: "p",
        text: "We want you to feel good about your purchase. If your report didn't meet your expectations, we'll refund you — no forms, no questions.",
      },
      {
        kind: "note",
        text: "This guarantee is offered **voluntarily and in addition to** your statutory rights as a consumer (including any right of withdrawal described in our [Terms of Service](/terms)). It never reduces those rights.",
      },

      { kind: "h", text: "1. Money-back window" },
      {
        kind: "p",
        text: "You can request a full refund within **30 days** of your initial purchase. We process refunds within 5–10 business days back to the original payment method.",
      },

      { kind: "h", text: "2. How to request a refund" },
      {
        kind: "p",
        text: "Email [support@facelineage.com](mailto:support@facelineage.com) from the address on your account. Include:",
      },
      {
        kind: "ul",
        items: [
          "The email used to sign up.",
          "The date of your purchase.",
          "The last 4 digits of the card used.",
          "A sentence on what didn't work for you.",
        ],
      },

      { kind: "h", text: "3. Subscriptions" },
      {
        kind: "ul",
        items: [
          "Your intro payment (e.g. $1.95 for 3 days) covers your intro window. Cancel before it ends to avoid being charged the recurring price.",
          "You can cancel anytime from your [account page](/account). Cancellation stops future charges; access continues until the end of the current period.",
          "If you forget to cancel and are charged for a renewal you didn't use, contact us within 7 days of the renewal and we will refund the most recent charge.",
        ],
      },

      { kind: "h", text: "4. One-time add-ons" },
      {
        kind: "p",
        text: "Add-ons (Mom + Dad breakdown, Heritage Mirror, Future Partner, Through The Ages, Heritage Book) are eligible for a refund within 30 days of purchase. If we have already generated the deliverable, the refund is at our discretion; we typically still refund first-time buyers.",
      },

      { kind: "h", text: "5. Chargebacks" },
      {
        kind: "p",
        text: "Please contact us before initiating a chargeback. Disputes through your bank can take 60–90 days; direct contact almost always resolves things in a day.",
      },

      { kind: "h", text: "6. Exclusions" },
      {
        kind: "p",
        text: "Refunds may be declined where there is evidence of abuse, such as repeat-refund accounts, photos uploaded without the subject's consent, or attempts to extract content commercially. This does not affect your statutory rights.",
      },

      { kind: "h", text: "7. Contact" },
      {
        kind: "p",
        text: "Email [support@facelineage.com](mailto:support@facelineage.com) — we usually reply within one business day.",
      },
    ],
  },

  contact: {
    metaTitle: "Contact Us — Facelineage",
    metaDescription: "Get in touch with the Facelineage team.",
    title: "Contact Us",
    lastUpdated: "June 25, 2026",
    blocks: [
      {
        kind: "p",
        text: "We're a small team and we read every message. The fastest way to reach us is email — we usually reply within one business day.",
      },

      { kind: "h", text: "Company" },
      {
        kind: "p",
        text: "Facelineage is operated by **Andromeda Entertainment, MB**, company code **308005148**, Lithuania. Registered office: Žygio g. 5, Vilnius, Lithuania.",
      },

      { kind: "h", text: "Email" },
      {
        kind: "p",
        text: "[support@facelineage.com](mailto:support@facelineage.com)",
      },

      { kind: "h", text: "What to include" },
      {
        kind: "ul",
        items: [
          "The email address on your account, if you have one.",
          "A short description of what you need.",
          "Screenshots, if something looks off in your report.",
        ],
      },

      { kind: "h", text: "Common requests" },
      {
        kind: "ul",
        items: [
          "**Refunds & cancellations** — see our [Refund Policy](/refunds), then email us.",
          "**Account or photo deletion** — email from the address on file and we'll process it within 30 days.",
          "**Privacy & data requests** — see our [Privacy Policy](/privacy) for your rights, then email us.",
          "**Bug reports & feature ideas** — always welcome. We ship fast based on real user feedback.",
          "**Press & partnerships** — same email; mention \"press\" or \"partnership\" in the subject line.",
        ],
      },

      { kind: "h", text: "Response times" },
      {
        kind: "p",
        text: "Monday–Friday, 9am–6pm. Weekend and holiday replies may take longer. For payment issues, please email us before opening a chargeback — direct contact almost always resolves things faster.",
      },
    ],
  },
};
