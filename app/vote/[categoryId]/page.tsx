import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NomineeBrowser } from "@/components/nominee-browser";
import { PublicPageShell } from "@/components/public-page-shell";
import { getCurrentVoter } from "@/lib/data";
import { getAppSettings, getVotingLifecycle } from "@/lib/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitVoteAction } from "@/app/actions";

export const dynamic = "force-dynamic";

function unwrapSingle<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

type ExistingVoteRow = {
  id: string;
  brands: { display_name: string } | { display_name: string }[] | null;
  perfumes:
    | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })
    | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })[]
    | null;
};

export default async function CategoryVotePage({
  params,
  searchParams
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { categoryId } = await params;
  const { error } = await searchParams;
  const settings = await getAppSettings();
  const lifecycle = getVotingLifecycle(settings);

  if (lifecycle.phase === "closed") {
    redirect("/results");
  }

  const voter = await getCurrentVoter();

  if (!voter) {
    redirect("/");
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: category }, { data: existingVoteRaw, error: existingVoteError }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", categoryId).eq("is_active", true).maybeSingle(),
    supabase
      .from("votes")
      .select(
        "id, brands:nominee_brand_id(display_name), perfumes:nominee_perfume_id(display_name, brands:brand_id(display_name))"
      )
      .eq("voter_id", voter.id)
      .eq("category_id", categoryId)
      .maybeSingle()
  ]);

  if (existingVoteError) {
    throw existingVoteError;
  }

  const existingVote = existingVoteRaw as ExistingVoteRow | null;

  if (!category) {
    notFound();
  }

  const nomineesResult = !existingVote
    ? await supabase
        .from("category_nominees")
        .select(
          "brand_id, perfume_id, brands:brand_id(display_name), perfumes:perfume_id(display_name, brands:brand_id(display_name))"
        )
        .eq("category_id", categoryId)
        .order("sort_label")
    : { data: [], error: null };

  const nominees = nomineesResult.data ?? [];
  const nomineesError = nomineesResult.error;

  if (nomineesError) {
    throw nomineesError;
  }

  const nomineeRows = (nominees as unknown as Array<{
    brand_id: string | null;
    perfume_id: string | null;
    brands: { display_name: string } | { display_name: string }[] | null;
    perfumes:
      | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })
      | ({ display_name: string; brands: { display_name: string } | { display_name: string }[] | null })[]
      | null;
  }>).map((nominee) => {
    const brand = unwrapSingle(nominee.brands);
    const perfume = unwrapSingle(nominee.perfumes);
    const perfumeBrand = perfume ? unwrapSingle(perfume.brands) : null;

    return {
      id: nominee.perfume_id ?? nominee.brand_id ?? "",
      nomineeType: (nominee.perfume_id ? "perfume" : "brand") as "brand" | "perfume",
      label: nominee.perfume_id
        ? `${perfumeBrand?.display_name ?? "Unknown"} - ${perfume?.display_name ?? "Unknown"}`
        : brand?.display_name ?? "Unknown",
      brandName: perfumeBrand?.display_name ?? brand?.display_name ?? "Unknown",
      perfumeName: perfume?.display_name ?? null
    };
  });

  const existingVotePerfume = existingVote ? unwrapSingle(existingVote.perfumes) : null;
  const existingVoteBrand = existingVote ? unwrapSingle(existingVote.brands) : null;
  const existingVotePerfumeBrand = existingVotePerfume ? unwrapSingle(existingVotePerfume.brands) : null;
  const existingVoteLabel =
    existingVotePerfume && existingVotePerfumeBrand
      ? `${existingVotePerfumeBrand.display_name} - ${existingVotePerfume.display_name}`
      : existingVoteBrand?.display_name ?? null;

  return (
    <PublicPageShell>
      <div className="panel p-6">
        <Link href="/vote" prefetch className="eyebrow">
          Back to categories
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{category.name}</h1>
        {!existingVote ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Choose one nominee for this category.
          </p>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error === "already-voted"
              ? "You have already voted in this category."
              : error === "invalid-nominee"
                ? "That nominee is no longer available."
                : error === "not-started"
                  ? "Voting has not opened yet."
                : error === "rate-limited"
                  ? "Too many attempts from this connection. Please wait a moment."
                  : error === "no-selection"
                    ? "Please choose one nominee before submitting."
                    : error === "ended"
                      ? "Voting has already ended."
                      : "Unable to submit your vote right now."}
          </div>
        ) : null}

        {existingVote ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            <p className="font-medium">Vote recorded</p>
            {existingVoteLabel ? <p className="mt-2">You voted for: {existingVoteLabel}</p> : null}
          </div>
        ) : (
          <div className="mt-6">
            <NomineeBrowser categoryId={categoryId} items={nomineeRows} action={submitVoteAction} />
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
