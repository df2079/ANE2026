export const CATEGORY_IDS = {
  romanianPerfume: "best-romanian-perfume",
  launchedBrand: "best-brand-launched",
  launchedPerfume: "best-perfume-launched",
  overallPerfume: "best-perfume-overall"
} as const;

export const GLOBALLY_EXCLUDED_BRANDS = ["CALAJ", "Maison Evandie"];

export const DEFAULT_SETTINGS = {
  voting_start_at: null as string | null,
  voting_end_at: null as string | null,
  voting_opened_at: null as string | null,
  voting_closed_at: null as string | null,
  results_revealed_at: null as string | null
};

export const VOTER_COOKIE = "ane_voter";
export const DEVICE_COOKIE = "ane_device";
