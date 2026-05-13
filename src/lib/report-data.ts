// Demo data for the report page. Until the analysis pipeline is wired up,
// every report renders these fixtures.

export type Country = {
  name: string;
  iso2: string;
  pct: number;
  // Lat/lng for placing the marker on the world map. Web-Mercator-projected
  // in the component — coords are in standard (lat, lng) degrees here.
  lat: number;
  lng: number;
};

export type Region = {
  key: string;
  name: string;
  pct: number;
  color: string;
  blurb: string;
  countries: Country[];
};

export type FacialTrait = {
  key: string;
  name: string;
  imageSrc: string;
  description: string;
  supportingRegions: string[]; // ISO-2 codes
};

export type Ancestor = {
  name: string;
  era: string;
  place: string;
  imageSrc: string;
  description: string;
};

export type CulturalInsight = {
  key: string;
  name: string;
  imageSrc: string;
  description: string;
  regionKeys: string[];
};

export const REGIONS: Region[] = [
  {
    key: "northwestern-european",
    name: "Northwestern European",
    pct: 79.1,
    color: "#7c5cff",
    blurb:
      "Cool-toned ancestry from the North Atlantic and Baltic — a crossroads where Celtic, Germanic, and Nordic peoples mixed for thousands of years.",
    countries: [
      { name: "Sweden", iso2: "SE", pct: 23.12, lat: 60.0, lng: 18.0 },
      { name: "France", iso2: "FR", pct: 15.17, lat: 47.0, lng: 2.0 },
      { name: "United Kingdom", iso2: "GB", pct: 14.1, lat: 54.0, lng: -2.0 },
      { name: "Ireland", iso2: "IE", pct: 8.87, lat: 53.0, lng: -8.0 },
      { name: "Denmark", iso2: "DK", pct: 8.43, lat: 56.0, lng: 10.0 },
      { name: "Germany", iso2: "DE", pct: 4.25, lat: 51.0, lng: 10.0 },
      { name: "Norway", iso2: "NO", pct: 3.02, lat: 61.0, lng: 9.0 },
      { name: "Finland", iso2: "FI", pct: 2.14, lat: 64.0, lng: 26.0 },
    ],
  },
  {
    key: "southern-european",
    name: "Southern European",
    pct: 11.16,
    color: "#10b981",
    blurb:
      "Warm Mediterranean and Balkan threads — the legacy of seafaring trade, Roman expansion, and the long flow of people across southern Europe.",
    countries: [
      { name: "Italy", iso2: "IT", pct: 3.36, lat: 42.5, lng: 12.5 },
      { name: "Croatia", iso2: "HR", pct: 2.36, lat: 45.1, lng: 15.2 },
      { name: "Bosnia and Herzegovina", iso2: "BA", pct: 1.57, lat: 43.9, lng: 17.7 },
      { name: "Spain", iso2: "ES", pct: 1.57, lat: 40.0, lng: -3.7 },
      { name: "Portugal", iso2: "PT", pct: 1.0, lat: 39.5, lng: -8.0 },
      { name: "Serbia", iso2: "RS", pct: 0.91, lat: 44.0, lng: 21.0 },
      { name: "Greece", iso2: "GR", pct: 0.39, lat: 39.0, lng: 22.0 },
    ],
  },
  {
    key: "central-asian",
    name: "Central Asian",
    pct: 9.74,
    color: "#fbbf24",
    blurb:
      "A faint signature stretching east — the kind of distant marker the old Silk Road left in populations from Anatolia to the Hindu Kush.",
    countries: [
      { name: "Turkmenistan", iso2: "TM", pct: 3.06, lat: 38.9, lng: 59.6 },
      { name: "Pakistan", iso2: "PK", pct: 2.89, lat: 30.4, lng: 69.3 },
      { name: "Kyrgyzstan", iso2: "KG", pct: 1.57, lat: 41.2, lng: 74.8 },
      { name: "Tajikistan", iso2: "TJ", pct: 0.97, lat: 38.9, lng: 71.3 },
      { name: "Uzbekistan", iso2: "UZ", pct: 0.85, lat: 41.4, lng: 64.6 },
      { name: "Kazakhstan", iso2: "KZ", pct: 0.41, lat: 48.0, lng: 66.9 },
    ],
  },
];

export const FACIAL_TRAITS: FacialTrait[] = [
  {
    key: "face-shape",
    name: "Face Shape",
    imageSrc: "/report/trait-face-shape.png",
    description:
      "A broadly oval face balanced by a softly squared jaw — a structure common across Northwestern European populations. Not dramatically angular nor overly rounded, hinting at a long history of mixed lineages where harder Northern features met softer continental ones.",
    supportingRegions: ["GB", "IE", "DE"],
  },
  {
    key: "skin-tone",
    name: "Skin Tone",
    imageSrc: "/report/trait-skin-tone.png",
    description:
      "Fair complexion with a faint pink undertone — a phenotype shaped by generations of life at higher latitudes, where reduced melanin lets the body produce vitamin D from limited sunlight. The vascular flush is typical of Atlantic and Baltic ancestry.",
    supportingRegions: ["GB", "SE", "NO", "IE"],
  },
  {
    key: "eye-color",
    name: "Eye Color",
    imageSrc: "/report/trait-eye-color.png",
    description:
      "Cool grey-blue eyes — a signature of populations around the Baltic Sea, where light-eye genetics first appeared roughly 10,000 years ago and spread outward. The epicanthic fold is mild, and the iris pattern carries the soft striations characteristic of Nordic lineages.",
    supportingRegions: ["FI", "SE", "DE"],
  },
  {
    key: "hair-color",
    name: "Hair Texture & Color",
    imageSrc: "/report/trait-hair-color.png",
    description:
      "Light-to-medium brown with a natural wave — a common Western European combination, often with a tendency toward soft curl at the ends. Hair density reads average, neither thinning nor unusually thick. The wave pattern echoes traits found in Celtic and northern French populations.",
    supportingRegions: ["IE", "FR", "GB"],
  },
  {
    key: "nose",
    name: "Nose",
    imageSrc: "/report/trait-nose.png",
    description:
      "Moderate in size with a straight profile and a subtle bridge — a Western European silhouette overall. A slight broadening at the base nods toward Southern European or, more faintly, Central Asian influence. The tip is well-defined without being sharp.",
    supportingRegions: ["IT", "GB", "PK"],
  },
  {
    key: "brow-ridge",
    name: "Brow Ridge",
    imageSrc: "/report/trait-brow-ridge.png",
    description:
      "Moderate prominence — neither heavy and protruding nor strikingly recessed. The arch is slight, lending an open, expressive look. Across Europe this is a hallmark of populations that spread west of the Urals during the Mesolithic.",
    supportingRegions: ["DE", "FR", "GB"],
  },
];

export const ANCESTOR: Ancestor = {
  name: "Edmund of Northumbria",
  era: "c. 1780",
  place: "Northumberland, England",
  imageSrc: "/report/ancestor-portrait.png",
  description:
    "Built from your strongest matches — fair skin with a vascular flush, cool grey-blue eyes, lightly waved brown hair, an oval face with a softly squared jaw — this is roughly what a great-great-grandparent eight generations back may have looked like. Late 18th-century, rural northern Britain, when your Northwestern European cluster was densest along the North Sea coast.",
};

export const CULTURAL_INSIGHTS: CulturalInsight[] = [
  {
    key: "celtic-highlands",
    name: "Celtic Highlands",
    imageSrc: "/report/cultural-celtic-highlands.png",
    description:
      "The mix of fair skin, wave-textured hair, and softly oval face shape echoes the people of the Scottish and Irish highlands. Imagine wind-cut cliffs, cattle paths threading through heather, and a fiddle being tuned by a peat fire.",
    regionKeys: ["northwestern-european"],
  },
  {
    key: "nordic-coast",
    name: "Nordic Coastline",
    imageSrc: "/report/cultural-nordic-coast.png",
    description:
      "Your Baltic eye color and Scandinavian percentages tie you to the long Nordic coast — a culture built around fishing villages, midnight sun, smoke saunas, and the sea-faring sagas that sent your ancestors as far as the Black Sea.",
    regionKeys: ["northwestern-european"],
  },
  {
    key: "silk-road-echo",
    name: "Echoes of the Silk Road",
    imageSrc: "/report/cultural-silk-road.png",
    description:
      "Faint but unmistakable, the Central Asian thread points to the old Silk Road — caravanserais along the Pamirs, traders moving between Bukhara and Samarkand, and centuries of exchange that left genetic ripples deep into Europe.",
    regionKeys: ["central-asian"],
  },
];
