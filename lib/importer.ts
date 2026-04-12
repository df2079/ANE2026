import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { CATEGORY_IDS, GLOBALLY_EXCLUDED_BRANDS } from "@/lib/constants";
import { CATEGORY_DEFINITIONS } from "@/lib/categories";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, ImportWarningSeverity, ParsedBrandSheet, SyncSummary } from "@/lib/types";
import { normalizeForCompactCompare, normalizeForCompare, normalizeWhitespace, slugify } from "@/lib/utils";

type ParsedWorkbook = {
  workbookSha1: string;
  parsedSheets: ParsedBrandSheet[];
  warnings: Array<
    ParsedBrandSheet["warnings"][number] & {
      brandName: string;
      sheetName: string;
    }
  >;
};

async function updateImportLogState(
  importLogId: string,
  values: {
    status: "uploaded" | "synced" | "failed";
    workbook_sha1?: string;
    summary?: Json;
  }
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("import_logs")
    .update(values)
    .eq("id", importLogId);

  if (error) {
    throw error;
  }
}

function getCellString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return normalizeWhitespace(String(value));
}

function createWarning(
  severity: ImportWarningSeverity,
  warning: Omit<ParsedBrandSheet["warnings"][number], "severity">
): ParsedBrandSheet["warnings"][number] {
  return {
    ...warning,
    severity
  };
}

function isExpectedHeader(value: string, expected: "all_perfumes" | "launched_2026") {
  const normalized = normalizeForCompare(value);
  if (expected === "all_perfumes") {
    return normalized === "all perfumes";
  }

  return normalized === "launched 2026";
}

function isExpectedMetadataHeader(value: string, expected: "ro_brand" | "launched_brand") {
  const normalized = normalizeForCompare(value);
  if (expected === "ro_brand") {
    return normalized === "ro brand";
  }

  return normalized === "launched at expo 2026";
}

function parseYesValue(value: string) {
  return normalizeForCompare(value) === "yes";
}

function findHeaderRow(worksheet: ExcelJS.Worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(5, Math.max(worksheet.actualRowCount, worksheet.rowCount)); rowNumber += 1) {
    const headerA = getCellString(worksheet.getCell(`A${rowNumber}`).value);
    const headerB = getCellString(worksheet.getCell(`B${rowNumber}`).value);

    if (isExpectedHeader(headerA, "all_perfumes") && isExpectedHeader(headerB, "launched_2026")) {
      return {
        rowNumber,
        headerA,
        headerB,
        exact: headerA === "ALL Perfumes" && headerB === "launched 2026"
      };
    }
  }

  return null;
}

function parseBrandSheet(worksheet: ExcelJS.Worksheet): ParsedBrandSheet {
  const brandName = normalizeWhitespace(worksheet.name);
  const warnings: ParsedBrandSheet["warnings"] = [];
  const headerMatch = findHeaderRow(worksheet);
  const headerA = getCellString(worksheet.getCell("A1").value);
  const headerB = getCellString(worksheet.getCell("B1").value);
  const headerC = getCellString(worksheet.getCell("C1").value);
  const headerD = getCellString(worksheet.getCell("D1").value);
  const isRomanianBrand = isExpectedMetadataHeader(headerC, "ro_brand")
    ? parseYesValue(getCellString(worksheet.getCell("C2").value))
    : false;
  const launchedAtExpo2026 = isExpectedMetadataHeader(headerD, "launched_brand")
    ? parseYesValue(getCellString(worksheet.getCell("D2").value))
    : false;

  if (!headerMatch) {
    warnings.push(
      createWarning("error", {
        code: "MISSING_HEADERS",
        message: `Expected column A/B headers similar to "ALL Perfumes" and "launched 2026", received "${headerA}" and "${headerB}".`
      })
    );
  } else if (!headerMatch.exact || headerMatch.rowNumber !== 1) {
    warnings.push(
      createWarning("info", {
        code: "MISSING_HEADERS",
        message: `Headers were detected on row ${headerMatch.rowNumber} using tolerant matching.`
      })
    );
  }

  if (headerC && !isExpectedMetadataHeader(headerC, "ro_brand")) {
    warnings.push(
      createWarning("info", {
        code: "MISSING_HEADERS",
        message: `Cell C1 did not match "RO Brand". Romanian-brand metadata was ignored for this sheet.`
      })
    );
  }

  if (headerD && !isExpectedMetadataHeader(headerD, "launched_brand")) {
    warnings.push(
      createWarning("info", {
        code: "MISSING_HEADERS",
        message: `Cell D1 did not match "Launched at Expo 2026". Brand-launch metadata was ignored for this sheet.`
      })
    );
  }

  const columnAEntries: Array<{ rowNumber: number; displayName: string }> = [];
  const columnBEntries: Array<{ rowNumber: number; displayName: string }> = [];
  let populatedRows = 0;
  const maxRow = Math.max(worksheet.actualRowCount, worksheet.rowCount);
  const startRow = (headerMatch?.rowNumber ?? 1) + 1;
  let seenContent = false;
  let pendingBlankGap = 0;

  for (let rowNumber = startRow; rowNumber <= maxRow; rowNumber += 1) {
    const allPerfume = getCellString(worksheet.getCell(`A${rowNumber}`).value);
    const launchedPerfume = getCellString(worksheet.getCell(`B${rowNumber}`).value);

    if (!allPerfume && !launchedPerfume) {
      if (seenContent) {
        pendingBlankGap += 1;
      }
      continue;
    }

    if (pendingBlankGap > 0) {
      pendingBlankGap = 0;
    }

    seenContent = true;
    populatedRows += 1;

    if (allPerfume) {
      columnAEntries.push({ rowNumber, displayName: allPerfume });
    }

    if (launchedPerfume) {
      columnBEntries.push({ rowNumber, displayName: launchedPerfume });
    }
  }

  const allPerfumes = new Map<string, ParsedBrandSheet["perfumes"][number]>();
  const compactNameMap = new Map<string, string>();

  for (const { rowNumber, displayName } of columnAEntries) {
    const normalizedName = normalizeForCompare(displayName);
    const compactName = normalizeForCompactCompare(displayName);

    if (!normalizedName) {
      warnings.push(
        createWarning("warning", {
          code: "MALFORMED_ROW",
          message: "Unable to parse perfume name in ALL Perfumes column.",
          rowNumber
        })
      );
      continue;
    }

    if (allPerfumes.has(normalizedName)) {
      warnings.push(
        createWarning("warning", {
          code: "DUPLICATE_PERFUME",
          message: `Duplicate perfume "${displayName}" detected in column A.`,
          rowNumber
        })
      );
      continue;
    }

    const nearDuplicate = compactNameMap.get(compactName);
    if (nearDuplicate && nearDuplicate !== normalizedName) {
      warnings.push(
        createWarning("warning", {
          code: "NEAR_DUPLICATE_PERFUME",
          message: `Perfume "${displayName}" looks very close to another entry in this brand. Check spacing or casing.`,
          rowNumber
        })
      );
    }

    compactNameMap.set(compactName, normalizedName);
    allPerfumes.set(normalizedName, {
      displayName,
      normalizedName: slugify(displayName),
      launched2026: false
    });
  }

  for (const { rowNumber, displayName } of columnBEntries) {
    const normalizedLaunched = normalizeForCompare(displayName);
    if (!normalizedLaunched) {
      warnings.push(
        createWarning("warning", {
          code: "MALFORMED_ROW",
          message: "Unable to parse perfume name in launched 2026 column.",
          rowNumber
        })
      );
      continue;
    }

    const existing = allPerfumes.get(normalizedLaunched);
    if (existing) {
      existing.launched2026 = true;
    } else {
      warnings.push(
        createWarning("error", {
          code: "MISSING_FROM_ALL_PERFUMES",
          message: `Perfume "${displayName}" appears in column B but not column A.`,
          rowNumber
        })
      );
    }
  }

  if (populatedRows === 0) {
    warnings.push(
      createWarning("error", {
        code: "EMPTY_SHEET",
        message: "Sheet does not contain any perfumes."
      })
    );
  }

  return {
    brandName,
    normalizedBrandName: slugify(brandName),
    isRomanianBrand,
    launchedAtExpo2026,
    perfumes: Array.from(allPerfumes.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
    ),
    warnings
  };
}

export async function parseWorkbook(buffer: Uint8Array): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  const workbookBuffer = Buffer.from(buffer) as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
  await workbook.xlsx.load(workbookBuffer);

  const rawSheets = workbook.worksheets.map((worksheet: ExcelJS.Worksheet) => parseBrandSheet(worksheet));
  const mergedSheets = new Map<string, ParsedBrandSheet>();

  for (const sheet of rawSheets) {
    const existing = mergedSheets.get(sheet.normalizedBrandName);
    if (!existing) {
      mergedSheets.set(sheet.normalizedBrandName, sheet);
      continue;
    }

    existing.warnings.push(
      createWarning("error", {
        code: "DUPLICATE_BRAND",
        message: `Another sheet resolves to the same brand as "${existing.brandName}". Rows from both sheets were merged.`
      })
    );

    for (const perfume of sheet.perfumes) {
      const existingPerfume = existing.perfumes.find(
        (candidate) => candidate.normalizedName === perfume.normalizedName
      );
      if (!existingPerfume) {
        existing.perfumes.push(perfume);
      } else if (perfume.launched2026) {
        existingPerfume.launched2026 = true;
      }
    }

    existing.isRomanianBrand = existing.isRomanianBrand || sheet.isRomanianBrand;
    existing.launchedAtExpo2026 = existing.launchedAtExpo2026 || sheet.launchedAtExpo2026;

    existing.warnings.push(...sheet.warnings);
  }

  const parsedSheets = Array.from(mergedSheets.values()).map((sheet) => ({
    ...sheet,
    perfumes: [...sheet.perfumes].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
    )
  }));

  const warnings = parsedSheets.flatMap((sheet) =>
    sheet.warnings.map((warning: ParsedBrandSheet["warnings"][number]) => ({
      ...warning,
      brandName: sheet.brandName,
      sheetName: sheet.brandName
    }))
  );

  return {
    workbookSha1: crypto.createHash("sha1").update(buffer).digest("hex"),
    parsedSheets,
    warnings
  };
}

async function rebuildCategoryNominees() {
  const supabase = createSupabaseAdminClient();

  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("id, display_name, normalized_name, exclude_from_awards, eligible_category_2, is_active, is_romanian_brand");

  if (brandsError) {
    throw brandsError;
  }

  const { data: perfumes, error: perfumesError } = await supabase
    .from("perfumes")
    .select("id, brand_id, display_name, normalized_name, launched_2026, is_active");

  if (perfumesError) {
    throw perfumesError;
  }

  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const globallyExcluded = new Set(GLOBALLY_EXCLUDED_BRANDS.map((name) => slugify(name)));
  const nominees: {
    category_id: string;
    brand_id: string | null;
    perfume_id: string | null;
    sort_label: string;
  }[] = [];

  for (const brand of brands) {
    if (!brand.is_active) {
      continue;
    }

    const excluded =
      brand.exclude_from_awards || globallyExcluded.has(slugify(brand.display_name));

    if (!excluded && brand.eligible_category_2) {
      nominees.push({
        category_id: CATEGORY_IDS.launchedBrand,
        brand_id: brand.id,
        perfume_id: null,
        sort_label: brand.display_name
      });
    }
  }

  for (const perfume of perfumes) {
    const brand = brandById.get(perfume.brand_id);
    if (!brand || !brand.is_active || !perfume.is_active) {
      continue;
    }

    const brandExcluded =
      brand.exclude_from_awards || globallyExcluded.has(slugify(brand.display_name));
    if (brand.is_romanian_brand && !brandExcluded) {
      nominees.push({
        category_id: CATEGORY_IDS.romanianPerfume,
        brand_id: brand.id,
        perfume_id: perfume.id,
        sort_label: `${brand.display_name} ${perfume.display_name}`
      });
    }

    if (perfume.launched_2026 && !brandExcluded) {
      nominees.push({
        category_id: CATEGORY_IDS.launchedPerfume,
        brand_id: brand.id,
        perfume_id: perfume.id,
        sort_label: `${brand.display_name} ${perfume.display_name}`
      });
    }

    if (!brandExcluded) {
      nominees.push({
        category_id: CATEGORY_IDS.overallPerfume,
        brand_id: brand.id,
        perfume_id: perfume.id,
        sort_label: `${brand.display_name} ${perfume.display_name}`
      });
    }
  }

  const dedupedNominees = Array.from(
    new Map(
      nominees.map((nominee) => [
        `${nominee.category_id}:${nominee.brand_id ?? "none"}:${nominee.perfume_id ?? "none"}`,
        nominee
      ])
    ).values()
  );

  const { error: replaceError } = await supabase.rpc("replace_category_nominees", {
    payload: dedupedNominees as unknown as Json
  });
  if (replaceError) {
    throw replaceError;
  }
}

export async function ensureCategoriesSeeded() {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("categories").upsert(
    CATEGORY_DEFINITIONS.map((category) => ({
      id: category.id,
      name: category.name,
      nominee_type: category.nomineeType,
      sort_order: category.sortOrder,
      is_active: true
    }))
  );

  if (error) {
    throw error;
  }
}

export async function syncWorkbookImport(importLogId: string, buffer: Uint8Array) {
  const supabase = createSupabaseAdminClient();
  const workbookSha1 = crypto.createHash("sha1").update(buffer).digest("hex");

  try {
    const parsed = await parseWorkbook(buffer);
    await ensureCategoriesSeeded();

    const { data: existingBrands, error: existingBrandsError } = await supabase
      .from("brands")
      .select("id, normalized_name");

    if (existingBrandsError) {
      throw existingBrandsError;
    }

    const brandIdByNormalizedName = new Map(existingBrands.map((brand) => [brand.normalized_name, brand.id]));
    let newBrands = 0;
    let newPerfumes = 0;
    let updatedPerfumes = 0;

    for (const parsedSheet of parsed.parsedSheets) {
      const brandPayload = {
        display_name: parsedSheet.brandName,
        normalized_name: parsedSheet.normalizedBrandName,
        source_sheet_name: parsedSheet.brandName,
        is_active: true,
        is_romanian_brand: parsedSheet.isRomanianBrand,
        eligible_category_2: parsedSheet.launchedAtExpo2026,
        exclude_from_awards: GLOBALLY_EXCLUDED_BRANDS.map((name) => slugify(name)).includes(parsedSheet.normalizedBrandName)
      };

      const brandAlreadyExists = brandIdByNormalizedName.has(parsedSheet.normalizedBrandName);
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .upsert(brandPayload, { onConflict: "normalized_name" })
        .select("id")
        .single();

      if (brandError) {
        throw brandError;
      }

      if (!brandAlreadyExists) {
        newBrands += 1;
        brandIdByNormalizedName.set(parsedSheet.normalizedBrandName, brand.id);
      }

      const { data: existingPerfumes, error: existingPerfumesError } = await supabase
        .from("perfumes")
        .select("id, normalized_name")
        .eq("brand_id", brand.id);

      if (existingPerfumesError) {
        throw existingPerfumesError;
      }

      const existingPerfumeNames = new Set(existingPerfumes.map((perfume: { normalized_name: string }) => perfume.normalized_name));
      const importedPerfumeNames = new Set(parsedSheet.perfumes.map((perfume) => perfume.normalizedName));

      const perfumeRows = parsedSheet.perfumes.map((perfume) => ({
        brand_id: brand.id,
        display_name: perfume.displayName,
        normalized_name: perfume.normalizedName,
        launched_2026: perfume.launched2026,
        is_active: true
      }));

      const { error: perfumeError } = await supabase
        .from("perfumes")
        .upsert(perfumeRows, { onConflict: "brand_id,normalized_name" });

      if (perfumeError) {
        throw perfumeError;
      }

      newPerfumes += perfumeRows.filter((perfume: { normalized_name: string }) => !existingPerfumeNames.has(perfume.normalized_name)).length;
      updatedPerfumes += perfumeRows.filter((perfume: { normalized_name: string }) => existingPerfumeNames.has(perfume.normalized_name)).length;

      const missingPerfumeNames = Array.from(existingPerfumeNames).filter(
        (perfumeName) => !importedPerfumeNames.has(perfumeName)
      );

      if (missingPerfumeNames.length) {
        const { error: deactivateError } = await supabase
          .from("perfumes")
          .update({ is_active: false })
          .eq("brand_id", brand.id)
          .in("normalized_name", missingPerfumeNames);

        if (deactivateError) {
          throw deactivateError;
        }
      }
    }

    const importedBrandNames = new Set(parsed.parsedSheets.map((sheet: ParsedBrandSheet) => sheet.normalizedBrandName));
    const brandsToDeactivate = Array.from(brandIdByNormalizedName.entries())
      .filter(([normalizedName]) => !importedBrandNames.has(normalizedName))
      .map(([, brandId]) => brandId);

    if (brandsToDeactivate.length) {
      const { error: deactivateBrandError } = await supabase
        .from("brands")
        .update({ is_active: false })
        .in("id", brandsToDeactivate);

      if (deactivateBrandError) {
        throw deactivateBrandError;
      }

      const { error: deactivateBrandPerfumesError } = await supabase
        .from("perfumes")
        .update({ is_active: false })
        .in("brand_id", brandsToDeactivate);

      if (deactivateBrandPerfumesError) {
        throw deactivateBrandPerfumesError;
      }
    }

    const { error: warningDeleteError } = await supabase
      .from("import_warnings")
      .delete()
      .eq("import_log_id", importLogId);

    if (warningDeleteError) {
      throw warningDeleteError;
    }

    if (parsed.warnings.length) {
      const { error: warningsInsertError } = await supabase.from("import_warnings").insert(
        parsed.warnings.map((warning: ParsedWorkbook["warnings"][number]) => ({
          import_log_id: importLogId,
          sheet_name: warning.sheetName,
          brand_name: warning.brandName,
          severity: warning.severity,
          code: warning.code,
          message: warning.message,
          row_number: warning.rowNumber ?? null
        }))
      );

      if (warningsInsertError) {
        throw warningsInsertError;
      }
    }

    await rebuildCategoryNominees();

    const warningCounts = parsed.warnings.reduce<Record<ImportWarningSeverity, number>>(
      (accumulator, warning) => {
        accumulator[warning.severity] += 1;
        return accumulator;
      },
      { info: 0, warning: 0, error: 0 }
    );

    const summary: SyncSummary = {
      brandsFound: parsed.parsedSheets.length,
      perfumesFound: parsed.parsedSheets.reduce((count: number, sheet: ParsedBrandSheet) => count + sheet.perfumes.length, 0),
      newBrands,
      newPerfumes,
      updatedPerfumes,
      warnings: parsed.warnings.length,
      warningCounts
    };

    await updateImportLogState(importLogId, {
      status: "synced",
      workbook_sha1: parsed.workbookSha1,
      summary
    });

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await updateImportLogState(importLogId, {
      status: "failed",
      workbook_sha1: workbookSha1,
      summary: {
        errorMessage: message
      }
    });
    throw error;
  }
}
