export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ImportWarningCode =
  | "MISSING_HEADERS"
  | "EMPTY_SHEET"
  | "EMPTY_ROW_GAP"
  | "DUPLICATE_PERFUME"
  | "NEAR_DUPLICATE_PERFUME"
  | "MISSING_FROM_ALL_PERFUMES"
  | "MALFORMED_ROW"
  | "DUPLICATE_BRAND";

export type ImportWarningSeverity = "info" | "warning" | "error";

export type ParsedPerfume = {
  displayName: string;
  normalizedName: string;
  launched2026: boolean;
};

export type ParsedBrandSheet = {
  brandName: string;
  normalizedBrandName: string;
  isRomanianBrand: boolean;
  launchedAtExpo2026: boolean;
  perfumes: ParsedPerfume[];
  warnings: {
    code: ImportWarningCode;
    severity: ImportWarningSeverity;
    message: string;
    rowNumber?: number;
  }[];
};

export type SyncSummary = {
  brandsFound: number;
  perfumesFound: number;
  newBrands: number;
  newPerfumes: number;
  updatedPerfumes: number;
  warnings: number;
  warningCounts: Record<ImportWarningSeverity, number>;
};
