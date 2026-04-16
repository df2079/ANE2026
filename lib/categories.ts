import { CATEGORY_IDS } from "@/lib/constants";

export const CATEGORY_DEFINITIONS = [
  {
    id: CATEGORY_IDS.romanianPerfume,
    name: "Best perfume by a Romanian brand",
    nomineeType: "perfume",
    sortOrder: 1
  },
  {
    id: CATEGORY_IDS.launchedBrand,
    name: "Best new brand at Art Niche Expo 2026",
    nomineeType: "brand",
    sortOrder: 2
  },
  {
    id: CATEGORY_IDS.launchedPerfume,
    name: "Best new perfume of 2026",
    nomineeType: "perfume",
    sortOrder: 3
  },
  {
    id: CATEGORY_IDS.overallPerfume,
    name: "Best perfume at Art Niche Expo 2026",
    nomineeType: "perfume",
    sortOrder: 4
  }
] as const;
