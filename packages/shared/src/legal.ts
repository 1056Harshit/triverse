/**
 * Privacy, terms, safety and account-deletion content — one source for the app's in-app pages
 * and the website's HTML pages. `**bold**` is the only markup.
 */
export type LegalDocId = "privacy" | "terms" | "safety" | "delete-account";

export interface LegalSection { heading: string; body?: string[]; bullets?: string[] }
export interface LegalDoc { id: LegalDocId; title: string; icon: string; summary: string; updated: string; intro?: string; sections: LegalSection[] }

export const LEGAL_CONTACT = "gupta231611@gmail.com";
const UPDATED = "5 October 2026";

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  privacy: {
    id: "privacy", title: "Privacy Policy", icon: "🔐", updated: UPDATED,
    summary: "What we collect, why, and your rights",
    intro: "PvtFrnd (\"we\") runs the PvtFrnd app and pvtfrnd.com. This policy explains what personal data we collect, why we use it, and the choices you have under India's Digital Personal Data Protection Act, 2023 (DPDP Act).",
    sections: [
      { heading: "What we collect", bullets: [
        "**Account:** your phone number or email, your name, and a profile photo if you add one.",
        "**What you share in the app:** crop photos, voice messages, messages to our assistants and to ride partners, saved places, reminders and settings.",
        "**Ride drivers:** profile photo, vehicle RC and driving licence details — used only to verify you.",
        "**Location:** only while you use a feature that needs it (nearby hospitals, food, rides, weather) and only with your permission. We don't track you in the background.",
        "**Device basics:** app version and error logs to keep the service working.",
      ] },
      { heading: "How we use it", body: [
        "To sign you in, run the features you ask for, keep rides safe, prevent fraud and abuse, and send sign-in codes and important account messages.",
        "**We do not sell your data** and we don't show third-party ads based on it.",
      ] },
      { heading: "Who processes it for us", bullets: [
        "**Supabase** — database and file storage",
        "**Render** — servers that run PvtFrnd",
        "**Google Gemini** — AI answers, from the text, photos or voice you send",
        "**2Factor** — SMS and phone-call sign-in codes",
        "**Google (Gmail)** — sign-in and account emails",
        "**OpenStreetMap / Open-Meteo / Wikimedia** — maps, places, weather and photos (no personal data is sent)",
      ], body: ["They may only use your data to provide their service to us."] },
      { heading: "How long we keep it", body: [
        "While your account is active. When you delete your account we delete or anonymise your data within 30 days, except records the law requires us to keep (for example payment records), which are deleted once that period ends.",
      ] },
      { heading: "Your rights", bullets: [
        "See and get a copy of your data",
        "Correct or update it (Settings → Account)",
        "Delete your account and data (Settings → Delete my account)",
        "Withdraw consent — e.g. turn off location or microphone in your phone's settings",
        "Raise a complaint with us, and if unresolved, with the Data Protection Board of India",
      ] },
      { heading: "Children", body: ["PvtFrnd is for people aged 18 and over. We don't knowingly collect data from children."] },
      { heading: "Contact & grievance officer", body: [`Email **${LEGAL_CONTACT}**. We reply within 7 days.`] },
    ],
  },

  terms: {
    id: "terms", title: "Terms of Use", icon: "📜", updated: UPDATED,
    summary: "The rules for using PvtFrnd",
    intro: "By using PvtFrnd you agree to these terms. Please read them — they're short.",
    sections: [
      { heading: "The service", body: [
        "PvtFrnd brings together farming help, ride sharing, food and stay listings, health facility listings and trip planning, with AI assistants.",
        "Prices, ratings, timings and availability come from public and third-party sources and are **estimates, not confirmed**. Always check before you rely on them.",
      ] },
      { heading: "Advice is guidance only", body: [
        "Farm, health and travel answers are general guidance, **not professional advice**. They can be wrong.",
        "**In a medical emergency call 112** or go to the nearest hospital. Always read pesticide labels and follow local rules.",
      ] },
      { heading: "Ride sharing", bullets: [
        "Rides are shared between private individuals to split travel costs; PvtFrnd is not a taxi operator.",
        "Drivers must hold a valid driving licence, vehicle registration and insurance.",
        "Seat prices are capped at a fair cost-share — no profit-making rides.",
        "Be on time, respectful and safe. We may suspend accounts that put others at risk.",
      ] },
      { heading: "Your account", bullets: [
        "You must be 18 or older and give accurate details.",
        "Keep your phone and email secure — sign-in codes are sent there.",
        "Don't misuse PvtFrnd: no fake listings, spam, harassment or illegal content.",
      ] },
      { heading: "Your content", body: ["You own what you upload. You give us permission to store and process it to run PvtFrnd. Only upload what you have the right to share."] },
      { heading: "Liability", body: ["We work hard to keep PvtFrnd accurate and available, but provide it \"as is\". To the extent the law allows, we are not liable for indirect losses or for the actions of other users."] },
      { heading: "Changes and law", body: ["We may update these terms and will tell you in the app when we do. These terms are governed by the laws of India."] },
      { heading: "Contact", body: [`**${LEGAL_CONTACT}**`] },
    ],
  },

  safety: {
    id: "safety", title: "Safety & Security", icon: "🛡️", updated: UPDATED,
    summary: "How we protect you and your account",
    intro: "Your safety and your data come first. Here's what PvtFrnd does — and what you can do — to stay safe.",
    sections: [
      { heading: "Your account", bullets: [
        "**No passwords to steal** — you sign in with a one-time code sent to your phone or email.",
        "Codes expire in 10 minutes and are locked after too many wrong tries.",
        "**Never share your code.** PvtFrnd staff will never ask for it. Only an automated call reads it out to you.",
        "You stay signed in with secure tokens stored in your phone's protected storage (Keychain / Keystore).",
      ] },
      { heading: "Your data", bullets: [
        "Everything between the app and our servers is encrypted (HTTPS/TLS).",
        "Your data is stored in a secured database with access rules on every table.",
        "We only collect what a feature needs, and you can delete your account any time.",
      ] },
      { heading: "Safer rides", bullets: [
        "**Verified drivers** — photo, RC and driving licence are checked before they can offer rides.",
        "**Ride PIN** — the ride starts only when you share your PIN with the right driver.",
        "**Masked chat** — phone numbers stay hidden in ride chat.",
        "**SOS** — one tap shares your trip and alerts help.",
        "**Fair prices** — seat prices are capped and compared with bus fares.",
      ] },
      { heading: "Health and AI answers", bullets: [
        "Health answers are guidance, not a diagnosis — they tell you when to see a doctor.",
        "Prices from assistants are marked as estimates.",
      ] },
      { heading: "Stay safe", bullets: [
        "Check the driver's photo and car number before you get in.",
        "Meet in public places and tell someone your plans.",
        "Report anything suspicious to us straight away.",
      ] },
      { heading: "Report a problem", body: [`Email **${LEGAL_CONTACT}** — we take every report seriously. In an emergency call **112**.`] },
    ],
  },

  "delete-account": {
    id: "delete-account", title: "Delete your account", icon: "🗑️", updated: UPDATED,
    summary: "How to delete your account and data",
    intro: "You can delete your PvtFrnd account and data at any time.",
    sections: [
      { heading: "Quickest way", body: ["Open the PvtFrnd app → **Settings** → **Delete my account**. It takes effect immediately."] },
      { heading: "Can't open the app?", body: [`Email **${LEGAL_CONTACT}** from the email on your account, or include the phone number you sign in with. We'll confirm and delete your account within 7 days.`] },
      { heading: "What gets deleted", bullets: [
        "Your profile, photos, banners and settings",
        "Your chats, saved places, reminders and ride listings",
        "Driver verification documents",
      ], body: ["Records we must keep by law (for example payment records) are kept only as long as required and then deleted."] },
    ],
  },
};

export const LEGAL_ORDER: LegalDocId[] = ["privacy", "terms", "safety", "delete-account"];
