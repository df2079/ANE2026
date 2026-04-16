import { cookies } from "next/headers";
import crypto from "node:crypto";
import { DEVICE_COOKIE, VOTER_COOKIE } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAppSettings, getVotingLifecycle } from "@/lib/settings";

function unwrapSingle<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

type RankedResultRow = {
  nomineeKey: string;
  nomineeBrandId: string | null;
  nomineePerfumeId: string | null;
  label: string;
  votes: number;
};

type DisplayResultRow = RankedResultRow & {
  rank: number;
  displayVotes: number;
  resolvedByAdmin: boolean;
};

type RankedTieGroup = {
  startRank: number;
  voteCount: number;
  nominees: RankedResultRow[];
};

type RankedResultCategory = {
  id: string;
  name: string;
  rows: RankedResultRow[];
  reviewRows: DisplayResultRow[];
  finalists: DisplayResultRow[];
  unresolvedTieResolutions: RankedTieGroup[];
};

export type ResultsCategory = RankedResultCategory;
export type ResultsTieGroup = RankedTieGroup;
export type ResultsRow = RankedResultRow;

function getNomineeKey(row: { nominee_brand_id: string | null; nominee_perfume_id: string | null }) {
  return row.nominee_perfume_id ? `perfume:${row.nominee_perfume_id}` : `brand:${row.nominee_brand_id ?? "unknown"}`;
}

export async function getRankedResultCategories() {
  const supabase = createSupabaseAdminClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");

  if (categoriesError) {
    throw categoriesError;
  }

  const { data: votesData, error: votesError } = await supabase
    .from("votes")
    .select(
      "category_id, nominee_brand_id, nominee_perfume_id, brands:nominee_brand_id(display_name), perfumes:nominee_perfume_id(display_name, brands:brand_id(display_name))"
    );

  if (votesError) {
    throw votesError;
  }

  const { data: tieBreaksData, error: tieBreaksError } = await supabase
    .from("category_tie_breaks")
    .select("category_id, nominee_key, priority");

  if (tieBreaksError) {
    throw tieBreaksError;
  }

  const votes = (votesData ?? []) as unknown as Array<{
    category_id: string;
    nominee_brand_id: string | null;
    nominee_perfume_id: string | null;
    brands: { display_name: string } | { display_name: string }[] | null;
    perfumes:
      | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })
      | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })[]
      | null;
  }>;

  const tieBreakRowsByCategory = new Map<string, Array<{ nomineeKey: string; priority: number }>>();
  for (const row of tieBreaksData ?? []) {
    const categoryRows = tieBreakRowsByCategory.get(row.category_id) ?? [];
    categoryRows.push({
      nomineeKey: row.nominee_key,
      priority: row.priority
    });
    tieBreakRowsByCategory.set(row.category_id, categoryRows);
  }

  return categories.map((category) => {
    const counts = new Map<string, RankedResultRow>();

    votes
      .filter((vote) => vote.category_id === category.id)
      .forEach((vote) => {
        const perfume = unwrapSingle(vote.perfumes);
        const brand = unwrapSingle(vote.brands);
        const nestedBrand = perfume ? unwrapSingle(perfume.brands) : null;
        const key = getNomineeKey(vote);
        const label =
          perfume && nestedBrand
            ? `${nestedBrand.display_name} - ${perfume.display_name}`
            : brand?.display_name ?? "Unknown nominee";

        const current = counts.get(key);
        counts.set(key, {
          nomineeKey: key,
          nomineeBrandId: vote.nominee_brand_id,
          nomineePerfumeId: vote.nominee_perfume_id,
          label,
          votes: (current?.votes ?? 0) + 1
        });
      });

    const groupedByVotes = new Map<number, RankedResultRow[]>();
    for (const row of counts.values()) {
      const group = groupedByVotes.get(row.votes) ?? [];
      group.push(row);
      groupedByVotes.set(row.votes, group);
    }

    const sortedVoteCounts = Array.from(groupedByVotes.keys()).sort((a, b) => b - a);
    const selectedTieBreakByRank = (() => {
      const categoryTieBreakRows = tieBreakRowsByCategory.get(category.id) ?? [];
      const map = new Map<number, string>();

      for (const row of categoryTieBreakRows) {
        if (row.priority < 1 || row.priority > 3) {
          continue;
        }

        if (!map.has(row.priority)) {
          map.set(row.priority, row.nomineeKey);
        }
      }

      return map;
    })();
    let currentIndex = 0;
    const resolvedNomineeKeyByRank = new Map<number, string>();
    const unresolvedTieResolutions: RankedTieGroup[] = [];
    for (const voteCount of sortedVoteCounts) {
      const group = (groupedByVotes.get(voteCount) ?? []).sort((a, b) => a.label.localeCompare(b.label));
      const startRank = currentIndex + 1;

      if (group.length > 1 && currentIndex < 3) {
        const selectedNomineeKey = selectedTieBreakByRank.get(startRank) ?? null;
        const selectedNominee =
          selectedNomineeKey !== null
            ? group.find((row) => row.nomineeKey === selectedNomineeKey) ?? null
            : null;

        if (selectedNominee) {
          resolvedNomineeKeyByRank.set(startRank, selectedNominee.nomineeKey);
        } else {
          unresolvedTieResolutions.push({
            startRank,
            voteCount,
            nominees: group
          });
        }
      }

      currentIndex += group.length;
    }

    const rows: RankedResultRow[] = [];
    currentIndex = 0;
    for (const voteCount of sortedVoteCounts) {
      const group = (groupedByVotes.get(voteCount) ?? []).sort((a, b) => a.label.localeCompare(b.label));
      const startRank = currentIndex + 1;
      const resolvedNomineeKey = resolvedNomineeKeyByRank.get(startRank) ?? null;

      if (
        resolvedNomineeKey &&
        group.length > 1 &&
        currentIndex < 3
      ) {
        const selectedNominee = group.find((row) => row.nomineeKey === resolvedNomineeKey) ?? null;
        if (selectedNominee) {
          rows.push(selectedNominee, ...group.filter((row) => row.nomineeKey !== resolvedNomineeKey));
          currentIndex += group.length;
          continue;
        }
      }

      rows.push(...group);
      currentIndex += group.length;
    }

    const reviewRows = rows.map((row, index) => {
      const rank = index + 1;
      const resolvedByAdmin = resolvedNomineeKeyByRank.get(rank) === row.nomineeKey;

      return {
        ...row,
        rank,
        displayVotes: resolvedByAdmin ? row.votes + 1 : row.votes,
        resolvedByAdmin
      } satisfies DisplayResultRow;
    });

    return {
      id: category.id,
      name: category.name,
      rows,
      reviewRows,
      finalists: reviewRows.slice(0, 3),
      unresolvedTieResolutions
    } satisfies RankedResultCategory;
  });
}

export async function getDashboardData() {
  const supabase = createSupabaseAdminClient();

  const [
    { count: brandCount },
    { count: perfumeCount },
    { count: voteCount },
    { data: voteRows }
  ] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("perfumes").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("votes").select("*", { count: "exact", head: true }),
    supabase.from("votes").select("voter_id")
  ]);

  const voterCount = new Set((voteRows ?? []).map((vote) => vote.voter_id)).size;

  return {
    brandCount: brandCount ?? 0,
    perfumeCount: perfumeCount ?? 0,
    voterCount,
    voteCount: voteCount ?? 0,
  };
}

export async function getImportsWithWarnings() {
  const supabase = createSupabaseAdminClient();
  const { data: imports, error: importsError } = await supabase
    .from("import_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(12);

  if (importsError) {
    throw importsError;
  }

  const safeImports = imports ?? [];
  const importIds = safeImports.map((item) => item.id);
  const { data: warnings, error: warningsError } = await supabase
    .from("import_warnings")
    .select("*")
    .in("import_log_id", importIds.length ? importIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  if (warningsError) {
    throw warningsError;
  }

  const safeWarnings = warnings ?? [];
  const warningsByImportId = safeWarnings.reduce<Record<string, { info: number; warning: number; error: number }>>(
    (accumulator, warning) => {
      const current = accumulator[warning.import_log_id] ?? { info: 0, warning: 0, error: 0 };
      current[warning.severity] += 1;
      accumulator[warning.import_log_id] = current;
      return accumulator;
    },
    {}
  );

  return {
    imports: safeImports,
    warnings: safeWarnings,
    warningsByImportId
  };
}

export async function getResultsData() {
  const settings = await getAppSettings();
  const lifecycle = getVotingLifecycle(settings);
  const rankedCategories = lifecycle.phase === "closed" || lifecycle.published ? await getRankedResultCategories() : [];
  const hasUnresolvedPodiumTies = rankedCategories.some((category) => category.unresolvedTieResolutions.length > 0);

  if (!lifecycle.published) {
    return {
      canView: lifecycle.phase === "closed",
      phase: lifecycle.phase,
      adminState: lifecycle.adminState,
      isLive: lifecycle.isLive,
      canStart: lifecycle.canStart,
      canEnd: lifecycle.canEnd,
      canPublish: lifecycle.canPublish && !hasUnresolvedPodiumTies,
      canUnpublish: lifecycle.canUnpublish,
      hasUnresolvedPodiumTies,
      published: lifecycle.published,
      categories: rankedCategories,
      revealedAt: settings.results_revealed_at
    };
  }

  return {
    canView: true,
    phase: lifecycle.phase,
    adminState: lifecycle.adminState,
    isLive: lifecycle.isLive,
    canStart: lifecycle.canStart,
    canEnd: lifecycle.canEnd,
    canPublish: lifecycle.canPublish && !hasUnresolvedPodiumTies,
    canUnpublish: lifecycle.canUnpublish,
    hasUnresolvedPodiumTies,
    published: lifecycle.published,
    categories: rankedCategories,
    revealedAt: settings.results_revealed_at
  };
}

export async function getVotingHomeData() {
  const supabase = createSupabaseAdminClient();
  const settings = await getAppSettings();
  const voter = await getCurrentVoter();
  const lifecycle = getVotingLifecycle(settings);

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (categoryError) {
    throw categoryError;
  }

  const nomineeCountEntries = await Promise.all(
    (categories ?? []).map(async (category) => {
      const { count, error } = await supabase
        .from("category_nominees")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id);

      if (error) {
        throw error;
      }

      return [category.id, count ?? 0] as const;
    })
  );

  const nomineeCounts = new Map<string, number>(nomineeCountEntries);

  const votedCategoryIds = new Set<string>();
  const votedLabelsByCategoryId = new Map<string, string>();
  if (voter) {
    const { data: votes } = await supabase
      .from("votes")
      .select(
        "category_id, brands:nominee_brand_id(display_name), perfumes:nominee_perfume_id(display_name, brands:brand_id(display_name))"
      )
      .eq("voter_id", voter.id);

    (votes as
      | Array<{
          category_id: string;
          brands: { display_name: string } | { display_name: string }[] | null;
          perfumes:
            | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })
            | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })[]
            | null;
        }>
      | null
      | undefined)?.forEach((vote) => {
      votedCategoryIds.add(vote.category_id);
      const perfume = unwrapSingle(vote.perfumes);
      const brand = unwrapSingle(vote.brands);
      const nestedBrand = perfume ? unwrapSingle(perfume.brands) : null;
      const label =
        perfume && nestedBrand
          ? `${nestedBrand.display_name} - ${perfume.display_name}`
          : brand?.display_name ?? "Selected nominee";
      votedLabelsByCategoryId.set(vote.category_id, label);
    });
  }

  return {
    settings,
    voter,
    votingState: lifecycle.phase,
    published: lifecycle.published,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      nomineeCount: nomineeCounts.get(category.id) ?? 0,
      hasVoted: votedCategoryIds.has(category.id),
      votedLabel: votedLabelsByCategoryId.get(category.id) ?? null
    }))
  };
}

export async function getNewsletterConsentExportRows() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("voters")
    .select("email, created_at")
    .eq("newsletter_opt_in", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getVoterExportRows() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("voters")
    .select("email, newsletter_opt_in")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPublicResultsData() {
  const settings = await getAppSettings();
  if (!settings.results_revealed_at) {
    return {
      published: false,
      categories: []
    };
  }

  return {
    published: true,
    categories: (await getRankedResultCategories()).map((category) => {
      return {
        id: category.id,
        name: category.name,
        finalists: category.finalists
      };
    })
  };
}

export async function getCurrentVoter() {
  const cookieStore = await cookies();
  const encoded = cookieStore.get(VOTER_COOKIE)?.value;
  if (!encoded) {
    return null;
  }

  const voterId = Buffer.from(encoded, "base64url").toString("utf8");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("voters").select("*").eq("id", voterId).maybeSingle();
  return data;
}

export async function setCurrentVoterCookie(voterId: string) {
  const cookieStore = await cookies();
  cookieStore.set(VOTER_COOKIE, Buffer.from(voterId).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export function createDeviceToken() {
  return crypto.randomUUID();
}

export async function clearCurrentVoterCookie() {
  const cookieStore = await cookies();
  cookieStore.set(VOTER_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function getDeviceCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_COOKIE)?.value ?? null;
}

export async function setDeviceCookie(deviceToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE, deviceToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}
