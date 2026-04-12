import { CATEGORY_IDS } from "@/lib/constants";

export const CATEGORY_DEFINITIONS = [
  {
    id: CATEGORY_IDS.romanianPerfume,
    name: "Best Romanian Perfume from Art Niche Expo 2026",
    nomineeType: "perfume",
    sortOrder: 1
  },
  {
    id: CATEGORY_IDS.launchedBrand,
    name: "Best brand launched at Art Niche Expo 2026",
    nomineeType: "brand",
    sortOrder: 2
  },
  {
    id: CATEGORY_IDS.launchedPerfume,
    name: "Best perfume launched at Art Niche Expo 2026",
    nomineeType: "perfume",
    sortOrder: 3
  },
  {
    id: CATEGORY_IDS.overallPerfume,
    name: "Best perfume from Art Niche Expo 2026",
    nomineeType: "perfume",
    sortOrder: 4
  }
] as const;
