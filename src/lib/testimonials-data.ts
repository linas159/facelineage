export type Testimonial = {
  name: string;
  location: string;
  quote: string;
  /** Fallback avatar background color (used when avatarSrc is missing). */
  avatarColor: string;
  /** Initials shown on the colored fallback avatar. */
  initials: string;
  /** Optional path to a real profile photo in /public/avatars. */
  avatarSrc?: string;
  /** 1–5. Defaults to 5. */
  rating?: number;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Maya R.",
    location: "Brooklyn, NY",
    quote:
      "The map of where my ancestors traveled gave me chills. I cried reading the heritage story.",
    avatarColor: "#7c5cff",
    initials: "MR",
    avatarSrc: "/testimonial/maya.png",
    rating: 5,
  },
  {
    name: "Daniel K.",
    location: "Berlin, DE",
    quote:
      "I'd taken a 23andMe and the regions matched almost exactly. I was not expecting that from a photo.",
    avatarColor: "#10b981",
    initials: "DK",
    avatarSrc: "/testimonial/daniel.jpeg",
    rating: 5,
  },
  {
    name: "Priya S.",
    location: "London, UK",
    quote:
      "I shared my report in our family group chat and now my mum and dad both want to do it.",
    avatarColor: "#ec4899",
    initials: "PS",
    avatarSrc: "/testimonial/priya.png",
    rating: 5,
  },
  {
    name: "Carlos M.",
    location: "Mexico City, MX",
    quote:
      "Beautifully written. It reads like someone took the time to tell my family's story.",
    avatarColor: "#fbbf24",
    initials: "CM",
    avatarSrc: "/testimonial/carlos.png",
    rating: 5,
  },
  {
    name: "Aiko T.",
    location: "Osaka, JP",
    quote: "The cultural insights were so spot on it felt like a horoscope that finally made sense.",
    avatarColor: "#f97373",
    initials: "AT",
    avatarSrc: "/testimonial/aiko.jpeg",
    rating: 5,
  },
  {
    name: "Sofia L.",
    location: "Lisbon, PT",
    quote:
      "I sent it to my grandmother. She said it lined up with stories her own grandmother told her.",
    avatarColor: "#4ea0d9",
    initials: "SL",
    avatarSrc: "/testimonial/sofia.jpeg",
    rating: 5,
  },
];
